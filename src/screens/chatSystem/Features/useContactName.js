import { useState, useEffect, useRef, useCallback } from 'react';
import { Platform, PermissionsAndroid } from 'react-native';
import Contacts from 'react-native-contacts';

// ─────────────────────────────────────────────────────────────────
// MODULE-LEVEL CACHE
// Persists across hook instances for the app session.
// Key: participantEmail (lowercase), Value: resolved name or null
// ─────────────────────────────────────────────────────────────────
const contactNameCache = new Map();

// ─────────────────────────────────────────────────────────────────
// PERMISSION HELPER
// Checks permission first, requests only if not yet determined.
// Handles both Android and iOS correctly.
// ─────────────────────────────────────────────────────────────────

/**
 * Returns true if READ_CONTACTS permission is granted.
 * On Android: checks first, requests only if not yet granted/denied.
 * On iOS: requests permission via Contacts API (required on iOS too).
 *
 * @returns {Promise<boolean>}
 */
const requestContactsPermission = async () => {
  if (Platform.OS === 'android') {
    // Check current status before requesting to avoid repeat dialogs
    const current = await PermissionsAndroid.check(
      PermissionsAndroid.PERMISSIONS.READ_CONTACTS
    );

    if (current) return true;

    // Only show dialog if permission hasn't been determined yet
    const result = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.READ_CONTACTS,
      {
        title: 'Contacts Permission',
        message: 'This app needs access to your contacts to show contact names.',
        buttonPositive: 'Allow',
        buttonNegative: 'Deny',
      }
    );

    return result === PermissionsAndroid.RESULTS.GRANTED;
  }

  if (Platform.OS === 'ios') {
    // iOS requires explicit permission request through Contacts API
    try {
      const permission = await Contacts.requestPermission();
      return permission === 'authorized';
    } catch {
      return false;
    }
  }

  // Other platforms (web, etc.) — skip
  return false;
};

// ─────────────────────────────────────────────────────────────────
// EMAIL EXTRACTOR
// Safely extracts email from a participant object,
// checking all known field name variants.
// ─────────────────────────────────────────────────────────────────

/**
 * Extracts email address from a participant object.
 * Checks all known field name variants used by different backends.
 *
 * @param {object} participant
 * @returns {string|null}
 */
const extractParticipantEmail = (participant) => {
  if (!participant) return null;

  const email =
    participant.email ||
    participant.email_address ||
    participant.emailAddress ||
    participant.contact_email ||
    null;

  const trimmed = email?.trim();
  return trimmed || null;
};

// ─────────────────────────────────────────────────────────────────
// PHONE EXTRACTOR
// Extracts phone number as a fallback matching strategy.
// ─────────────────────────────────────────────────────────────────

/**
 * Extracts phone number from a participant object.
 * Strips non-digit characters for comparison.
 *
 * @param {object} participant
 * @returns {string|null}
 */
const extractParticipantPhone = (participant) => {
  if (!participant) return null;

  const phone =
    participant.phone ||
    participant.phone_number ||
    participant.phoneNumber ||
    participant.mobile ||
    null;

  if (!phone) return null;

  // Normalize: keep digits only for comparison
  const digits = phone.replace(/\D/g, '');
  return digits.length >= 7 ? digits : null;
};

// ─────────────────────────────────────────────────────────────────
// CONTACT MATCHER
// Matches a device contact by email or phone number.
// ─────────────────────────────────────────────────────────────────

/**
 * Searches device contacts for a match by email address.
 * Falls back to phone number matching if email not found.
 *
 * @param {object[]} deviceContacts - All device contacts
 * @param {string|null} email       - Participant email (lowercase)
 * @param {string|null} phone       - Participant phone digits only
 * @returns {object|null} Matched contact or null
 */
const findContactMatch = (deviceContacts, email, phone) => {
  if (!Array.isArray(deviceContacts) || deviceContacts.length === 0) {
    return null;
  }

  // Primary: match by email
  if (email) {
    const emailMatch = deviceContacts.find(
      (c) =>
        Array.isArray(c.emailAddresses) &&
        c.emailAddresses.some(
          (e) =>
            e?.email &&
            e.email.trim().toLowerCase() === email
        )
    );
    if (emailMatch) return emailMatch;
  }

  // Fallback: match by phone number (digits only comparison)
  if (phone) {
    const phoneMatch = deviceContacts.find(
      (c) =>
        Array.isArray(c.phoneNumbers) &&
        c.phoneNumbers.some((p) => {
          if (!p?.number) return false;
          const digits = p.number.replace(/\D/g, '');
          // Match last 10 digits to handle country code differences
          return (
            digits.endsWith(phone.slice(-10)) ||
            phone.endsWith(digits.slice(-10))
          );
        })
    );
    if (phoneMatch) return phoneMatch;
  }

  return null;
};

// ─────────────────────────────────────────────────────────────────
// NAME EXTRACTOR
// Extracts best display name from a matched contact.
// ─────────────────────────────────────────────────────────────────

/**
 * Extracts the best display name from a device contact object.
 *
 * @param {object} contact - Device contact from react-native-contacts
 * @returns {string|null}
 */
