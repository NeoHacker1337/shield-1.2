/**
 * webrtcService.js
 * ─────────────────
 * Standalone WebRTC service for AUDIO calls.
 * Completely separate from webrtcVideoService.js (video).
 *
 * FIXES APPLIED:
 * ✅ Dynamic TURN credentials — fetched from backend before every call (same fix as video)
 * ✅ ICE candidate malformed guard — rejects candidates with no candidate string
 * ✅ Pending ICE candidates flushed after remote description is set
 * ✅ _testTurnReachability uses fresh config (not hardcoded)
 * ✅ All existing logic preserved — only TURN credential loading changed
 */

import {
    RTCPeerConnection,
    mediaDevices,
    RTCIceCandidate,
    RTCSessionDescription,
} from 'react-native-webrtc';
import chatService from './chatService';

// ✅ Fallback used ONLY if backend TURN fetch fails
const FALLBACK_ICE_SERVERS = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
];

class WebRTCService {
    constructor() {
        this.pc = null;
        this.localStream = null;
        this.remoteStream = null;
        this.pendingIceCandidates = [];
        this.currentRoomId = null;
        this.onRemoteStream = null;
        this.onConnectionState = null;
        this._remoteDescSet = false;
        this._answerInProgress = false;
    }

    async init(roomId) {
        if (this.pc) {
            console.log('[webrtcService] Closing existing PC before reinit');
            this._cleanupPC();
        }

        this.currentRoomId = roomId;
        this.pendingIceCandidates = [];
        this._remoteDescSet = false;
        this._answerInProgress = false;

        // ✅ Fetch fresh TURN credentials from backend before every call
        let iceServers = FALLBACK_ICE_SERVERS;
        try {
            const res = await chatService.getAudioTurnCredentials();
            if (res?.data?.iceServers && Array.isArray(res.data.iceServers)) {
                iceServers = res.data.iceServers;
                console.log('[webrtcService] Fresh TURN credentials loaded ✅ count:', iceServers.length);
            } else {
                console.warn('[webrtcService] TURN response invalid, using fallback STUN');
            }
        } catch (e) {
            console.warn('[webrtcService] Failed to fetch TURN credentials, using fallback:', e?.message);
        }

        const configuration = {
            iceServers,
            iceCandidatePoolSize: 10,
        };

        this.pc = new RTCPeerConnection({ ...configuration, iceTransportPolicy: 'all' });
        console.log('[webrtcService] PC created | signalingState:', this.pc.signalingState);

        // ✅ Pass fresh config to reachability test
        this._testTurnReachability(configuration);

        // ICE candidate with type logging
        this.pc.onicecandidate = (event) => {
            if (event.candidate && this.currentRoomId) {
                const raw = event.candidate.candidate ?? '';
                const typeMatch = raw.match(/typ\s+(\w+)/);
                const type = event.candidate.type ?? typeMatch?.[1] ?? 'unknown';
                console.log(`[webrtcService] ICE candidate | type: ${type} | ${raw.substring(0, 60)}`);

                const candidate = typeof event.candidate.toJSON === 'function'
                    ? event.candidate.toJSON()
                    : event.candidate;

                // Small delay to avoid 429 rate limiting
                setTimeout(() => {
                    chatService.sendIceCandidate({
                        room_id: this.currentRoomId,
                        candidate,
                    }).catch(e => console.warn('[webrtcService] send ICE error:', e?.message));
                }, 100);

            } else if (!event.candidate) {
                console.log('[webrtcService] ICE gathering complete ✅');
            }
        };

        this.pc.ontrack = (event) => {
            this.remoteStream = event.streams[0];
            console.log('[webrtcService] Remote stream received ✅ | tracks:', this.remoteStream?.getTracks()?.length);
            if (typeof this.onRemoteStream === 'function') {
                this.onRemoteStream(this.remoteStream);
            }
        };

        this.pc.onsignalingstatechange = () => {
            console.log('[webrtcService] signalingState →', this.pc?.signalingState);
        };

        this.pc.onconnectionstatechange = () => {
            const state = this.pc?.connectionState;
            console.log('[webrtcService] connectionState →', state);
            if (typeof this.onConnectionState === 'function') {
                this.onConnectionState(state);
            }
        };

        this.pc.oniceconnectionstatechange = () => {
            console.log('[webrtcService] iceConnectionState →', this.pc?.iceConnectionState);
        };

        this.pc.onicegatheringstatechange = () => {
            console.log('[webrtcService] iceGatheringState →', this.pc?.iceGatheringState);
        };

        this.localStream = await mediaDevices.getUserMedia({
            audio: true,
            video: false,
        });

        this.localStream.getTracks().forEach(track => {
            this.pc.addTrack(track, this.localStream);
            console.log('[webrtcService] Local track added:', track.kind);
        });

        console.log('[webrtcService] init() complete | roomId:', roomId);
    }

