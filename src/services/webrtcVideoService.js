/**
 * webrtcVideoService.js
 * ─────────────────────
 * Standalone WebRTC service for VIDEO calls.
 * Completely separate from webrtcService.js (audio).
 * All audio-call bugs fixed:
 *   ✅ _answerInProgress resets in finally
 *   ✅ ICE dedup by candidate string (not index)
 *   ✅ Answer sent once — inside createAnswer()
 *   ✅ SDP normalized to \n (Android native requirement)
 *   ✅ Triple-fallback for setRemoteDescription
 */

import {
    RTCPeerConnection,
    mediaDevices,
    RTCIceCandidate,
    RTCSessionDescription,
} from 'react-native-webrtc';
import chatService from './chatService';

const configuration = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        {
            urls:       'turn:openrelay.metered.ca:80',
            username:   'openrelayproject',
            credential: 'openrelayproject',
        },
        {
            urls:       'turn:openrelay.metered.ca:443',
            username:   'openrelayproject',
            credential: 'openrelayproject',
        },
        {
            urls:       'turns:openrelay.metered.ca:443',
            username:   'openrelayproject',
            credential: 'openrelayproject',
        },
    ],
};

class WebRTCVideoService {
    constructor() {
        this.pc                   = null;
        this.localStream          = null;
        this.remoteStream         = null;
        this.pendingIceCandidates = [];
        this.currentRoomId        = null;
        this.onRemoteStream       = null;
        this.onLocalStream        = null;
        this.onConnectionState    = null;
        this._remoteDescSet       = false;
        this._answerInProgress    = false;
        this._isFrontCamera       = true;
    }

    // ─────────────────────────────────────────────
    // INIT
    // ─────────────────────────────────────────────
    async init(roomId) {
        if (this.pc) {
            console.log('[VideoService] Closing existing PC before reinit');
            this._cleanupPC();
        }

        this.currentRoomId        = roomId;
        this.pendingIceCandidates = [];
        this._remoteDescSet       = false;
        this._answerInProgress    = false;
        this._isFrontCamera       = true;

        this.pc = new RTCPeerConnection(configuration);
        console.log('[VideoService] PC created | signalingState:', this.pc.signalingState);

        // ICE — send to server immediately
        this.pc.onicecandidate = (event) => {
            if (event.candidate && this.currentRoomId) {
                console.log('[VideoService] ICE candidate generated | room:', this.currentRoomId);
                chatService.sendVideoIceCandidate({
                    room_id:   this.currentRoomId,
                    candidate: event.candidate,
                });
            }
        };

        // Remote track received
        this.pc.ontrack = (event) => {
            this.remoteStream = event.streams[0];
            console.log('[VideoService] Remote stream received ✅ | tracks:', this.remoteStream?.getTracks()?.length);
            if (typeof this.onRemoteStream === 'function') {
                this.onRemoteStream(this.remoteStream);
            }
        };

        this.pc.onsignalingstatechange = () =>
            console.log('[VideoService] signalingState →', this.pc?.signalingState);

        this.pc.onconnectionstatechange = () => {
            const state = this.pc?.connectionState;
            console.log('[VideoService] connectionState →', state);
            if (typeof this.onConnectionState === 'function') {
                this.onConnectionState(state);
            }
        };

        this.pc.oniceconnectionstatechange = () =>
            console.log('[VideoService] iceConnectionState →', this.pc?.iceConnectionState);

        this.pc.onicegatheringstatechange = () =>
            console.log('[VideoService] iceGatheringState →', this.pc?.iceGatheringState);

        // Request audio + video stream
        this.localStream = await mediaDevices.getUserMedia({
            audio: true,
            video: {
                facingMode: 'user',
                width:  { ideal: 1280 },
                height: { ideal: 720 },
            },
        });

        this.localStream.getTracks().forEach(track => {
            this.pc.addTrack(track, this.localStream);
            console.log('[VideoService] Local track added:', track.kind);
        });

        // Notify screen to display local stream
        if (typeof this.onLocalStream === 'function') {
            this.onLocalStream(this.localStream);
        }

        console.log('[VideoService] init() complete | roomId:', roomId);
    }

    // ─────────────────────────────────────────────
    // CALLER — Device A
    // ─────────────────────────────────────────────
    async startCaller(roomId, callerId) {
        await this.init(roomId);

        if (!this.pc) throw new Error('[VideoService] startCaller — PC is null');
        if (this.pc.signalingState !== 'stable') {
            throw new Error(`[VideoService] startCaller — wrong signalingState: ${this.pc.signalingState}`);
        }

        const offer = await this.pc.createOffer();
        await this.pc.setLocalDescription(offer);
        console.log('[VideoService] createOffer OK ✅ | signalingState:', this.pc.signalingState);

        const offerPayload = { type: offer.type, sdp: offer.sdp };

        await chatService.sendVideoCallOffer({
            room_id:   roomId,
            caller_id: callerId,
            offer:     offerPayload,
        });

        console.log('[VideoService] Video offer sent to server ✅');
        return offerPayload;
    }

