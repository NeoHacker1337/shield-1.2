import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BASE_URL, API_TIMEOUT, DEFAULT_HEADERS } from '../utils/config';

 
const api = axios.create({
  baseURL: BASE_URL,
  timeout: API_TIMEOUT,
  headers: DEFAULT_HEADERS,
});

/* =====================================================
   🔐 Attach Bearer Token Automatically
===================================================== */
api.interceptors.request.use(
  async (config) => {
    

    try {
      const token = await AsyncStorage.getItem('auth_token');

      

      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
       
      } else {
        console.warn('⚠️ [licenseService] No auth_token found in storage');
      }
    } catch (e) {
      console.error('❌ [licenseService] Failed reading token:', e);
    }

     

    return config;
  },
  (error) => {
    console.error('❌ [licenseService] Request interceptor error:', error);
    return Promise.reject(error);
  }
);

/* =====================================================
   📥 Response Logger
===================================================== */
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    console.error('❌ [licenseService] Response error triggered');

    if (error?.response) {
      console.error('📛 [licenseService] Server responded:', {
        status: error.response.status,
        data: error.response.data,
        headers: error.response.headers,
      });
    } else if (error?.request) {
      console.error('📛 [licenseService] No response received:', error.request);
    } else {
      console.error('📛 [licenseService] Axios config error:', error.message);
    }

    return Promise.reject(error);
  }
);

/* =====================================================
   🚀 Activate License API
===================================================== */
export const activateLicense = async ({
  license_key,
  device_id,
  device_name,
  user_id,
}) => {
   

  try {
     

    const response = await api.post('/v1/license/activate', {
      license_key,
      device_id,
      device_name,
      user_id,
    });

     
    return response.data;

  } catch (error) {
    console.error('🔥 [activateLicense] FAILED');

    if (error?.response) {
      console.error('📛 [activateLicense] Server error data:', error.response.data);
      console.error('📛 [activateLicense] HTTP status:', error.response.status);

      throw new Error(
        error.response.data?.error ||
        error.response.data?.message ||
        'Activation failed'
      );
    }

    if (error?.request) {
      console.error('📛 [activateLicense] No response received from server');
      throw new Error('No response from server');
    }

    console.error('📛 [activateLicense] Unknown error:', error.message);
    throw new Error(error.message || 'Activation failed');
  }
};
