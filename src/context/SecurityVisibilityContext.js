/**
 * SecurityVisibilityContext.js
 *
 * Provides a global boolean flag — `securityHidden` — that controls whether
 * the Security section is visible in the app.
 *
 * Persistence:
 *   The flag is stored in AsyncStorage as a JSON boolean (`true` / `false`),
 *   consistent with the serialisation pattern used elsewhere in the codebase
 *   (e.g. `is_backup_restore_enabled`, `is_storage_data_enabled`) and with
 *   the sibling ChatVisibilityContext.
 *
 * Usage:
 *   1. Wrap your app (or the relevant subtree) with <SecurityVisibilityProvider>.
 *   2. Consume with the useSecurityVisibility() hook in any child component.
 *
 * @example
 *   const { securityHidden, setSecurityHidden } = useSecurityVisibility();
 *   await setSecurityHidden(true); // persists + updates state
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── Storage key ──────────────────────────────────────────────────────────────
const SECURITY_HIDE_ENABLED_KEY = 'security_hide_enabled';

// ─── Context ──────────────────────────────────────────────────────────────────
/**
 * Default context value used when a consumer is rendered outside a Provider.
 * The setter emits a warning so the misconfiguration is immediately visible
 * during development instead of silently doing nothing.
 */
const SecurityVisibilityContext = createContext({
  securityHidden: false,
  setSecurityHidden: async () => {
    console.warn(
      '[SecurityVisibilityContext] setSecurityHidden called outside of ' +
        '<SecurityVisibilityProvider>. Ensure the provider wraps your component tree.',
    );
  },
});

// ─── Provider ─────────────────────────────────────────────────────────────────
export const SecurityVisibilityProvider = ({ children }) => {
  const [securityHidden, setSecurityHiddenState] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // Load persisted value once on app start
  useEffect(() => {
    const load = async () => {
      try {
        const stored = await AsyncStorage.getItem(SECURITY_HIDE_ENABLED_KEY);

        if (stored !== null) {
          /*
            Parse as JSON boolean for consistency with the rest of the
            codebase which uses JSON.parse/JSON.stringify for AsyncStorage.
            Falls back gracefully if the stored value is not valid JSON
            (e.g. legacy 'true'/'false' strings from the old serialisation).
          */
          try {
            setSecurityHiddenState(JSON.parse(stored) === true);
          } catch {
            // Legacy string format fallback ('true' / 'false')
            setSecurityHiddenState(stored === 'true');
          }
        }
        // If stored === null the key has never been set; keep default (false)
      } catch (e) {
        console.warn(
          '[SecurityVisibilityContext] Failed to load persisted value:',
          e,
        );
        // Non-critical — keep the safe default (false)
        setSecurityHiddenState(false);
      } finally {
        setLoaded(true);
      }
    };

    load();
  }, []);

  /**
   * Updates both the in-memory state and the persisted AsyncStorage value.
   *
   * @param {boolean} value - The new visibility flag.
   *   Pass `true`  to hide the security section.
   *   Pass `false` to show the security section.
   *
   * Wrapped in useCallback so the function reference is stable across renders.
   * This prevents unnecessary re-renders in memo-ised consumers
   * (e.g. ToggleCard, SettingsScreen).
   *
   * Enforces boolean coercion so callers passing truthy/falsy non-booleans
   * (e.g. numeric 1 / 0) are still stored correctly.
   */
  const setSecurityHidden = useCallback(async (value) => {
    const boolValue = Boolean(value);

    try {
      await AsyncStorage.setItem(
        SECURITY_HIDE_ENABLED_KEY,
        JSON.stringify(boolValue),
      );
      setSecurityHiddenState(boolValue);
    } catch (e) {
      console.warn(
        '[SecurityVisibilityContext] Failed to persist security visibility:',
        e,
      );
      /*
        Still update in-memory state so the UI is responsive even if
        persistence fails. The value will revert to the last persisted
        state on next app launch, which is acceptable for this feature.
      */
      setSecurityHiddenState(boolValue);
    }
  }, []);

  /*
    Render children immediately with the default state (false) during the
    AsyncStorage read instead of returning null.

    Returning null caused a full blank-screen flash on every app launch
    while AsyncStorage was being read. Since the default value (false = visible)
    is a safe UI state, rendering children immediately is preferable.
    The state will update correctly once the read completes.
  */
  return (
    <SecurityVisibilityContext.Provider
      value={{ securityHidden, setSecurityHidden }}
    >
      {/*
        The `loaded` flag is preserved and available for consumers that
        genuinely need to defer rendering until the persisted value is known
        (e.g. to avoid a momentary flash of visible content before a "hidden"
        state is applied). Expose it through context if needed in the future.
      */}
      {children}
    </SecurityVisibilityContext.Provider>
  );
};

// ─── Hook ─────────────────────────────────────────────────────────────────────
/**
 * Consumes the SecurityVisibilityContext.
 *
 * Must be used within a <SecurityVisibilityProvider>.
 * Returns { securityHidden: boolean, setSecurityHidden: (value: boolean) => Promise<void> }
 */
export const useSecurityVisibility = () =>
  useContext(SecurityVisibilityContext);