// webrtcService.js
import {
    RTCPeerConnection,
    mediaDevices,
    RTCIceCandidate,
    RTCSessionDescription,
} from 'react-native-webrtc';
import chatService from './chatService'; // must have sendOffer, sendAnswer, sendIceCandidate

const configuration = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
    ],
};

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

        this.pc = new RTCPeerConnection(configuration);
        console.log('[webrtcService] PC created | signalingState:', this.pc.signalingState);

        this.pc.onicecandidate = (event) => {
            if (event.candidate && this.currentRoomId) {
                console.log('[webrtcService] ICE candidate generated | room:', this.currentRoomId);
                chatService.sendIceCandidate({
                    room_id: this.currentRoomId,
                    candidate: event.candidate,
                });
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

        // ✅ use sendCallOffer (not sendOffer)
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
            console.warn('[webrtcService] createAnswer already in progress — skipping duplicate call');
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

            // ✅ normalize offer payload FIRST
            let sdpData = offer;
            if (offer?.offer) sdpData = offer.offer;
            else if (offer?.sdp && typeof offer.sdp === 'object') sdpData = offer.sdp;

            // ✅ debug logs AFTER sdpData is declared
            console.log('[webrtcService] sdpData.type:', sdpData?.type);
            console.log('[webrtcService] sdpData.sdp length:', sdpData?.sdp?.length);
            console.log('[webrtcService] sdpData.sdp preview:', sdpData?.sdp?.substring(0, 100));

            if (!sdpData?.type || !sdpData?.sdp) {
                throw new Error(`Invalid offer — type:${sdpData?.type} sdp:${sdpData?.sdp ? 'ok' : 'missing'}`);
            }

            const cleanSdp = this.cleanSdp(sdpData.sdp);

            console.log('[webrtcService] SDP line 1:', cleanSdp.split('\r\n')[0]);
            console.log('[webrtcService] SDP has real CRLF:', cleanSdp.includes('\r\n'));

            // ✅ use RTCSessionDescription to avoid "SessionDescription is NULL"
            try {
                await this.pc.setRemoteDescription(
                    new RTCSessionDescription({ type: sdpData.type, sdp: cleanSdp })
                );
            } catch (descErr) {
                console.warn('[webrtcService] RTCSessionDescription failed, trying plain object:', descErr?.message);
                await this.pc.setRemoteDescription({ type: sdpData.type, sdp: cleanSdp });
            }
            this._remoteDescSet = true;
            console.log('[webrtcService] setRemoteDescription OK ✅ | signalingState:', this.pc.signalingState);

            this._remoteDescSet = true;
            console.log('[webrtcService] setRemoteDescription OK ✅ | signalingState:', this.pc.signalingState);

            // flush ICE candidates queued before remoteDescription was set
            await this.flushPendingIceCandidates();

            const answer = await this.pc.createAnswer();
            console.log('[webrtcService] createAnswer OK ✅ | signalingState:', this.pc.signalingState);

            await this.pc.setLocalDescription(answer);
            console.log('[webrtcService] setLocalDescription OK ✅ | signalingState:', this.pc.signalingState);

            const answerPayload = { type: answer.type, sdp: answer.sdp };

            // ✅ use sendCallAnswer (matches your chatService method name)
            await chatService.sendCallAnswer({
                room_id: this.currentRoomId,
                answer: answerPayload,
            });
            console.log('[webrtcService] Answer posted to server ✅');

            return answerPayload;

        } catch (e) {
            console.error('[webrtcService] createAnswer ERROR:', e?.message);
            this._answerInProgress = false; // unlock on error so a single retry is possible
            throw e;
        }
    }
    async setRemoteAnswer(answer) {
        if (!this.pc) throw new Error('[webrtcService] setRemoteAnswer — PC is null');
        if (this.pc.signalingState !== 'have-local-offer') {
            throw new Error(
                `[webrtcService] setRemoteAnswer — wrong signalingState: ${this.pc.signalingState} (expected "have-local-offer")`
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
        console.log('[webrtcService] Answer SDP has real CRLF:', cleanSdp.includes('\r\n'));

        const remoteDesc = new RTCSessionDescription({
            type: sdpData.type,
            sdp: cleanSdp,
        });

        await this.pc.setRemoteDescription(remoteDesc);
        this._remoteDescSet = true;
        console.log('[webrtcService] setRemoteAnswer OK ✅ | signalingState:', this.pc.signalingState);

        await this.flushPendingIceCandidates();
    }

    // ────────────── ICE handling (both sides) ──────────────
    addIceCandidate(candidate) {
        if (!this.pc || !candidate) return;

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
            try {
                await this.pc.addIceCandidate(new RTCIceCandidate(c));
                console.log('[webrtcService] Queued ICE applied ✅');
            } catch (e) {
                console.log('[webrtcService] Queued ICE error:', e?.message);
            }
        }
        this.pendingIceCandidates = [];
    }

    cleanSdp(sdp) {
        if (!sdp) return sdp;

        // unescape if double-escaped
        if (sdp.includes('\\r\\n')) sdp = sdp.replace(/\\r\\n/g, '\r\n');
        if (sdp.includes('\\r')) sdp = sdp.replace(/\\r/g, '\r');
        if (sdp.includes('\\n')) sdp = sdp.replace(/\\n/g, '\n');

        // ✅ strip all \r — Android react-native-webrtc needs \n only
        sdp = sdp.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

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