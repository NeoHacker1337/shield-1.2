import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const CHAT_HIDE_ENABLED_KEY = 'chat_hide_enabled';

const ChatVisibilityContext = createContext({
  chatHidden: false,
  setChatHidden: () => {},
});

export const ChatVisibilityProvider = ({ children }) => {
  const [chatHidden, setChatHiddenState] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // Load persisted value once on app start
  useEffect(() => {
    const load = async () => {
      try {
        const val = await AsyncStorage.getItem(CHAT_HIDE_ENABLED_KEY);
        setChatHiddenState(val === 'true');
      } catch {
        setChatHiddenState(false);
      } finally {
        setLoaded(true);
      }
    };
    load();
  }, []);

  // Wrap setter so it always saves to AsyncStorage too
  const setChatHidden = async (value) => {
    try {
      await AsyncStorage.setItem(CHAT_HIDE_ENABLED_KEY, String(value));
      setChatHiddenState(value);
    } catch {}
  };

  if (!loaded) return null; // don't render until AsyncStorage is read

  return (
    <ChatVisibilityContext.Provider value={{ chatHidden, setChatHidden }}>
      {children}
    </ChatVisibilityContext.Provider>
  );
};

export const useChatVisibility = () => useContext(ChatVisibilityContext);
