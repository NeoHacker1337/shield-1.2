import { Platform, PermissionsAndroid, Alert, Linking, NativeModules } from 'react-native';

const { PermissionModule } = NativeModules;

export const usePermissions = () => {

  const checkAllFilesAccess = async () => {
    if (Platform.OS !== 'android' || Platform.Version < 30) return true;
    try {
      const granted = await PermissionModule.hasManageExternalStorage();
      if (granted) return true;
      return new Promise(resolve => {
        Alert.alert(
          'All Files Access Required',
          'Shield needs "All Files Access" permission.',
          [
            { text: 'Cancel', onPress: () => resolve(false), style: 'cancel' },
            {
              text: 'Open Settings',
              onPress: async () => {
                try {
                  await Linking.sendIntent('android.settings.MANAGE_ALL_FILES_ACCESS_PERMISSION');
                } catch {
                  await Linking.openSettings();
                }
                resolve(false);
              },
            },
          ]
        );
      });
    } catch {
      return false;
    }
  };

  const requestStoragePermission = async () => {
    try {
      if (Platform.OS !== 'android') return true;
      if (Platform.Version >= 33) {
        const permissions = [
          PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES,
          PermissionsAndroid.PERMISSIONS.READ_MEDIA_VIDEO,
          PermissionsAndroid.PERMISSIONS.READ_MEDIA_AUDIO,
        ].filter(p => typeof p === 'string');
        const results = await PermissionsAndroid.requestMultiple(permissions);
        return Object.values(results).every(s => s === PermissionsAndroid.RESULTS.GRANTED);
      } else {
        return (
          (await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE))
          === PermissionsAndroid.RESULTS.GRANTED
        );
      }
    } catch {
      return false;
    }
  };

  return { checkAllFilesAccess, requestStoragePermission };
};
