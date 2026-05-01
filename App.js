import React, { useState, useEffect, useRef } from 'react';
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import { StatusBar, AppState } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
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
import MediaLinksDocsScreen from './src/screens/MediaLinksDocsScreen';
import ContactProfileScreen from './src/screens/ContactProfileScreen';

/* Call Screens */
import AudioCallScreen from './src/screens/AudioCallScreen';
import IncomingCallScreen from './src/screens/IncomingCallScreen';

/* Video Call Screen */
import VideoCallScreen from './src/screens/VideoCallScreen';
import IncomingVideoCallScreen from './src/screens/IncomingVideoCallScreen';

/* Global Call System */
import { ActiveRoomProvider, useActiveRoom } from './src/context/ActiveRoomContext';
import useGlobalCallListener from './src/hooks/useGlobalCallListener';
import useGlobalVideoCallListener from './src/hooks/useGlobalVideoCallListener';

import chatService from './src/services/chatService';

const Stack = createNativeStackNavigator();

/* ✅ GLOBAL NAVIGATION REF */
export const globalNavigationRef = createNavigationContainerRef();

const ONBOARDING_KEY = 'shield_onboarding_completed';
const AUTH_SERVICE = 'shield-auth';

/* ─────────────────────────────────────────────────────────────────────────── */

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

  // ── Load user ID on mount AND whenever auth state might change ────────────
  useEffect(() => {
    const loadUserId = async () => {
      try {
        // Try AsyncStorage first (fastest)
        const cachedId = await AsyncStorage.getItem('current_user_id');
        if (cachedId) {
          setGlobalUserId(parseInt(cachedId, 10));
          console.log('[AppNavigator] UserId from cache:', cachedId);
          return;
        }

        // Fallback: fetch from auth service
        const user = await AuthService.getCurrentUser();
        if (user?.id) {
          await AsyncStorage.setItem('current_user_id', String(user.id));
          setGlobalUserId(user.id);
          console.log('[AppNavigator] UserId from auth service:', user.id);
        }
      } catch (e) {
        console.log('[AppNavigator] Failed to load userId:', e?.message);
      }
    };

    loadUserId();
  }, []);

  // ── Load rooms globally so the call listener has rooms immediately ─────────
  useEffect(() => {
    if (!globalUserId) return;

    const loadRooms = async () => {
      try {
        const roomsRes = await chatService.getChatRooms();
        const rooms = Array.isArray(roomsRes?.data)
          ? roomsRes.data
          : Array.isArray(roomsRes)
            ? roomsRes
            : [];

        if (rooms.length > 0) {
          const ids = rooms.map(r => String(r.id));
          await AsyncStorage.setItem('watched_room_ids', JSON.stringify(ids));
          console.log('[AppNavigator] Rooms loaded globally:', ids.length);
        }
      } catch (e) {
        console.log('[AppNavigator] Failed to load rooms:', e?.message);
      }
    };

    loadRooms();
  }, [globalUserId]);

  // ── Global call listener — now truly global ────────────────────────────────
  useGlobalCallListener({
    navigationRef,
    currentUserId: globalUserId,
    activeRoomId,
  });

  useGlobalVideoCallListener({
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
    <>
      <StatusBar barStyle="light-content" />
      <Stack.Navigator
        initialRouteName={initialRouteName}
        screenOptions={{ headerShown: false }}>

        {/* Onboarding */}
        <Stack.Screen name="OnBoarding" component={OnBoardingScreen} />
        <Stack.Screen name="SetPassword" component={SetPasswordScreen} />
        <Stack.Screen name="SecurityQuestions" component={SecurityQuestionsScreen} />

        {/* Auth */}
        <Stack.Screen name="PasswordEntry">
          {(props) => (
            <PasswordEntryScreen
              {...props}
              onUnlock={() => setIsUnlocked(true)}
            />
          )}
        </Stack.Screen>
        <Stack.Screen name="PasswordRecovery" component={PasswordRecoveryScreen} />
        <Stack.Screen name="RecoverPin" component={RecoverPinScreen} />

        {/* Activation */}
        <Stack.Screen name="Activation" component={ActivationScreen} />

        {/* Main App */}
        <Stack.Screen name="MainTabs" component={BottomTabNavigator} />
        <Stack.Screen name="Settings" component={SettingScreen} />
        <Stack.Screen name="Security" component={SecurityScreen} />
        <Stack.Screen name="FileLocker" component={FileLockerScreen} />
        <Stack.Screen name="ShowSecurityQuestion" component={ShowSecurityQuestionScreen} />
        <Stack.Screen name="Chat" component={ChatScreen} />
        <Stack.Screen name="ChatSystem" component={Chat} />
        <Stack.Screen name="Profile" component={ProfileScreen} />
        <Stack.Screen name="GetPremium" component={GetPremiumScreen} />
        <Stack.Screen name="Feedback" component={FeedbackScreen} />
        <Stack.Screen name="AboutUs" component={AboutUsScreen} />
        <Stack.Screen name="FileViewer" component={FileViewerScreen} />
        <Stack.Screen name="SupportDetails" component={SupportDetailsScreen} />
        <Stack.Screen name="FileBrowser" component={FileBrowserScreen} />
        <Stack.Screen name="LockedChats" component={LockedChatsScreen} />
        <Stack.Screen name="Restore" component={RestoreScreen} />
        <Stack.Screen name="StorageData" component={StorageDataScreen} />
        <Stack.Screen name="AllInvitations" component={AllInvitationsScreen} />
        <Stack.Screen name="Scan" component={ScanScreen} />
        <Stack.Screen name="ReferralQr" component={ReferralQrScreen} />
        <Stack.Screen name="ShareProfile" component={ShareProfileScreen} />
        <Stack.Screen name="MediaLinksDocs" component={MediaLinksDocsScreen} />
        <Stack.Screen name="ContactProfile" component={ContactProfileScreen} />

        {/* Call Screens */}
        <Stack.Screen name="AudioCall" component={AudioCallScreen} />
        <Stack.Screen name="IncomingCall" component={IncomingCallScreen} />

        <Stack.Screen name="VideoCallScreen" component={VideoCallScreen} />
        <Stack.Screen name="IncomingVideoCallScreen" component={IncomingVideoCallScreen} />
      </Stack.Navigator>
    </>
  );
};

/* ─────────────────────────────────────────────────────────────────────────── */

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
            // ✅ Always save current_user_id on app start
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
    <SafeAreaProvider>
      <NavigationContainer ref={globalNavigationRef}>
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
      </NavigationContainer>
    </SafeAreaProvider>
  );
};

export default App;
