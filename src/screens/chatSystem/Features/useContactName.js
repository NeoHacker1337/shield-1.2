import { useState, useEffect } from 'react';
import { Platform, PermissionsAndroid } from 'react-native';
import Contacts from 'react-native-contacts';

const useContactName = ({ chatRoom, currentUser }) => {
  const [localContactName, setLocalContactName] = useState(null);

  useEffect(() => {
    const resolveLocalContactName = async () => {
      try {
        if (!chatRoom || !currentUser) return;

        // Step 1: Find the other participant's email from chatRoom
        let participantEmail = null;
        if (
          chatRoom.participants &&
          Array.isArray(chatRoom.participants) &&
          currentUser.id
        ) {
          const otherParticipant = chatRoom.participants.find(
            (p) => p && p.id !== currentUser.id
          );
          participantEmail =
            otherParticipant?.email ||
            otherParticipant?.email_address ||
            otherParticipant?.emailAddress;
        }

        // Step 2: If no email found, skip resolution
        if (!participantEmail) {
          setLocalContactName(null);
          return;
        }

        // Step 3: Request READ_CONTACTS permission on Android
        let hasPermission = true;
        if (Platform.OS === 'android') {
          const result = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.READ_CONTACTS
          );
          hasPermission = result === PermissionsAndroid.RESULTS.GRANTED;
        }

        if (!hasPermission) {
          setLocalContactName(null);
          return;
        }

        // Step 4: Fetch all device contacts and match by email
        const deviceContacts = await Contacts.getAll();
        const emailLower = participantEmail.trim().toLowerCase();

        const match = deviceContacts.find(
          (c) =>
            Array.isArray(c.emailAddresses) &&
            c.emailAddresses.some(
              (e) => e.email && e.email.trim().toLowerCase() === emailLower
            )
        );

        // Step 5: Extract display name from matched contact
        if (match && (match.displayName || match.givenName || match.familyName)) {
          const name =
            match.displayName ||
            [match.givenName, match.familyName].filter(Boolean).join(' ');
          if (name && name.trim()) {
            setLocalContactName(name.trim());
            return;
          }
        }

        // Step 6: No match found
        setLocalContactName(null);
      } catch (err) {
        console.log('Local contact name resolution failed:', err);
        setLocalContactName(null);
      }
    };

    resolveLocalContactName();
  }, [chatRoom, currentUser]);

  return { localContactName };
};

export default useContactName;