import AsyncStorage from '@react-native-async-storage/async-storage';
import { BASE_URL, DEFAULT_HEADERS } from '../utils/config';

export const getReferral = async () => {
  try {
    const token = await AsyncStorage.getItem('auth_token');

    const response = await fetch(`${BASE_URL}/v1/referral`, {
      method: 'GET',
      headers: {
        ...DEFAULT_HEADERS,
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data?.message || 'Failed to fetch referral');
    }

    // ✅ Store referral data locally
    await AsyncStorage.setItem(
  'referral_data',
  JSON.stringify({
    referralLink: data.referral_link,  
  })
);

    return data;

  } catch (error) {
    console.error('❌ Referral API error:', error.message);
    throw error;
  }
};