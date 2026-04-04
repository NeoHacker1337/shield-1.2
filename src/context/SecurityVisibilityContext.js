import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SECURITY_HIDE_ENABLED_KEY = 'security_hide_enabled';

const SecurityVisibilityContext = createContext({
  securityHidden: false,
  setSecurityHidden: () => {},
});

export const SecurityVisibilityProvider = ({ children }) => {

  const [securityHidden, setSecurityHiddenState] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {

    const load = async () => {

      try {

        const val = await AsyncStorage.getItem(SECURITY_HIDE_ENABLED_KEY);

        setSecurityHiddenState(val === 'true');

      } catch {

        setSecurityHiddenState(false);

      } finally {

        setLoaded(true);

      }

    };

    load();

  }, []);

  
  const setSecurityHidden = async (value) => {

    try {

      await AsyncStorage.setItem(SECURITY_HIDE_ENABLED_KEY, String(value));

      setSecurityHiddenState(value);

    } catch {}

  };

  if (!loaded) return null;

  return (
    <SecurityVisibilityContext.Provider
      value={{ securityHidden, setSecurityHidden }}
    >
      {children}
    </SecurityVisibilityContext.Provider>
  );

};

export const useSecurityVisibility = () => useContext(SecurityVisibilityContext);