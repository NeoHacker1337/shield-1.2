import React, { useState, useEffect, useRef } from 'react';
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import { StatusBar, AppState } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Keychain from 'react-native-keychain';

import AuthService from './src/services/AuthService';
import { isUserActivated } from './src/utils/activationGuard';
import { ChatVisibilityProvider } from './src/context/ChatVisibilityContext';
import { SecurityVisibilityProvider } from './src/context/SecurityVisibilityContext';
import { migrateToHashedPasswords } from './src/services/MigratePasswords';

/* Screens */
import OnBoardingScreen from './src/screens/onBoarding/OnBoardingScreen';
import SetPasswordScreen from './src/screens/onBoarding/SetPasswordScreen';
import SecurityQuestionsScreen from './src/screens/onBoarding/SecurityQuestionsScreen';
import PasswordEntryScreen from './src/screens/Auth/PasswordEntryScreen';
import PasswordRecoveryScreen from './src/screens/Auth/PasswordRecoveryScreen';
import BottomTabNavigator from './src/navigation/BottomTabNavigator';
import SettingScreen from './src/screens/Dashboard/SettingScreen';
import SecurityScreen from './src/screens/Dashboard/SecurityScreen';
import FileLockerScreen from './src/screens/Dashboard/FileLockerScreen';
import ShowSecurityQuestionScreen from './src/screens/Dashboard/ShowSecurityQuestionScreen';
import ChatScreen from './src/screens/Dashboard/ChatScreen';
import Chat from './src/screens/Dashboard/ChatSystemScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import ActivationScreen from './src/screens/ActivationScreen';
import GetPremiumScreen from './src/screens/GetPremiumScreen';
import FeedbackScreen from './src/screens/FeedbackScreen';
import AboutUsScreen from './src/screens/AboutUsScreen';
import FileViewerScreen from './src/screens/FileViewerScreen';
import SupportDetailsScreen from './src/screens/SupportDetailsScreen';
import FileBrowserScreen from './src/screens/FileBrowserScreen';
import LockedChatsScreen from './src/screens/Dashboard/LockedChatsScreen';
import RecoverPinScreen from './src/screens/Auth/RecoverPinScreen';
import RestoreScreen from './src/screens/FileLocker/RestoreScreen';
import StorageDataScreen from './src/screens/FileLocker/StorageDataScreen';
import AllInvitationsScreen from './src/screens/Dashboard/AllInvitationsScreen';
import ScanScreen from './src/screens/Dashboard/ScanScreen';
import ReferralQrScreen from './src/screens/ReferralQrScreen';
import ShareProfileScreen from './src/screens/ShareProfileScreen';
import ContactProfileScreen from './src/screens/ContactProfileScreen';

/* Call Screens */
import AudioCallScreen from './src/screens/AudioCallScreen';
import IncomingCallScreen from './src/screens/IncomingCallScreen';

/* Global Call System */
import { ActiveRoomProvider, useActiveRoom } from './src/context/ActiveRoomContext';
import useGlobalCallListener from './src/hooks/useGlobalCallListener';
import chatService from './src/services/chatService';

const Stack = createNativeStackNavigator();

/* ✅ GLOBAL NAVIGATION REF (FIX) */
export const globalNavigationRef = createNavigationContainerRef();

const ONBOARDING_KEY = 'shield_onboarding_completed';
const AUTH_SERVICE = 'shield-auth';

/* ───────────────────────────────────────────── */

