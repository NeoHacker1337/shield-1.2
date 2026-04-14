import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
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

const Stack = createNativeStackNavigator();

const ONBOARDING_KEY = 'shield_onboarding_completed';
const AUTH_SERVICE = 'shield-auth';

const App = () => {
  const [isReady, setIsReady] = useState(false);

  const [hasOnboarded, setHasOnboarded] = useState(false);
  const [hasCredentials, setHasCredentials] = useState(false);
  const [isActivated, setIsActivated] = useState(false);

  const [hasToken, setHasToken] = useState(false);
  const [hasPasscode, setHasPasscode] = useState(false);
  const [isUnlocked, setIsUnlocked] = useState(false);

  /* 🔁 SINGLE BOOTSTRAP — ACTIVATION SAFE */
  useEffect(() => {
    const bootstrap = async () => {
      try {
        await migrateToHashedPasswords();
        // Onboarding
        const onboardFlag = await AsyncStorage.getItem(ONBOARDING_KEY);
        setHasOnboarded(onboardFlag === 'true');

        // Credentials
        const credentials = await Keychain.getGenericPassword({
          service: AUTH_SERVICE,
        });
        setHasCredentials(!!credentials);

        // Token
        const token = await AsyncStorage.getItem('auth_token');
        setHasToken(!!token);

        // ✅ ACTIVATION (LICENSE-BASED — SINGLE SOURCE OF TRUTH)
        const activated = await isUserActivated();
        setIsActivated(activated);

        // Passcode
        if (token) {
          const passcodeExists = await AuthService.hasPasscode();
          setHasPasscode(passcodeExists);
        }
      } catch (e) {
        console.error('❌ App bootstrap failed:', e);
      } finally {
        setIsReady(true);
      }
    };

    bootstrap();
  }, []);

  /* 🔒 LOCK APP WHEN BACKGROUNDED */
  useEffect(() => {
    const sub = AppState.addEventListener('change', state => {
      if (state !== 'active') {
        setIsUnlocked(false);
      }
    });

    return () => sub.remove();
  }, []);

  if (!isReady) return null; // splash / loader

  /* 🧠 FINAL ROUTE DECISION — NO BYPASS POSSIBLE */
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
    <ChatVisibilityProvider>
      <SecurityVisibilityProvider>
        <NavigationContainer>
          <StatusBar barStyle="light-content" />

          <Stack.Navigator initialRouteName={initialRouteName}>
            {/* Onboarding */}
            <Stack.Screen name="OnBoarding" component={OnBoardingScreen} options={{ headerShown: false }} />
            <Stack.Screen name="SetPassword" component={SetPasswordScreen} options={{ headerShown: false }} />
            <Stack.Screen name="SecurityQuestions" component={SecurityQuestionsScreen} options={{ headerShown: false }} />

            {/* Auth / Lock */}
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

            {/* Activation */}

            <Stack.Screen name="Activation" component={ActivationScreen} options={{ gestureEnabled: false }} />

            {/* Main App */}
            <Stack.Screen name="MainTabs" component={BottomTabNavigator} options={{ headerShown: false }} />
            <Stack.Screen name="Settings" component={SettingScreen} options={{ headerShown: false }} />
            <Stack.Screen name="Security" component={SecurityScreen} options={{ headerShown: false }} />
            <Stack.Screen name="FileLocker" component={FileLockerScreen} options={{ headerShown: false }} />
            <Stack.Screen name="ShowSecurityQuestion" component={ShowSecurityQuestionScreen} options={{ headerShown: false }} />
            <Stack.Screen name="ChatScreen" component={ChatScreen} options={{ headerShown: false }} />
            <Stack.Screen name="Profile" component={ProfileScreen} options={{ headerShown: false }} />

            {/* Extras */}
            <Stack.Screen name="GetPremium" component={GetPremiumScreen} options={{ headerShown: false }} />
            <Stack.Screen name="Feedback" component={FeedbackScreen} options={{ headerShown: false }} />
            <Stack.Screen name="AboutUs" component={AboutUsScreen} options={{ headerShown: false }} />
            <Stack.Screen name="SupportDetails" component={SupportDetailsScreen} options={{ title: 'Support & Helpline', headerTintColor: '#ffffff', headerStyle: { backgroundColor: '#0a0a0a' }, }} />
            <Stack.Screen name="FileViewer" component={FileViewerScreen} options={({ route }) => ({ title: route.params?.filePath?.split('/')?.pop() || 'File Viewer', })} />
            <Stack.Screen name="FileBrowser" component={FileBrowserScreen} options={{ headerShown: false }} />
            <Stack.Screen name="LockedChats" component={LockedChatsScreen} options={{ headerShown: false }} />
            <Stack.Screen name="RecoverPin" component={RecoverPinScreen} options={{ headerShown: false }} />
            <Stack.Screen name="Restore" component={RestoreScreen} options={{ headerShown: false }} />
            <Stack.Screen name="StorageData" component={StorageDataScreen} options={{ headerShown: false }} />
            <Stack.Screen name="AllInvitations" component={AllInvitationsScreen} options={{ headerShown: false }} />
          </Stack.Navigator>
        </NavigationContainer>
      </SecurityVisibilityProvider>
    </ChatVisibilityProvider>
  );
};

export default App;