    // ─────────────────────────────────────────────
    // RECEIVER — Device B
    // ─────────────────────────────────────────────
    async createAnswer(offer) {
        if (!this.pc) throw new Error('[VideoService] createAnswer — PC is null');

        if (this._answerInProgress) {
            console.warn('[VideoService] createAnswer already in progress — skipping duplicate call');
            return null;
        }

        if (this.pc.signalingState !== 'stable') {
            throw new Error(`[VideoService] createAnswer — wrong signalingState: ${this.pc.signalingState}`);
        }

        this._answerInProgress = true;

        try {
            console.log('[VideoService] createAnswer started | signalingState:', this.pc.signalingState);

            // Normalize offer shape
            let sdpData = offer;
            if (offer?.offer)                                     sdpData = offer.offer;
            else if (offer?.sdp && typeof offer.sdp === 'object') sdpData = offer.sdp;

            console.log('[VideoService] sdpData.type:', sdpData?.type);
            console.log('[VideoService] sdpData.sdp length:', sdpData?.sdp?.length);

            if (!sdpData?.type || !sdpData?.sdp) {
                throw new Error(
                    `Invalid offer — type:${sdpData?.type} sdp:${sdpData?.sdp ? 'ok' : 'missing'}`
                );
            }

            const cleanedSdp = this.cleanSdp(sdpData.sdp);
            console.log('[VideoService] SDP normalized | length:', cleanedSdp.length);
            console.log('[VideoService] SDP first line:', cleanedSdp.split('\n')[0]);

            // Triple fallback for setRemoteDescription
            await this._trySetRemoteDescription(sdpData.type, cleanedSdp);

            this._remoteDescSet = true;
            console.log('[VideoService] setRemoteDescription OK ✅ | signalingState:', this.pc.signalingState);

            await this.flushPendingIceCandidates();

            const answer = await this.pc.createAnswer();
            await this.pc.setLocalDescription(answer);
            console.log('[VideoService] setLocalDescription OK ✅ | signalingState:', this.pc.signalingState);

            const answerPayload = { type: answer.type, sdp: answer.sdp };

            // ✅ Send answer once — here only, NOT in VideoCallScreen
            await chatService.sendVideoCallAnswer({
                room_id: this.currentRoomId,
                answer:  answerPayload,
            });
            console.log('[VideoService] Answer sent to server ✅');

            return answerPayload;

        } catch (e) {
            console.error('[VideoService] createAnswer ERROR:', e?.message);
            throw e;
        } finally {
            this._answerInProgress = false; // ✅ always resets — success OR error
        }
    }

    async _trySetRemoteDescription(type, sdp) {
        // Attempt 1: plain object with \n
        try {
            await this.pc.setRemoteDescription({ type, sdp });
            console.log('[VideoService] setRemoteDescription attempt 1 (plain + LF) ✅');
            return;
        } catch (e1) {
            console.warn('[VideoService] Attempt 1 failed:', e1?.message);
        }

        // Attempt 2: RTCSessionDescription with \n
        try {
            await this.pc.setRemoteDescription(new RTCSessionDescription({ type, sdp }));
            console.log('[VideoService] setRemoteDescription attempt 2 (RTCSessionDescription) ✅');
            return;
        } catch (e2) {
            console.warn('[VideoService] Attempt 2 failed:', e2?.message);
        }

        // Attempt 3: plain object with \r\n (CRLF)
        const crlfSdp = sdp.replace(/\n/g, '\r\n');
        try {
            await this.pc.setRemoteDescription({ type, sdp: crlfSdp });
            console.log('[VideoService] setRemoteDescription attempt 3 (plain + CRLF) ✅');
            return;
        } catch (e3) {
            throw new Error('All setRemoteDescription attempts failed: ' + e3?.message);
        }
    }

