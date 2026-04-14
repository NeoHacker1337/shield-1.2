import axios from 'axios';
import { BASE_URL, DEFAULT_HEADERS, API_TIMEOUT } from '../utils/config';
import AuthService from './AuthService';

// Shared axios instance
const api = axios.create({
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

// Log response errors in detail
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response) {
            // Server responded with a status code outside 2xx
            console.error('API Error Response:', {
                status: error.response.status,
                data: error.response.data,
                url: error.config?.url,
            });
        } else if (error.request) {
            // Request was made but no response received (NETWORK ERROR)
            console.error('Network Error - No response received:', {
                url: error.config?.url,
                baseURL: error.config?.baseURL,
                method: error.config?.method,
                message: error.message,
            });
        } else {
            console.error('Request Setup Error:', error.message);
        }
        return Promise.reject(error);
    },
);

const invitationService = {

    // GET /v1/get-all-invitations
    getAllInvitations: async () => {
        try {
            const response = await api.get('/v1/get-all-invitations');
            console.log('Invitations API response:', JSON.stringify(response.data));

            // API shape: { success, data: { current_page, data: [...], ... } }
            // Return the inner array of invitation objects
            return response?.data?.data?.data ?? [];
        } catch (error) {
            console.error('Error fetching invitations:', error.message);
            throw error;
        }
    },

    // DELETE invitation
    deleteInvitation: async (id) => {
        try {
            const response = await api.delete(`/v1/invitations/${id}`);
            return response.data;
        } catch (error) {
            console.error('Error deleting invitation:', error.message);
            throw error;
        }
    },
};

export default invitationService;