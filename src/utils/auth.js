import SInfo from 'react-native-sensitive-info';

export const checkIfPasswordExists = async () => {
  try {
    const options = {
      sharedPreferencesName: 'shieldSharedPrefs',
      keychainService: 'shieldKeychain'
    };
    
    const password = await SInfo.getItem('encryptedPassword', options);
    return !!password;
  } catch (error) {
    console.error('Error checking password existence:', error);
    return false;
  }
};

export const resetAuthState = async () => {
  try {
    const options = {
      sharedPreferencesName: 'shieldSharedPrefs',
      keychainService: 'shieldKeychain'
    };
    
    await SInfo.deleteItem('encryptedPassword', options);
    await Keychain.resetGenericPassword();
  } catch (error) {
    console.error('Error resetting auth state:', error);
  }
};