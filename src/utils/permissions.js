import { PermissionsAndroid, Platform, Alert, Linking } from 'react-native';

/**
 * Checks if CALL_PHONE permission is granted.
 * @returns {Promise<boolean>}
 */
const checkCallPermission = async () => {
    if (Platform.OS !== 'android') return true; // Not applicable on iOS
    try {
        const granted = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.CALL_PHONE);
        return granted;
    } catch (e) {
        console.warn('Permission check error:', e);
        return false;
    }
};

/**
 * Requests the CALL_PHONE permission from the user.
 * @returns {Promise<boolean>}
 */
const requestCallPermission = async () => {
    if (Platform.OS !== 'android') return true; // Not applicable on iOS
    try {
        const result = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.CALL_PHONE,
            {
                title: 'Phone Permission Required',
                message: 'This app needs permission to place phone calls for its features to work.',
                buttonPositive: 'OK',
                buttonNegative: 'Cancel',
            }
        );

        if (result === PermissionsAndroid.RESULTS.GRANTED) { 
            return true;
        } else if (result === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) { 
            Alert.alert(
                'Permission Required',
                'You have permanently denied the phone call permission. To use this feature, please enable it in your device settings.',
                [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Open Settings', onPress: () => Linking.openSettings() },
                ]
            );
            return false;
        } else { 
            return false;
        }
    } catch (err) {
        console.warn('Permission request error:', err);
        return false;
    }
};

/**
 * A single function to check and, if necessary, request the CALL_PHONE permission.
 * This is the function you'll typically use in your components.
 */
export const checkAndRequestCallPermission = async () => {
  if (Platform.OS !== 'android') return true;

  try {
    const result = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.CALL_PHONE,
      {
        title: 'Phone Permission Required',
        message: 'Allow Shield to make secure phone calls.',
        buttonPositive: 'Allow',
        buttonNegative: 'Deny',
      }
    );

    if (result === PermissionsAndroid.RESULTS.GRANTED) {
      return true;
    }

    if (result === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) {
      Alert.alert(
        'Permission Required',
        'Phone permission is disabled. Enable it in Settings.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Open Settings', onPress: () => Linking.openSettings() },
        ]
      );
    }

    return false;

  } catch (e) {
    console.warn('CALL_PHONE permission error', e);
    return false;
  }
};