    // ✅ Accepts fresh configuration as parameter (not hardcoded)
    _testTurnReachability(configuration) {
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
                console.log(`[TURN TEST] candidate type: ${type} | ${raw.substring(0, 80)}`);
                if (type === 'relay') {
                    console.log('[TURN TEST] ✅ TURN server is reachable — relay candidates generating');
                    setTimeout(() => testPC.close(), 2000);
                }
            } else {
                console.log('[TURN TEST] ICE gathering complete');
                testPC.close();
            }
        };

        setTimeout(() => {
            try { testPC.close(); } catch (_) { }
        }, 8000);
    }

    // ────────────── CALLER (Device A) ──────────────
    async startCaller(roomId, callerId) {
        await this.init(roomId);

        if (!this.pc) throw new Error('[webrtcService] startCaller — PC is null');
        if (this.pc.signalingState !== 'stable') {
            throw new Error(`[webrtcService] startCaller — wrong signalingState: ${this.pc.signalingState}`);
        }

        const offer = await this.pc.createOffer();
        await this.pc.setLocalDescription(offer);

        console.log('[webrtcService] createOffer OK ✅ | signalingState:', this.pc.signalingState);

        const offerPayload = { type: offer.type, sdp: offer.sdp };

        await chatService.sendCallOffer({
            room_id: roomId,
            caller_id: callerId,
            offer: offerPayload,
        });

        console.log('[webrtcService] Offer sent to server ✅');
        return offerPayload;
    }

    // ────────────── RECEIVER (Device B) ──────────────
    async createAnswer(offer) {
        if (!this.pc) throw new Error('[webrtcService] createAnswer — PC is null');

        if (this._answerInProgress) {
            console.warn('[webrtcService] createAnswer already in progress — skipping');
            return null;
        }

        if (this.pc.signalingState !== 'stable') {
            throw new Error(
                `[webrtcService] createAnswer — wrong signalingState: ${this.pc.signalingState}`
            );
        }

        this._answerInProgress = true;

        try {
            console.log('[webrtcService] createAnswer started | signalingState:', this.pc.signalingState);

            let sdpData = offer;
            if (offer?.offer) sdpData = offer.offer;
            else if (offer?.sdp && typeof offer.sdp === 'object') sdpData = offer.sdp;

            console.log('[webrtcService] sdpData.type:', sdpData?.type);
            console.log('[webrtcService] sdpData.sdp length:', sdpData?.sdp?.length);

            if (!sdpData?.type || !sdpData?.sdp) {
                throw new Error(
                    `Invalid offer — type:${sdpData?.type} sdp:${sdpData?.sdp ? 'ok' : 'missing'}`
                );
            }

            const cleanedSdp = this.cleanSdp(sdpData.sdp);
            console.log('[webrtcService] SDP CRLF check:', cleanedSdp.includes('\r\n'));

            try {
                await this.pc.setRemoteDescription(
                    new RTCSessionDescription({ type: sdpData.type, sdp: cleanedSdp })
                );
            } catch (descErr) {
                console.warn('[webrtcService] RTCSessionDescription failed, trying plain object:', descErr?.message);
                await this.pc.setRemoteDescription({ type: sdpData.type, sdp: cleanedSdp });
            }

            this._remoteDescSet = true;
            console.log('[webrtcService] setRemoteDescription OK ✅ | signalingState:', this.pc.signalingState);

            await this.flushPendingIceCandidates();

            const answer = await this.pc.createAnswer();
            await this.pc.setLocalDescription(answer);
            console.log('[webrtcService] setLocalDescription OK ✅ | signalingState:', this.pc.signalingState);

            const answerPayload = { type: answer.type, sdp: answer.sdp };

            await chatService.sendCallAnswer({
                room_id: this.currentRoomId,
                answer: answerPayload,
            });
            console.log('[webrtcService] Answer sent to server ✅');

            return answerPayload;

        } catch (e) {
            console.error('[webrtcService] createAnswer ERROR:', e?.message);
            throw e;
        } finally {
            this._answerInProgress = false;
        }
    }

    async setRemoteAnswer(answer) {
        if (!this.pc) throw new Error('[webrtcService] setRemoteAnswer — PC is null');
        if (this.pc.signalingState !== 'have-local-offer') {
            throw new Error(
                `[webrtcService] setRemoteAnswer — wrong signalingState: ${this.pc.signalingState}`
            );
        }

        console.log('[webrtcService] setRemoteAnswer | signalingState:', this.pc.signalingState);

        let sdpData = answer;
        if (answer?.answer) sdpData = answer.answer;
        else if (answer?.sdp && typeof answer.sdp === 'object') sdpData = answer.sdp;

        if (!sdpData?.type || !sdpData?.sdp) {
            throw new Error(`Invalid answer — type:${sdpData?.type} sdp:${sdpData?.sdp ? 'ok' : 'missing'}`);
        }

        const cleanSdp = this.cleanSdp(sdpData.sdp);

        console.log('[webrtcService] Answer SDP line 1:', cleanSdp.split('\r\n')[0]);
        console.log('[webrtcService] Answer SDP CRLF check:', cleanSdp.includes('\r\n'));

        try {
            await this.pc.setRemoteDescription(
                new RTCSessionDescription({ type: sdpData.type, sdp: cleanSdp })
            );
        } catch (descErr) {
            console.warn('[webrtcService] setRemoteAnswer RTCSessionDescription failed, trying plain:', descErr?.message);
            await this.pc.setRemoteDescription({ type: sdpData.type, sdp: cleanSdp });
        }

        this._remoteDescSet = true;
        console.log('[webrtcService] setRemoteAnswer OK ✅ | signalingState:', this.pc.signalingState);

        await this.flushPendingIceCandidates();
    }

    // ────────────── ICE handling ──────────────
    addIceCandidate(candidate) {
        if (!this.pc || !candidate) return;

        // ✅ Reject malformed candidates before they corrupt ICE state
        if (!candidate.candidate || typeof candidate.candidate !== 'string') {
            console.warn('[webrtcService] Rejected malformed ICE candidate (no candidate string):', candidate);
            return;
        }

        if (!this._remoteDescSet) {
            console.log('[webrtcService] ICE queued — remote desc not set yet');
            this.pendingIceCandidates.push(candidate);
            return;
        }

        this.pc.addIceCandidate(new RTCIceCandidate(candidate))
            .then(() => console.log('[webrtcService] ICE candidate applied ✅'))
            .catch(e => console.log('[webrtcService] addIceCandidate error:', e?.message));
    }

    async flushPendingIceCandidates() {
        if (!this.pendingIceCandidates.length) return;
        console.log('[webrtcService] Flushing', this.pendingIceCandidates.length, 'queued ICE candidates');

        for (const c of this.pendingIceCandidates) {
            // ✅ Skip malformed candidates in queue
            if (!c?.candidate || typeof c.candidate !== 'string') {
                console.warn('[webrtcService] Skipping malformed queued ICE candidate:', c);
                continue;
            }
            try {
                await this.pc.addIceCandidate(new RTCIceCandidate(c));
                console.log('[webrtcService] Queued ICE applied ✅');
            } catch (e) {
                console.log('[webrtcService] Queued ICE error:', e?.message);
            }
        }
        this.pendingIceCandidates = [];
    }

    // ✅ cleanSdp — normalizes to CRLF (RFC 4566)
    cleanSdp(sdp) {
        if (!sdp) return sdp;

        // Step 1: Fix double-encoded escaped sequences
        if (sdp.includes('\\r\\n')) {
            sdp = sdp.replace(/\\r\\n/g, '\r\n');
            console.log('[webrtcService] Fixed literal \\\\r\\\\n');
        }
        if (sdp.includes('\\n')) {
            sdp = sdp.replace(/\\n/g, '\r\n');
            console.log('[webrtcService] Fixed literal \\\\n');
        }

        // Step 2: Normalize all line endings → CRLF
        sdp = sdp.replace(/\r\n/g, '\n'); // normalize first
        sdp = sdp.replace(/\r/g, '\n');    // handle lone \r
        sdp = sdp.replace(/\n/g, '\r\n');  // convert ALL to \r\n

        // Step 3: Ensure ends with CRLF
        if (!sdp.endsWith('\r\n')) {
            sdp = sdp + '\r\n';
        }

        console.log('[webrtcService] SDP CRLF check:', sdp.includes('\r\n'));
        return sdp;
    }

    _cleanupPC() {
        this.pc?.close();
        this.pc = null;
        this.remoteStream = null;
        this.pendingIceCandidates = [];
        this._remoteDescSet = false;
        this._answerInProgress = false;
    }

    close() {
        console.log('[webrtcService] Closing | signalingState:', this.pc?.signalingState, '| connectionState:', this.pc?.connectionState);

        this.localStream?.getTracks().forEach(t => {
            t.stop();
            console.log('[webrtcService] Track stopped:', t.kind);
        });

        this._cleanupPC();

        this.localStream = null;
        this.currentRoomId = null;
        this.onRemoteStream = null;
        this.onConnectionState = null;

        console.log('[webrtcService] Closed ✅');
    }
}

export default new WebRTCService();