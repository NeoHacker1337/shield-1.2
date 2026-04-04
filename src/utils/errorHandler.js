import { Alert } from 'react-native';

export const handleApiError = (error, customMessage = 'An error occurred') => {
  console.error('API Error:', error);

  let message = customMessage;

  if (error.response) {
    if (error.response.data?.message) {
      message = error.response.data.message;
    } else if (error.response.data?.error) {
      message = error.response.data.error;
    }
  } else if (error.request) {
    message = 'Network error. Please check your connection.';
  }

  return message; // ✅ RETURN IT
};


export const showSuccess = (message) => {
  Alert.alert('Success', message);
};