const extractContactName = (contact) => {
  if (!contact) return null;

  // Priority 1: displayName (pre-formatted full name)
  const displayName = contact.displayName?.trim();
  if (displayName) return displayName;

  // Priority 2: Combine given + family name
  const parts = [contact.givenName, contact.middleName, contact.familyName]
    .map((p) => p?.trim())
    .filter(Boolean);

  if (parts.length > 0) return parts.join(' ');

  // Priority 3: Company/organization name
  const company = contact.company?.trim();
  if (company) return company;

  return null;
};

// ─────────────────────────────────────────────────────────────────
// HOOK
// ─────────────────────────────────────────────────────────────────

/**
 * useContactName
 *
 * Resolves the local device contact name for the other participant
 * in a chat room. Matches by email first, phone number second.
 *
 * Features:
 * - Module-level result caching (no repeated contacts fetches)
 * - Permission check before request (no repeated permission dialogs)
 * - iOS + Android permission handling
 * - Mounted ref guard (no state updates after unmount)
 * - Stable effect deps (uses IDs not full objects)
 *
 * @param {object} chatRoom    - Chat room object with participants array
 * @param {object} currentUser - Currently logged-in user
 * @returns {{ localContactName: string|null, isResolving: boolean }}
 */
const useContactName = ({ chatRoom, currentUser }) => {
  const [localContactName, setLocalContactName] = useState(null);
  const [isResolving, setIsResolving] = useState(false);
  const mountedRef = useRef(true);

  // Track mounted state to prevent state updates after unmount
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // ── Stable dependency extraction ────────────────────────────────
  // Use primitive IDs instead of full objects to prevent effect
  // re-running when parent creates new object references
  const chatRoomId = chatRoom?.id;
  const currentUserId = currentUser?.id;

  // ── Main resolution effect ───────────────────────────────────────
  useEffect(() => {
    if (!chatRoomId || !currentUserId) {
      setLocalContactName(null);
      return;
    }

    const resolveLocalContactName = async () => {
      if (!mountedRef.current) return;

      setIsResolving(true);

      try {
        // ── Step 1: Find the other participant ─────────────────────
        const participants = chatRoom?.participants;

        if (!Array.isArray(participants) || participants.length === 0) {
          if (mountedRef.current) {
            setLocalContactName(null);
            setIsResolving(false);
          }
          return;
        }

        // String comparison to handle type mismatch (string vs number IDs)
        const otherParticipant = participants.find(
          (p) => p && String(p.id) !== String(currentUserId)
        );

        if (!otherParticipant) {
          if (mountedRef.current) {
            setLocalContactName(null);
            setIsResolving(false);
          }
          return;
        }

        // ── Step 2: Extract contact identifiers ────────────────────
        const participantEmail = extractParticipantEmail(otherParticipant);
        const participantPhone = extractParticipantPhone(otherParticipant);

        // No identifiers to match against
        if (!participantEmail && !participantPhone) {
          if (mountedRef.current) {
            setLocalContactName(null);
            setIsResolving(false);
          }
          return;
        }

        // ── Step 3: Check module-level cache ───────────────────────
        // Cache key uses both email and phone for uniqueness
        const cacheKey = `${participantEmail || ''}_${participantPhone || ''}`;

        if (contactNameCache.has(cacheKey)) {
          const cachedName = contactNameCache.get(cacheKey);
          if (mountedRef.current) {
            setLocalContactName(cachedName);
            setIsResolving(false);
          }
          return;
        }

        // ── Step 4: Request contacts permission ────────────────────
        const hasPermission = await requestContactsPermission();

        if (!mountedRef.current) return;

        if (!hasPermission) {
          contactNameCache.set(cacheKey, null); // cache denial result
          setLocalContactName(null);
          setIsResolving(false);
          return;
        }

        // ── Step 5: Fetch device contacts ──────────────────────────
        const deviceContacts = await Contacts.getAll();

        if (!mountedRef.current) return;

        // ── Step 6: Find matching contact ──────────────────────────
        const emailLower = participantEmail?.toLowerCase() ?? null;
        const match = findContactMatch(deviceContacts, emailLower, participantPhone);

        // ── Step 7: Extract name from match ────────────────────────
        const resolvedName = extractContactName(match);
        const finalName = resolvedName?.trim() || null;

        // Cache the result (including null) to prevent future lookups
        contactNameCache.set(cacheKey, finalName);

        if (mountedRef.current) {
          setLocalContactName(finalName);
          setIsResolving(false);
        }
      } catch (err) {
        // Distinguish between expected and unexpected errors
        if (err?.message?.includes('denied') || err?.message?.includes('permission')) {
          // Expected: permission denied — silent
          console.warn('useContactName: contacts permission denied');
        } else {
          // Unexpected: log for debugging
          console.warn('useContactName: resolution failed —', err?.message || err);
        }

        if (mountedRef.current) {
          setLocalContactName(null);
          setIsResolving(false);
        }
      }
    };

    resolveLocalContactName();
  }, [chatRoomId, currentUserId]); // ✅ Stable primitive deps — no object reference issues

  return { localContactName, isResolving };
};

export default useContactName;