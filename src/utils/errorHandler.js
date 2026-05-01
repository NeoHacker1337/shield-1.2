import { Alert } from 'react-native';

export const handleApiError = (error, customMessage = 'An error occurred') => {
  console.error('API Error:', error);

  let message = customMessage;

  if (error.response) {
    if (error.response.data?.message) {
      message = error.response.data.message;
    } else if (error.response.data?.error) {
      message = error.response.data.error;
    } else if (error.response.data?.errors && typeof error.response.data.errors === 'object') {
      const firstKey = Object.keys(error.response.data.errors)[0];
      const firstValue = firstKey ? error.response.data.errors[firstKey] : null;
      if (Array.isArray(firstValue) && firstValue.length > 0) {
        message = firstValue[0];
      } else if (typeof firstValue === 'string' && firstValue.trim()) {
        message = firstValue;
      }
    }
  } else if (error.request) {
    message = 'Network error. Please check your connection.';
  }

  return message; // ✅ RETURN IT
};


export const showSuccess = (message) => {
  Alert.alert('Success', message);
};
