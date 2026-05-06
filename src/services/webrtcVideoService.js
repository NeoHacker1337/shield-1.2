/**
 * webrtcVideoService.js
 * ─────────────────────
 * Standalone WebRTC service for VIDEO calls.
 * Completely separate from webrtcService.js (audio).
 *
 * FIXES APPLIED:
 * ✅ Issue 1: Dynamic TURN credentials — fetched from backend before every call
 * ✅ Issue 2: ICE sending unchanged (already instant via chatService.sendVideoIceCandidate)
 * ✅ Issue 3: addIceCandidate + flushPendingIceCandidates guard malformed candidates
 * ✅ Issue 4: Bitrate control moved to onconnectionstatechange = connected (not in init)
 * ✅ BUGFIX:  constructor() and all class methods now have correct closing braces
 * ✅ BUGFIX:  init() is a proper class method — not accidentally nested in constructor
 */

import {
    RTCPeerConnection,
    mediaDevices,
    RTCIceCandidate,
    RTCSessionDescription,
} from 'react-native-webrtc';
import chatService from './chatService';

// ✅ Fallback used only if backend TURN fetch fails
const FALLBACK_ICE_SERVERS = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
];

class WebRTCVideoService {

    constructor() {
        this.pc = null;
        this.localStream = null;
        this.remoteStream = null;
        this.pendingIceCandidates = [];
        this.currentRoomId = null;
        this.onRemoteStream = null;
        this.onLocalStream = null;
        this.onConnectionState = null;
        this.remoteDescSet = false;
        this.answerInProgress = false;
        this.isFrontCamera = true;
    } // ✅ constructor properly closed

    // ─────────────────────────────────────────────
    // INIT
    // ─────────────────────────────────────────────

    async init(roomId) {
        if (this.pc) {
            console.log('[VideoService] Closing existing PC before reinit');
            this.cleanupPC();
        }

        this.currentRoomId = roomId;
        this.pendingIceCandidates = [];
        this.remoteDescSet = false;
        this.answerInProgress = false;
        this.isFrontCamera = true;

        // ✅ Fetch fresh TURN credentials from backend before every call
        let iceServers = FALLBACK_ICE_SERVERS;
        try {
            const res = await chatService.getVideoTurnCredentials();
            if (res?.data?.iceServers && Array.isArray(res.data.iceServers)) {
                iceServers = res.data.iceServers;
                console.log('[VideoService] Fresh TURN credentials loaded ✅ count:', iceServers.length);
            } else {
                console.warn('[VideoService] TURN response invalid, using fallback STUN');
            }
        } catch (e) {
            console.warn('[VideoService] Failed to fetch TURN credentials, using fallback:', e?.message);
        }

        const configuration = {
            iceServers,
            iceCandidatePoolSize: 10,
            bundlePolicy: 'max-bundle',
            rtcpMuxPolicy: 'require',
        };

        this.pc = new RTCPeerConnection({ ...configuration, iceTransportPolicy: 'all' });
        console.log('[VideoService] PC created | signalingState:', this.pc.signalingState);

        // TURN reachability test — uses fresh config
        this.testTurnReachability(configuration);

        // ICE candidate generated — send to backend instantly
        this.pc.onicecandidate = (event) => {
            if (event.candidate && this.currentRoomId) {
                const raw = event.candidate.candidate ?? '';
                const type = raw.match(/typ\s+(\w+)/)?.[1] ?? 'unknown';
                console.log(`[Video ICE generated] type: ${type}`);

                const candidate = typeof event.candidate.toJSON === 'function'
                    ? event.candidate.toJSON()
                    : event.candidate;

                // Small delay to avoid rate limiting (429)
                setTimeout(() => {
                    chatService.sendVideoIceCandidate({
                        room_id: this.currentRoomId,
                        candidate,
                    }).catch(e => console.warn('[VideoService] send ICE error:', e?.message));
                }, 100);

            } else if (!event.candidate) {
                console.log('[VideoService] ICE gathering complete ✅');
            }
        };

        // Remote stream received
        this.pc.ontrack = (event) => {
            this.remoteStream = event.streams[0];
            console.log('[VideoService] Remote stream received ✅ | tracks:', this.remoteStream?.getTracks()?.length);
            if (typeof this.onRemoteStream === 'function') {
                this.onRemoteStream(this.remoteStream);
            }
        };

        this.pc.onsignalingstatechange = () =>
            console.log('[VideoService] signalingState →', this.pc?.signalingState);

        // ✅ Bitrate control applied AFTER connection established
        this.pc.onconnectionstatechange = () => {
            const state = this.pc?.connectionState;
            console.log('[VideoService] connectionState →', state);

            if (state === 'connected' || state === 'completed') {
                // Apply bitrate cap only after full negotiation
                this.pc.getSenders().forEach(sender => {
                    if (sender.track?.kind === 'video') {
                        const params = sender.getParameters();
                        if (!params.encodings || params.encodings.length === 0) {
                            params.encodings = [{}];
                        }
                        params.encodings[0].maxBitrate = 1500000;
                        sender.setParameters(params).catch(e =>
                            console.warn('[VideoService] setParameters failed:', e?.message)
                        );
                    }
                });
                console.log('[VideoService] Bitrate cap applied ✅');
            }

            if (typeof this.onConnectionState === 'function') {
                this.onConnectionState(state);
            }
        };

        this.pc.oniceconnectionstatechange = () =>
            console.log('[VideoService] iceConnectionState →', this.pc?.iceConnectionState);

        this.pc.onicegatheringstatechange = () =>
            console.log('[VideoService] iceGatheringState →', this.pc?.iceGatheringState);

        // Camera + mic access
        try {
            this.localStream = await mediaDevices.getUserMedia({
                audio: true,
                video: {
                    facingMode: 'user',
                    width: { ideal: 1280 },
                    height: { ideal: 720 },
                },
            });
        } catch (e) {
            console.error('[VideoService] getUserMedia failed:', e);
            throw e;
        }

        this.localStream.getTracks().forEach(track => {
            this.pc.addTrack(track, this.localStream);
            console.log('[VideoService] Local track added:', track.kind);
        });

        if (typeof this.onLocalStream === 'function') {
            this.onLocalStream(this.localStream);
        }

        console.log('[VideoService] init() complete | roomId:', roomId);
    }

