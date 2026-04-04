import AsyncStorage from '@react-native-async-storage/async-storage';

const ACTIVATION_SCREEN_STATUS_KEY = 'activation_screen_status';

/**
 * 🔐 Global Activation Guard
 * Only ONE source of truth
 */
export const isUserActivated = async () => {
  try {
    const status = await AsyncStorage.getItem(ACTIVATION_SCREEN_STATUS_KEY);
    return status === 'true';
  } catch (error) {
    console.error('❌ [activationGuard] Failed:', error);
    return false;
  }
};

/**
 * 🚦 Force redirect if not activated
 */
export const enforceActivation = async (navigation) => {
  const activated = await isUserActivated();

  if (!activated) {
    navigation.reset({
      index: 0,
      routes: [{ name: 'Activation' }],
    });
    return false;
  }

  return true;
};
