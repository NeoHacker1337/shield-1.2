// src/services/FeedbackService.js

import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BASE_URL, DEFAULT_HEADERS, API_TIMEOUT } from '../utils/config';
import AuthService from './AuthService';
import { handleApiError } from '../utils/errorHandler';

class FeedbackService {
  constructor() {
    // Create axios instance consistent with your other services
    this.api = axios.create({
      baseURL: BASE_URL,
      timeout: API_TIMEOUT,
      headers: DEFAULT_HEADERS,
    });

    // Attach token from AuthService automatically
    this.api.interceptors.request.use(async (config) => {
      const token = await AuthService.getToken(); // ✅ uses your centralized method
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    }, (error) => Promise.reject(error));

    // Handle expired tokens globally
    this.api.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (error.response?.status === 401) {
          await AuthService.logout();
        }
        return Promise.reject(error);
      }
    );
  }

  /**
   * Submit user feedback
   */
  async submitFeedback(feedbackData) {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      if (!token) throw new Error('Authentication token not found. Please login again.');

      // Validation
      if (!feedbackData.message || feedbackData.message.trim().length < 5) {
        throw new Error('Feedback message must be at least 5 characters long.');
      }

      // Prepare payload
      const payload = {
        message: feedbackData.message.trim(),
      };
      if (feedbackData.subject?.trim()) payload.subject = feedbackData.subject.trim();
      if (feedbackData.rating && feedbackData.rating > 0) payload.rating = feedbackData.rating;

      // API call (Laravel endpoint)
      const response = await this.api.post('/v1/feedback', payload);

      return {
        success: true,
        data: response.data?.data || response.data,
        message: response.data?.message || 'Feedback submitted successfully.',
      };
    } catch (error) {
      handleApiError(error, 'Failed to submit feedback.');
      throw error;
    }
  }

  /**
   * Fetch user's previous feedback
   */
  async getFeedbackHistory() {
    try {
      const response = await this.api.get('/v1/feedback');
      return {
        success: true,
        data: response.data?.data || response.data,
      };
    } catch (error) {
      handleApiError(error, 'Failed to load feedback history.');
      throw error;
    }
  }
}

export default new FeedbackService();
