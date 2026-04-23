import {
    RTCPeerConnection,
    mediaDevices,
    RTCIceCandidate,
} from 'react-native-webrtc';
import chatService from './chatService';

const configuration = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
    ],
};

class WebRTCService {
    constructor() {
        this.pc                   = null;
        this.localStream          = null;
        this.remoteStream         = null;
        this.pendingIceCandidates = [];
        this.currentRoomId        = null;  
        this.onRemoteStream       = null;  
        this.onConnectionState    = null;  
    }

    async init(roomId) {
        // ✅ Close existing PC cleanly before creating new one
        if (this.pc) {
            console.log('[webrtcService] Closing existing PC before reinit');
            this._cleanupPC();
        }

        this.currentRoomId        = roomId; // ✅ Store roomId as instance variable
        this.pendingIceCandidates = [];
        this.pc = new RTCPeerConnection(configuration);

        console.log('[webrtcService] PC created | signalingState:', this.pc.signalingState);

        // ✅ FIX — Use this.currentRoomId (not closure var) so it's always fresh
        this.pc.onicecandidate = (event) => {
            if (event.candidate && this.currentRoomId) {
                console.log('[webrtcService] ICE candidate generated | room:', this.currentRoomId);
                chatService.sendIceCandidate({
                    room_id:   this.currentRoomId, // ✅ Always uses latest roomId
                    candidate: event.candidate,
                });
            }
        };

        this.pc.ontrack = (event) => {
            this.remoteStream = event.streams[0];
            console.log('[webrtcService] Remote stream received ✅ | tracks:', event.streams[0]?.getTracks()?.length);

            // ✅ Notify screen via callback instead of tight coupling
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

            // ✅ Notify screen of connection state changes
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

        // ✅ Get local audio stream
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

    async createOffer() {
        if (!this.pc) throw new Error('[webrtcService] createOffer — PC is null');
        if (this.pc.signalingState !== 'stable') {
            throw new Error(`[webrtcService] createOffer — wrong signalingState: ${this.pc.signalingState}`);
        }

        const offer = await this.pc.createOffer();
        await this.pc.setLocalDescription(offer);

        console.log('[webrtcService] createOffer OK ✅ | signalingState:', this.pc.signalingState);

        return {
            type: offer.type,
            sdp:  offer.sdp,
        };
    }

    async createAnswer(offer) {
        if (!this.pc) throw new Error('[webrtcService] createAnswer — PC is null');
        if (this.pc.signalingState !== 'stable') {
            throw new Error(
                `[webrtcService] createAnswer — wrong signalingState: ${this.pc.signalingState} (expected "stable")`
            );
        }

        console.log('[webrtcService] createAnswer | signalingState:', this.pc.signalingState);

        // ✅ Normalize offer shape
        let sdpData = offer;
        if (offer?.offer)                                     sdpData = offer.offer;
        else if (offer?.sdp && typeof offer.sdp === 'object') sdpData = offer.sdp;

        if (!sdpData?.type || !sdpData?.sdp) {
            throw new Error(`Invalid offer — type:${sdpData?.type} sdp:${sdpData?.sdp ? 'ok' : 'missing'}`);
        }

        const cleanSdp = this.cleanSdp(sdpData.sdp);

        console.log('[webrtcService] SDP line 1:', cleanSdp.split('\r\n')[0]);
        console.log('[webrtcService] SDP has real CRLF:', cleanSdp.includes('\r\n'));

        // ✅ Plain object — NO new RTCSessionDescription()
        await this.pc.setRemoteDescription({
            type: sdpData.type,
            sdp:  cleanSdp,
        });

        console.log('[webrtcService] setRemoteDescription OK ✅ | signalingState:', this.pc.signalingState);

        await this.flushPendingIceCandidates();

        const answer = await this.pc.createAnswer();
        await this.pc.setLocalDescription(answer);

        console.log('[webrtcService] createAnswer OK ✅ | signalingState:', this.pc.signalingState);

        return {
            type: answer.type,
            sdp:  answer.sdp,
        };
    }

    async setRemoteAnswer(answer) {
        if (!this.pc) throw new Error('[webrtcService] setRemoteAnswer — PC is null');
        if (this.pc.signalingState !== 'have-local-offer') {
            throw new Error(
                `[webrtcService] setRemoteAnswer — wrong signalingState: ${this.pc.signalingState} (expected "have-local-offer")`
            );
        }

        console.log('[webrtcService] setRemoteAnswer | signalingState:', this.pc.signalingState);

        // ✅ Normalize answer shape
        let sdpData = answer;
        if (answer?.answer)                                    sdpData = answer.answer;
        else if (answer?.sdp && typeof answer.sdp === 'object') sdpData = answer.sdp;

        if (!sdpData?.type || !sdpData?.sdp) {
            throw new Error(`Invalid answer — type:${sdpData?.type} sdp:${sdpData?.sdp ? 'ok' : 'missing'}`);
        }

        const cleanSdp = this.cleanSdp(sdpData.sdp);

        console.log('[webrtcService] Answer SDP line 1:', cleanSdp.split('\r\n')[0]);
        console.log('[webrtcService] Answer SDP has real CRLF:', cleanSdp.includes('\r\n'));

        // ✅ Plain object — NO new RTCSessionDescription()
        await this.pc.setRemoteDescription({
            type: sdpData.type,
            sdp:  cleanSdp,
        });

        console.log('[webrtcService] setRemoteAnswer OK ✅ | signalingState:', this.pc.signalingState);

        await this.flushPendingIceCandidates();
    }

    addIceCandidate(candidate) {
        if (!this.pc || !candidate) return;

        if (!this.pc.remoteDescription) {
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

        for (const candidate of this.pendingIceCandidates) {
            try {
                await this.pc.addIceCandidate(new RTCIceCandidate(candidate));
                console.log('[webrtcService] Queued ICE applied ✅');
            } catch (e) {
                console.log('[webrtcService] Queued ICE error:', e?.message);
            }
        }
        this.pendingIceCandidates = [];
    }

    cleanSdp(sdp) {
        if (!sdp) return sdp;
        if (sdp.includes('\\r\\n')) sdp = sdp.replace(/\\r\\n/g, '\r\n');
        if (sdp.includes('\\r'))    sdp = sdp.replace(/\\r/g, '\r');
        if (sdp.includes('\\n'))    sdp = sdp.replace(/\\n/g, '\n');
        return sdp;
    }

    isReady() {
        return (
            this.pc !== null &&
            this.pc.signalingState !== 'closed' &&
            this.pc.connectionState !== 'failed'
        );
    }

    // ✅ Internal cleanup — separates PC teardown from full close()
    _cleanupPC() {
        this.pc?.close();
        this.pc            = null;
        this.remoteStream  = null;
        this.pendingIceCandidates = [];
    }

    close() {
        console.log('[webrtcService] Closing | signalingState:', this.pc?.signalingState, '| connectionState:', this.pc?.connectionState);

        this.localStream?.getTracks().forEach(t => {
            t.stop();
            console.log('[webrtcService] Track stopped:', t.kind);
        });

        this._cleanupPC();

        this.localStream   = null;
        this.currentRoomId = null;
        this.onRemoteStream    = null; // ✅ Clear callbacks to prevent memory leaks
        this.onConnectionState = null;

        console.log('[webrtcService] Closed ✅');
    }
}

export default new WebRTCService();