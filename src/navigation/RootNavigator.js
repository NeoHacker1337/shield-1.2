/**
 * App.js
 *
 * Application root — mounts all required global providers and the
 * navigation stack. If you split into App.js + RootNavigator.js,
 * see Version B below.
 */

import React from 'react';
import { StatusBar } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import chatService from '../services/chatService';

// ── Screen imports ────────────────────────────────────────────────────────────
//
// ⚠️  PATH NOTE:
//   All paths below use './screens/...' which is correct when this file
//   lives at the project root (same level as the `screens/` folder).
//
//   If this file lives inside a `navigation/` subfolder, change all
//   './screens/...' to '../screens/...' consistently.
//
import FileBrowserScreen       from './screens/FileBrowserScreen';
import FileViewerScreen        from './screens/FileViewerScreen';
import SecurityQuestionsScreen from './screens/onBoarding/SecurityQuestionsScreen';
import RestoreScreen           from './screens/FileLocker/RestoreScreen';

// ── Theme ─────────────────────────────────────────────────────────────────────
import { Colors, Fonts } from './assets/theme';

// ─────────────────────────────────────────────────────────────────────────────

const Stack = createNativeStackNavigator();

/**
 * Shared header styles applied to every screen in the stack.
 * Centralised here so a single change updates all headers.
 */
const SHARED_SCREEN_OPTIONS = {
  headerStyle: {
    backgroundColor: Colors.backgroundDark,   // was: '#0B1724' (mismatched raw value)
  },
  headerTintColor:  Colors.textPrimary,        // was: '#FFFFFF' (raw value)
  headerTitleStyle: {
    fontFamily: Fonts.family.primary,          // was: missing — OS default font used
    fontWeight: Fonts.weight.bold,
    color:      Colors.textPrimary,
  },
};

// ─────────────────────────────────────────────────────────────────────────────

const App = () => {
  return (
    /**
     * SafeAreaProvider MUST wrap NavigationContainer at the app root.
     *
     * Bug fix: it was missing entirely. Every screen in this codebase calls
     * useSafeAreaInsets() — without SafeAreaProvider those calls silently
     * return { top: 0, bottom: 0 } on all devices, breaking all the
     * safe-area padding fixes applied across SecurityScreen, SettingsScreen, etc.
     */
    <SafeAreaProvider>

      {/**
        * StatusBar: set explicitly so the status bar matches the dark theme.
        * Without this, Android may show a white/grey status bar background
        * that clashes with the dark app header, especially when the drawer
        * overlay is visible.
        *
        * translucent={true} + backgroundColor="transparent" is the recommended
        * pattern when using react-native-safe-area-context — insets account for
        * the status bar height automatically.
        */}
      <StatusBar
        barStyle="light-content"
        backgroundColor="transparent"
        translucent={true}
      />

      <NavigationContainer>
        <Stack.Navigator
          /**
           * initialRouteName set explicitly — prevents accidental first-screen
           * changes if the screen list is reordered during development.
           */
          initialRouteName="FileBrowser"
          screenOptions={SHARED_SCREEN_OPTIONS}
        >

          <Stack.Screen
            name="FileBrowser"
            component={FileBrowserScreen}
            options={{ title: 'My Files' }}
          />

          <Stack.Screen
            name="FileViewer"
            component={FileViewerScreen}
            options={{ title: 'View File' }}
          />

          <Stack.Screen
            name="SecurityQuestionsScreen"
            component={SecurityQuestionsScreen}
            options={{ headerShown: false }}
          />

          {/* Bug fix: was missing `options` entirely — title defaulted to "Restore" */}
          <Stack.Screen
            name="Restore"
            component={RestoreScreen}
            options={{ title: 'Backup & Restore' }}
          />

        </Stack.Navigator>
      </NavigationContainer>

    </SafeAreaProvider>
  );
};

export default App;