import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BASE_URL } from '../utils/config';

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
});

api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const getSecurityQuestions = async () => {
  const response = await api.get('/v1/security-questions');
 
  return response.data;
};

export const verifySecurityAnswers = async (payload) => {

  const response = await api.post('/v1/verify-security-answers', payload);

  return response.data;
};