    // ─────────────────────────────────────────────
    // TURN REACHABILITY TEST
    // ─────────────────────────────────────────────

    testTurnReachability(configuration) {
        const testPC = new RTCPeerConnection(configuration);
        testPC.createDataChannel('turn-test');
        testPC.createOffer()
            .then(offer => testPC.setLocalDescription(offer))
            .catch(() => { });

        testPC.onicecandidate = (e) => {
            if (e.candidate) {
                const raw = e.candidate.candidate ?? '';
                const typeMatch = raw.match(/typ\s+(\w+)/);
                const type = typeMatch?.[1] ?? 'unknown';
                console.log('[VIDEO TURN TEST] type:', type);
                if (type === 'relay') {
                    console.log('[VIDEO TURN TEST] ✅ TURN working — relay candidate found');
                    setTimeout(() => testPC.close(), 2000);
                }
            } else {
                console.log('[VIDEO TURN TEST] ICE gathering complete');
                testPC.close();
            }
        };

        setTimeout(() => {
            try { testPC.close(); } catch (_) { }
        }, 8000);
    }

    // ─────────────────────────────────────────────
    // CALLER (Device A)
    // ─────────────────────────────────────────────

    async startCaller(roomId, callerId) {
        await this.init(roomId);

        if (!this.pc) throw new Error('[VideoService] startCaller: PC is null');
        if (this.pc.signalingState !== 'stable') {
            throw new Error(`[VideoService] startCaller: wrong signalingState ${this.pc.signalingState}`);
        }

        const offer = await this.pc.createOffer();
        await this.pc.setLocalDescription(offer);
        console.log('[VideoService] createOffer OK | signalingState:', this.pc.signalingState);

        const offerPayload = { type: offer.type, sdp: offer.sdp };

        await chatService.sendVideoCallOffer({
            room_id: roomId,
            caller_id: callerId,
            offer: offerPayload,
        });
        console.log('[VideoService] Video offer sent to server ✅');

        return offerPayload;
    }

    // ─────────────────────────────────────────────
    // RECEIVER (Device B)
    // ─────────────────────────────────────────────

