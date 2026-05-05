import axios from 'axios';
import { BASE_URL, DEFAULT_HEADERS, API_TIMEOUT } from '../utils/config';
import AuthService from './AuthService';

// Shared axios instance for all chat-related calls
export const api = axios.create({
  baseURL: BASE_URL,
  timeout: API_TIMEOUT,
  headers: DEFAULT_HEADERS,
});

// Attach auth token to every request
api.interceptors.request.use(
  async (config) => {
    const token = await AuthService.getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

const chatService = {

  getChatRooms: async () => {
    const response = await api.get('/v1/chat-rooms');
    return response.data;
  },

  getRoomMessages: (roomId, page = 1) => {
    return api.get(`/v1/chat-rooms/${roomId}/messages?page=${page}`);
  },

  sendMessage: (roomId, messageData, config = {}) => {
    return api.post(
      `/v1/chat-rooms/${roomId}/messages`,
      messageData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        ...config, // ✅ THIS LINE FIXES YOUR ISSUE
      }
    );
  },

  getContacts: (userId, limit = 20) => {
    return api
      .get(`/v1/contacts/${userId}?limit=${limit}`)
      .then((response) => response.data)
      .catch((error) => {
        console.error('Error fetching contacts:', error);
        throw error;
      });
  },

  // for Edit
  editMessage: (roomId, messageId, data) => {
    return api.put(`/v1/chat-rooms/${roomId}/messages/${messageId}`, data);
  },

  // Create a one‑to‑one chat room
  createChatRoom: (contactId, name) => {
    const payload = {
      type: 'one-to-one',
      user_ids: [contactId],
      name,
    };

    return api
      .post('/v1/chat-rooms', payload)
      .then((response) => {
        // Chat room data may be under data.data or data
        const chatRoomData = response.data.data || response.data;
        return chatRoomData;
      })
      .catch((error) => {
        throw error;
      });
  },

  deleteChatRoom: (roomId) => {
    return api
      .delete(`/v1/chat-rooms/${roomId}`)
      .catch((error) => {
        console.error(`Error deleting chat room #${roomId}:`, error);
        throw error;
      });
  },

  inviteGuestForChat: async (userName) => {
    const payload = {
      type: 'one-to-one',
      name: userName,
      guest_name: null,
    };

    return api
      .post('/v1/guest-chat/invite', payload)
      .then((response) => response.data)
      .catch((error) => {
        console.error('Error creating guest invite:', error);
        throw error;
      });
  },

  updateRoomMeta: async (roomId, meta) => {
    try {
      const response = await api.post(
        `/v1/chat-rooms/${roomId}/meta`,
        meta
      );
      return response.data;
    } catch (error) {
      throw new Error('Meta sync failed');
    }
  },


  // Audio Call Feature Start
  sendCallOffer: (data) => {
    return api.post('/v1/call/offer', data);
  },

  sendCallAnswer: (data) => {
    return api.post('/v1/call/answer', data);
  },

  sendIceCandidate: (data) => {
    return api.post('/v1/call/ice', data);
  },

  getCallOffer: (roomId) => {
    return api.get(`/v1/call/offer/${roomId}`);
  },

  getCallAnswer: (roomId) => {
    return api.get(`/v1/call/answer/${roomId}`);
  },

  getIceCandidates: (roomId) => {
    return api.get(`/v1/call/ice/${roomId}`);
  },

  endCall: (roomId) => {
    return api.delete(`/v1/call/end/${roomId}`);
  },

  getCallStatus: (roomId) => api.get(`/v1/call/status/${roomId}`),
  // Audio Call Feature End

  /**
 * chatService_video_additions.js
 * ───────────────────────────────
 * ADD these methods to your existing chatService.js.
 * They are completely separate from audio call methods.
 * Uses /video-call/* routes on the backend.
 *
 * Paste each function into your chatService class/object.
 */

  // ─── Video Call Signaling ────────────────────────────

  sendVideoCallOffer: (data) =>
    api.post('/v1/video-call/offer', data),

  getVideoCallOffer: (roomId) =>
    api.get(`/v1/video-call/offer/${roomId}`),

  sendVideoCallAnswer: (data) =>
    api.post('/v1/video-call/answer', data),

  getVideoCallAnswer: (roomId) =>
    api.get(`/v1/video-call/answer/${roomId}`),

  getVideoCallStatus: (roomId) =>
    api.get(`/v1/video-call/status/${roomId}`),

  endVideoCall: (roomId) =>
    api.post('/v1/video-call/end', { room_id: roomId }),

  // ─── Video ICE Candidates ────────────────────────────

  sendVideoIceCandidate: (data) =>
    api.post('/v1/video-call/ice', data),

  getVideoIceCandidates: (roomId) =>
    api.get(`/v1/video-call/ice/${roomId}`),


  getUserById: (userId) => api.get(`/users/${userId}`),
  
};

export default chatService;
