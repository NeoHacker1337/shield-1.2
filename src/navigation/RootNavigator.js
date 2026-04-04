// App.js or navigation/RootNavigator.js
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import FileBrowserScreen from './screens/FileBrowserScreen';
import FileViewerScreen from './screens/FileViewerScreen';
import SecurityQuestionsScreen from '../screens/onBoarding/SecurityQuestionsScreen';
import RestoreScreen from '../screens/FileLocker/RestoreScreen';
const Stack = createNativeStackNavigator();

const App = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: '#0B1724' },
          headerTintColor: '#FFFFFF',
        }}
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
        <Stack.Screen name="Restore" component={RestoreScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default App;