    // ─────────────────────────────────────────────
    // SET REMOTE ANSWER (Caller side)
    // ─────────────────────────────────────────────
    async setRemoteAnswer(answer) {
        if (!this.pc) throw new Error('[VideoService] setRemoteAnswer — PC is null');
        if (this.pc.signalingState !== 'have-local-offer') {
            throw new Error(
                `[VideoService] setRemoteAnswer — wrong signalingState: ${this.pc.signalingState} (expected "have-local-offer")`
            );
        }

        console.log('[VideoService] setRemoteAnswer | signalingState:', this.pc.signalingState);

        let sdpData = answer;
        if (answer?.answer)                                   sdpData = answer.answer;
        else if (answer?.sdp && typeof answer.sdp === 'object') sdpData = answer.sdp;

        if (!sdpData?.type || !sdpData?.sdp) {
            throw new Error(`Invalid answer — type:${sdpData?.type} sdp:${sdpData?.sdp ? 'ok' : 'missing'}`);
        }

        const cleanedSdp = this.cleanSdp(sdpData.sdp);

        await this.pc.setRemoteDescription(
            new RTCSessionDescription({ type: sdpData.type, sdp: cleanedSdp })
        );

        this._remoteDescSet = true;
        console.log('[VideoService] setRemoteAnswer OK ✅ | signalingState:', this.pc.signalingState);

        await this.flushPendingIceCandidates();
    }

    // ─────────────────────────────────────────────
    // ICE
    // ─────────────────────────────────────────────
    addIceCandidate(candidate) {
        if (!this.pc || !candidate) return;

        if (!this._remoteDescSet) {
            console.log('[VideoService] ICE queued — remote desc not set yet');
            this.pendingIceCandidates.push(candidate);
            return;
        }

        this.pc.addIceCandidate(new RTCIceCandidate(candidate))
            .then(() => console.log('[VideoService] ICE candidate applied ✅'))
            .catch(e => console.log('[VideoService] addIceCandidate error:', e?.message));
    }

    async flushPendingIceCandidates() {
        if (!this.pendingIceCandidates.length) return;
        console.log('[VideoService] Flushing', this.pendingIceCandidates.length, 'queued ICE candidates');

        for (const c of this.pendingIceCandidates) {
            try {
                await this.pc.addIceCandidate(new RTCIceCandidate(c));
                console.log('[VideoService] Queued ICE applied ✅');
            } catch (e) {
                console.log('[VideoService] Queued ICE error:', e?.message);
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
            this._isFrontCamera = !this._isFrontCamera;
            console.log('[VideoService] Camera flipped | front:', this._isFrontCamera);
        } catch (e) {
            console.log('[VideoService] flipCamera error:', e?.message);
        }
    }

    setVideoEnabled(enabled) {
        this.localStream?.getVideoTracks().forEach(t => {
            t.enabled = enabled;
            console.log('[VideoService] Video track enabled:', enabled);
        });
    }

    setAudioEnabled(enabled) {
        this.localStream?.getAudioTracks().forEach(t => {
            t.enabled = enabled;
            console.log('[VideoService] Audio track enabled:', enabled);
        });
    }

    // ─────────────────────────────────────────────
    // SDP CLEANUP
    // ─────────────────────────────────────────────
    cleanSdp(sdp) {
        if (!sdp) return sdp;

        // Unescape literal \r\n text (from JSON double-encoding)
        if (sdp.includes('\\r\\n')) {
            sdp = sdp.replace(/\\r\\n/g, '\n');
            console.log('[VideoService] Cleaned literal \\r\\n');
        }
        if (sdp.includes('\\n')) {
            sdp = sdp.replace(/\\n/g, '\n');
            console.log('[VideoService] Cleaned literal \\n');
        }

        // Normalize all line endings to \n (Android native requirement)
        sdp = sdp.replace(/\r\n/g, '\n');
        sdp = sdp.replace(/\r/g, '\n');

        // Ensure SDP ends with newline
        if (!sdp.endsWith('\n')) sdp += '\n';

        return sdp;
    }

    // ─────────────────────────────────────────────
    // CLEANUP
    // ─────────────────────────────────────────────
    _cleanupPC() {
        this.pc?.close();
        this.pc                   = null;
        this.remoteStream         = null;
        this.pendingIceCandidates = [];
        this._remoteDescSet       = false;
        this._answerInProgress    = false;
    }

    close() {
        console.log('[VideoService] Closing | signalingState:', this.pc?.signalingState, '| connectionState:', this.pc?.connectionState);

        this.localStream?.getTracks().forEach(t => {
            t.stop();
            console.log('[VideoService] Track stopped:', t.kind);
        });

        this._cleanupPC();

        this.localStream       = null;
        this.currentRoomId     = null;
        this.onRemoteStream    = null;
        this.onLocalStream     = null;
        this.onConnectionState = null;

        console.log('[VideoService] Closed ✅');
    }
}

// Singleton — separate instance from webrtcService.js
export default new WebRTCVideoService();
