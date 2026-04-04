import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BASE_URL } from '../utils/config';

// ✅ Create axios instance (same pattern as your other services)
const api = axios.create({
    baseURL: BASE_URL,
    timeout: 10000,
});

// ✅ Attach token automatically
api.interceptors.request.use(async (config) => {
    const token = await AsyncStorage.getItem('auth_token');

    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
});

/* ─────────────────────────────────────────────
   SEND OTP
───────────────────────────────────────────── */
export const sendOtp = async ({ email, pin_type }) => {
    try {
        const payload = {
            email,
            pin_type,  
        };
        const response = await api.post('/v1/pin/send-otp', payload);
        return response.data;

    } catch (error) {
        console.log('❌ SEND OTP ERROR:', error?.response?.data || error.message);

        throw error?.response?.data || {
            success: false,
            message: 'Failed to send OTP',
        };
    }
};

/* ─────────────────────────────────────────────
   VERIFY OTP
───────────────────────────────────────────── */
export const verifyOtp = async ({ email, otp, pin_type }) => {
    try {
        const payload = {
            email,
            otp,
            pin_type,
        };
        const response = await api.post('/v1/pin/verify-otp', payload);
        return response.data;

    } catch (error) {
        console.log('❌ VERIFY OTP ERROR:', error?.response?.data || error.message);

        throw error?.response?.data || {
            success: false,
            message: 'OTP verification failed',
        };
    }
};