    async createAnswer(offer) {
        if (!this.pc) throw new Error('[VideoService] createAnswer: PC is null');
        if (this.answerInProgress) {
            console.warn('[VideoService] createAnswer already in progress — skipping duplicate call');
            return null;
        }

        if (this.pc.signalingState !== 'stable') {
            throw new Error(`[VideoService] createAnswer: wrong signalingState ${this.pc.signalingState}`);
        }

        this.answerInProgress = true;
        try {
            console.log('[VideoService] createAnswer started | signalingState:', this.pc.signalingState);

            // Normalize offer shape
            let sdpData = offer;
            if (offer?.offer) sdpData = offer.offer;
            else if (offer?.sdp && typeof offer.sdp === 'object') sdpData = offer.sdp;

            console.log('[VideoService] sdpData.type:', sdpData?.type);
            console.log('[VideoService] sdpData.sdp length:', sdpData?.sdp?.length);

            if (!sdpData?.type || !sdpData?.sdp) {
                throw new Error(`Invalid offer — type:${sdpData?.type} sdp:${sdpData?.sdp ? 'ok' : 'missing'}`);
            }

            const cleanedSdp = this.cleanSdp(sdpData.sdp);
            console.log('[VideoService] SDP normalized length:', cleanedSdp.length);
            console.log('[VideoService] SDP first line:', cleanedSdp.split('\n')[0]);

            await this.trySetRemoteDescription(sdpData.type, cleanedSdp);
            this.remoteDescSet = true;
            console.log('[VideoService] setRemoteDescription OK | signalingState:', this.pc.signalingState);

            await this.flushPendingIceCandidates();

            const answer = await this.pc.createAnswer();
            await this.pc.setLocalDescription(answer);
            console.log('[VideoService] setLocalDescription OK | signalingState:', this.pc.signalingState);

            const answerPayload = { type: answer.type, sdp: answer.sdp };

            await chatService.sendVideoCallAnswer({
                room_id: this.currentRoomId,
                answer: answerPayload,
            });
            console.log('[VideoService] Answer sent to server ✅');

            return answerPayload;

        } catch (e) {
            console.error('[VideoService] createAnswer ERROR:', e?.message);
            throw e;
        } finally {
            this.answerInProgress = false;
        }
    }

    // ─────────────────────────────────────────────
    // SET REMOTE DESCRIPTION — triple fallback
    // ─────────────────────────────────────────────

    async trySetRemoteDescription(type, sdp) {
        // Attempt 1: plain object with LF
        try {
            await this.pc.setRemoteDescription({ type, sdp });
            console.log('[VideoService] setRemoteDescription attempt 1 (plain LF) ✅');
            return;
        } catch (e1) {
            console.warn('[VideoService] Attempt 1 failed:', e1?.message);
        }

        // Attempt 2: RTCSessionDescription wrapper
        try {
            await this.pc.setRemoteDescription(new RTCSessionDescription({ type, sdp }));
            console.log('[VideoService] setRemoteDescription attempt 2 (RTCSessionDescription) ✅');
            return;
        } catch (e2) {
            console.warn('[VideoService] Attempt 2 failed:', e2?.message);
        }

        // Attempt 3: plain object with CRLF
        const crlfSdp = sdp.replace(/\n/g, '\r\n');
        try {
            await this.pc.setRemoteDescription({ type, sdp: crlfSdp });
            console.log('[VideoService] setRemoteDescription attempt 3 (plain CRLF) ✅');
            return;
        } catch (e3) {
            throw new Error(`All setRemoteDescription attempts failed: ${e3?.message}`);
        }
    }

    // ─────────────────────────────────────────────
    // SET REMOTE ANSWER — Caller side
    // ─────────────────────────────────────────────

    async setRemoteAnswer(answer) {
        if (!this.pc) throw new Error('[VideoService] setRemoteAnswer: PC is null');
        if (this.pc.signalingState !== 'have-local-offer') {
            throw new Error(
                `[VideoService] setRemoteAnswer: wrong signalingState ${this.pc.signalingState} — expected have-local-offer`
            );
        }

        console.log('[VideoService] setRemoteAnswer | signalingState:', this.pc.signalingState);

        let sdpData = answer;
        if (answer?.answer) sdpData = answer.answer;
        else if (answer?.sdp && typeof answer.sdp === 'object') sdpData = answer.sdp;

        if (!sdpData?.type || !sdpData?.sdp) {
            throw new Error(`Invalid answer — type:${sdpData?.type} sdp:${sdpData?.sdp ? 'ok' : 'missing'}`);
        }

        const cleanedSdp = this.cleanSdp(sdpData.sdp);
        await this.trySetRemoteDescription(sdpData.type, cleanedSdp);
        this.remoteDescSet = true;
        console.log('[VideoService] setRemoteAnswer OK | signalingState:', this.pc.signalingState);

        await this.flushPendingIceCandidates();
    }

    // ─────────────────────────────────────────────
    // ICE — addIceCandidate
    // ─────────────────────────────────────────────