const AppNavigator = ({
  hasOnboarded,
  hasCredentials,
  isActivated,
  hasPasscode,
  isUnlocked,
  setIsUnlocked,
}) => {
  const navigationRef = globalNavigationRef;
  const [globalUserId, setGlobalUserId] = useState(null);
  const { activeRoomId } = useActiveRoom();

  /* Load user ID */
  useEffect(() => {
    AsyncStorage.getItem('current_user_id').then(id => {
      if (id) {
        setGlobalUserId(parseInt(id, 10));
        console.log('[AppNavigator] Global userId loaded:', id);
      }
    });
  }, []);

  /* Load rooms globally (FIXED SAFE VERSION) */
  useEffect(() => {
    const loadRooms = async () => {
      try {
        const roomsRes = await chatService.getChatRooms();

        const rooms = Array.isArray(roomsRes?.data)
          ? roomsRes.data
          : Array.isArray(roomsRes)
            ? roomsRes
            : [];

        const ids = rooms.map(r => String(r.id));

        await AsyncStorage.setItem('watched_room_ids', JSON.stringify(ids));

        console.log('[AppNavigator] Rooms loaded globally:', ids);
      } catch (e) {
        console.log('[AppNavigator] Failed to load rooms:', e?.message);
      }
    };

    if (globalUserId) {
      loadRooms();
    }
  }, [globalUserId]);

  /* GLOBAL CALL LISTENER */
  useGlobalCallListener({
    navigationRef,
    currentUserId: globalUserId,
    activeRoomId,
  });

  const initialRouteName =
    !hasOnboarded
      ? 'OnBoarding'
      : !hasCredentials
        ? 'PasswordEntry'
        : !isActivated
          ? 'Activation'
          : hasPasscode && !isUnlocked
            ? 'PasswordEntry'
            : 'MainTabs';

  return (
    <NavigationContainer ref={navigationRef}>
      <StatusBar barStyle="light-content" />

      <Stack.Navigator initialRouteName={initialRouteName}>

        <Stack.Screen name="OnBoarding" component={OnBoardingScreen} options={{ headerShown: false }} />
        <Stack.Screen name="SetPassword" component={SetPasswordScreen} options={{ headerShown: false }} />
        <Stack.Screen name="SecurityQuestions" component={SecurityQuestionsScreen} options={{ headerShown: false }} />

        <Stack.Screen name="PasswordEntry" options={{ headerShown: false }}>
          {(props) => (
            <PasswordEntryScreen
              {...props}
              lockMode={hasPasscode && !isUnlocked}
              onUnlocked={() => setIsUnlocked(true)}
            />
          )}
        </Stack.Screen>

        <Stack.Screen name="PasswordRecovery" component={PasswordRecoveryScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Activation" component={ActivationScreen} options={{ gestureEnabled: false }} />

        <Stack.Screen name="MainTabs" component={BottomTabNavigator} options={{ headerShown: false }} />
        <Stack.Screen name="Settings" component={SettingScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Security" component={SecurityScreen} options={{ headerShown: false }} />
        <Stack.Screen name="FileLocker" component={FileLockerScreen} options={{ headerShown: false }} />
        <Stack.Screen name="ShowSecurityQuestion" component={ShowSecurityQuestionScreen} options={{ headerShown: false }} />
        <Stack.Screen name="ChatScreen" component={ChatScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Chat" component={Chat} options={{ headerShown: false }} />
        <Stack.Screen name="Profile" component={ProfileScreen} options={{ headerShown: false }} />

        <Stack.Screen name="GetPremium" component={GetPremiumScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Feedback" component={FeedbackScreen} options={{ headerShown: false }} />
        <Stack.Screen name="AboutUs" component={AboutUsScreen} options={{ headerShown: false }} />

        <Stack.Screen name="SupportDetails" component={SupportDetailsScreen} />
        <Stack.Screen name="FileViewer" component={FileViewerScreen} />
        <Stack.Screen name="FileBrowser" component={FileBrowserScreen} options={{ headerShown: false }} />
        <Stack.Screen name="LockedChats" component={LockedChatsScreen} options={{ headerShown: false }} />
        <Stack.Screen name="RecoverPin" component={RecoverPinScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Restore" component={RestoreScreen} options={{ headerShown: false }} />
        <Stack.Screen name="StorageData" component={StorageDataScreen} options={{ headerShown: false }} />
        <Stack.Screen name="AllInvitations" component={AllInvitationsScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Scan" component={ScanScreen} options={{ headerShown: false }} />
        <Stack.Screen name="ReferralQrScreen" component={ReferralQrScreen} options={{ headerShown: false }} />
        <Stack.Screen name="ShareProfileScreen" component={ShareProfileScreen} options={{ headerShown: false }} />
        <Stack.Screen name="ContactProfile" component={ContactProfileScreen} options={{ headerShown: false }} />

        {/* CALL SCREENS */}
        <Stack.Screen
          name="IncomingCall"
          component={IncomingCallScreen}
          options={{
            presentation: 'fullScreenModal',
            headerShown: false,
            gestureEnabled: false,
          }}
        />

        <Stack.Screen
          name="AudioCall"
          component={AudioCallScreen}
          options={{
            presentation: 'fullScreenModal',
            headerShown: false,
            gestureEnabled: false,
          }}
        />

      </Stack.Navigator>
    </NavigationContainer>
  );
};

/* ───────────────────────────────────────────── */

const App = () => {
  const [isReady, setIsReady] = useState(false);
  const [hasOnboarded, setHasOnboarded] = useState(false);
  const [hasCredentials, setHasCredentials] = useState(false);
  const [isActivated, setIsActivated] = useState(false);
  const [hasToken, setHasToken] = useState(false);
  const [hasPasscode, setHasPasscode] = useState(false);
  const [isUnlocked, setIsUnlocked] = useState(false);

  useEffect(() => {
    const bootstrap = async () => {
      try {
        await migrateToHashedPasswords();

        const onboardFlag = await AsyncStorage.getItem(ONBOARDING_KEY);
        setHasOnboarded(onboardFlag === 'true');

        const credentials = await Keychain.getGenericPassword({ service: AUTH_SERVICE });
        setHasCredentials(!!credentials);

        const token = await AsyncStorage.getItem('auth_token');
        setHasToken(!!token);

        const activated = await isUserActivated();
        setIsActivated(activated);

        if (token) {
          const passcodeExists = await AuthService.hasPasscode();
          setHasPasscode(passcodeExists);
        }

        if (token) {
          try {
            const user = await AuthService.getCurrentUser();
            if (user?.id) {
              await AsyncStorage.setItem('current_user_id', String(user.id));
              console.log('[App] Saved current_user_id on bootstrap:', user.id);
            }
          } catch (e) {
            console.log('[App] Could not save current_user_id:', e?.message);
          }
        }
      } catch (e) {
        console.error('❌ App bootstrap failed:', e);
      } finally {
        setIsReady(true);
      }
    };

    bootstrap();
  }, []);

  useEffect(() => {
    const sub = AppState.addEventListener('change', state => {
      if (state !== 'active') {
        setIsUnlocked(false);
      }
    });
    return () => sub.remove();
  }, []);

  if (!isReady) return null;

  return (
    <ChatVisibilityProvider>
      <SecurityVisibilityProvider>
        <ActiveRoomProvider>
          <AppNavigator
            hasOnboarded={hasOnboarded}
            hasCredentials={hasCredentials}
            isActivated={isActivated}
            hasPasscode={hasPasscode}
            isUnlocked={isUnlocked}
            setIsUnlocked={setIsUnlocked}
          />
        </ActiveRoomProvider>
      </SecurityVisibilityProvider>
    </ChatVisibilityProvider>
  );
};

export default App;
