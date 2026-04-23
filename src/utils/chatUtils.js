// src/utils/chatUtils.js

/**
 * Get display name for chat room or contact
 * @param {Object} room - Chat room object
 * @param {Object} user - Current logged-in user
 * @param {Object} localRoomNames - Optional local overrides (default {})
 * @returns {string}
 */
export const getDisplayNameFromChatRoom = (
  room,
  user,
  localRoomNames = {}
) => {
  // 1. Local override (highest priority)
  if (localRoomNames?.[room?.id]) {
    return localRoomNames[room.id];
  }

  // 2. One-to-one chat → show other participant
  if (Array.isArray(room?.participants) && user?.id) {
    const other = room.participants.find(
      (p) => p && p.id !== user.id
    );

    const otherName =
      other?.name?.trim() || other?.username?.trim();

    if (otherName) return otherName;
  }

  // 3. Group name
  if (room?.name?.trim()) {
    return room.name;
  }

  // 4. Fallback
  return 'Unknown Contact';
};