    addIceCandidate(candidate) {
        if (!this.pc || !candidate) return;

        // ✅ Reject malformed candidates before they corrupt ICE state
        if (!candidate.candidate || typeof candidate.candidate !== 'string') {
            console.warn('[VideoService] Rejected malformed ICE candidate (no candidate string):', candidate);
            return;
        }

        if (!this.remoteDescSet) {
            console.log('[VideoService] ICE queued — remote desc not set yet');
            this.pendingIceCandidates.push(candidate);
            return;
        }

        this.pc.addIceCandidate(new RTCIceCandidate(candidate))
            .then(() => console.log('[VideoService] ICE applied ✅ type:',
                candidate.candidate.match(/typ\s+(\w+)/)?.[1] ?? 'unknown'))
            .catch(e => console.warn('[VideoService] addIceCandidate error:', e?.message));
    }

    // ─────────────────────────────────────────────
    // ICE — flush queued candidates
    // ─────────────────────────────────────────────

    async flushPendingIceCandidates() {
        if (!this.pendingIceCandidates.length) return;
        console.log('[VideoService] Flushing', this.pendingIceCandidates.length, 'queued ICE candidates');

        for (const c of this.pendingIceCandidates) {
            // ✅ Skip malformed candidates in queue
            if (!c?.candidate || typeof c.candidate !== 'string') {
                console.warn('[VideoService] Skipping malformed queued ICE candidate:', c);
                continue;
            }
            try {
                await this.pc.addIceCandidate(new RTCIceCandidate(c));
                console.log('[VideoService] Queued ICE applied ✅');
            } catch (e) {
                console.warn('[VideoService] Queued ICE error:', e?.message);
            }
        }
        this.pendingIceCandidates = [];
    }

    // ─────────────────────────────────────────────
    // CAMERA CONTROLS
    // ─────────────────────────────────────────────

    async flipCamera() {
        if (!this.localStream) return;
        const videoTrack = this.localStream.getVideoTracks()[0];
        if (!videoTrack) return;
        try {
            await videoTrack._switchCamera(); // react-native-webrtc native method
            this.isFrontCamera = !this.isFrontCamera;
            console.log('[VideoService] Camera flipped | front:', this.isFrontCamera);
        } catch (e) {
            console.log('[VideoService] flipCamera error:', e?.message);
        }
    }

    setVideoEnabled(enabled) {
        this.localStream?.getVideoTracks().forEach(t => { t.enabled = enabled; });
        console.log('[VideoService] Video track enabled:', enabled);
    }

    setAudioEnabled(enabled) {
        this.localStream?.getAudioTracks().forEach(t => { t.enabled = enabled; });
        console.log('[VideoService] Audio track enabled:', enabled);
    }

    // ─────────────────────────────────────────────
    // SDP CLEANUP
    // ─────────────────────────────────────────────

    cleanSdp(sdp) {
        if (!sdp) return sdp;

        // Unescape literal \n from JSON double-encoding
        if (sdp.includes('\\n')) {
            sdp = sdp.replace(/\\n/g, '\n');
            console.log('[VideoService] Cleaned literal \\n');
        }

        if (sdp.includes('\\r')) {
            sdp = sdp.replace(/\\r/g, '\r');
            console.log('[VideoService] Cleaned literal \\r');
        }

        // Normalize all line endings to Android native requirement (LF only)
        sdp = sdp.replace(/\r\n/g, '\n');
        sdp = sdp.replace(/\r/g, '\n');

        // Ensure SDP ends with newline
        if (!sdp.endsWith('\n')) sdp += '\n';

        return sdp;
    }

    // ─────────────────────────────────────────────
    // CLEANUP
    // ─────────────────────────────────────────────

    cleanupPC() {
        this.pc?.close();
        this.pc = null;
        this.remoteStream = null;
        this.pendingIceCandidates = [];
        this.remoteDescSet = false;
        this.answerInProgress = false;
    }

    close() {
        console.log('[VideoService] Closing | signalingState:', this.pc?.signalingState,
            '| connectionState:', this.pc?.connectionState);

        this.localStream?.getTracks().forEach(t => {
            t.stop();
            console.log('[VideoService] Track stopped:', t.kind);
        });

        this.cleanupPC();

        this.localStream = null;
        this.currentRoomId = null;
        this.onRemoteStream = null;
        this.onLocalStream = null;
        this.onConnectionState = null;

        console.log('[VideoService] Closed ✅');
    }
}

// Singleton — separate instance from webrtcService.js (audio)
export default new WebRTCVideoService();