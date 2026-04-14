// ╔══════════════════════════════════════════════════════════════╗
// ║ FILE: src/screens/chatSystem/Features/useEmojiPicker.js     ║
// ╚══════════════════════════════════════════════════════════════╝

import { useState, useCallback, useMemo } from 'react';

// ─────────────────────────────────────────────────────────────────
// EMOJI DATA
// Defined at module level — never recreated on render
// ─────────────────────────────────────────────────────────────────

/**
 * All emoji categories with their emoji arrays.
 * Duplicates across categories have been removed.
 */
export const emojiCategories = {
  smileys: [
    '😀', '😁', '😂', '🤣', '😃', '😄', '😅', '😆',
    '😉', '😊', '😋', '😎', '😍', '🥰', '😘', '😗',
    '🤩', '😏', '😒', '😞', '😔', '😟', '😕', '🙁',
    '😣', '😖', '😫', '😩', '🥺', '😢', '😭', '😤',
    '😠', '😡', '🤬', '🤯', '😳', '🥵', '🥶', '😱',
    '😨', '😰', '😥', '😓', '🤗', '🤔', '🤭', '🤫',
    '🤥', '😶', '😐', '😑', '😬', '🙄', '😯', '😦',
    '😧', '😮', '😲', '🥱', '😴', '🤤', '😪', '😵',
    '🤐', '🥴', '🤢', '🤮', '🤧', '😷', '🤒', '🤕',
  ],

  gestures: [
    '👍', '👎', '👌', '🤌', '🤏', '✌️', '🤞', '🤟',
    '🤘', '🤙', '👈', '👉', '👆', '👇', '☝️', '👋',
    '🤚', '🖐️', '✋', '🖖', '👏', '🙌', '🤲', '🤝',
    '🙏', '✍️', '💅', '🤳', '💪', '🦾', '🦵', '🦶',
    '👂', '🦻', '👃', '🫀', '🫁', '🧠', '🦷', '🦴',
    '👀', '👁️', '👅', '👄', '💋', '🫦',
  ],

  hearts: [
    '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍',
    '🤎', '❤️‍🔥', '❤️‍🩹', '💔', '❣️', '💕', '💞', '💓',
    '💗', '💖', '💘', '💝', '💟', '☮️', '✝️', '☯️',
  ],

  celebration: [
    '🎉', '🎊', '🎈', '🎁', '🎀',
    // ✅ Removed duplicate 🎗️ (was listed twice)
    '🎗️', '🎟️', '🎫',
    '🏆', '🥇', '🥈', '🥉', '🏅', '🎖️', '🎠',
    '🎡', '🎢', '🎪', '🎭', '🎨', '🎬', '🎤', '🎧',
    '🎼', '🎵', '🎶', '🎷', '🎸', '🎹', '🎺', '🎻',
    '🥁', '🪘', '🎲', '♟️', '🎯', '🎳', '🎮', '🕹️',
  ],

  food: [
    '🍕', '🍔', '🍟', '🌭', '🍿', '🧂', '🥓', '🥚',
    '🍳', '🧇', '🥞', '🧈', '🍞', '🥐', '🥨', '🧀',
    '🥗', '🥙', '🌮', '🌯', '🥪', '🍱', '🍘', '🍙',
    '🍚', '🍛', '🍜', '🍝', '🍠', '🍢', '🍣', '🍤',
    '🍥', '🥮', '🍡', '🥟', '🥠', '🥡',
    // ✅ Seafood kept in food, removed from animals to avoid duplication
    '🦀', '🦞', '🦐', '🦑', '🦪',
    '🍦', '🍧', '🍨', '🍩', '🍪',
    '🎂', '🍰', '🧁', '🥧', '🍫', '🍬', '🍭', '🍮',
    '🍯', '🍼', '🥛', '☕', '🍵', '🧃', '🥤', '🧋',
    '🍶', '🍺', '🍻', '🥂', '🍷', '🥃', '🍸', '🍹',
  ],

  animals: [
    '🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼',
    '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐵', '🙈',
    '🙉', '🙊', '🐔', '🐧', '🐦', '🐤', '🦆', '🦅',
    '🦉', '🦇', '🐺', '🐗', '🐴', '🦄', '🐝', '🐛',
    '🦋', '🐌', '🐞', '🐜', '🦟', '🦗', '🦂', '🐢',
    '🐍', '🦎', '🦖', '🦕', '🐙',
    // ✅ Removed 🦑 🦐 🦞 🦀 — moved to food category
    '🐡', '🐠', '🐟', '🐬', '🐳', '🐋', '🦈',
    '🐊', '🐅', '🐆', '🦓', '🦍', '🦧', '🦣', '🐘',
  ],

  travel: [
    '✈️', '🚀', '🛸', '🚁', '🛶', '⛵', '🚢', '🛥️',
    '🚂', '🚃', '🚄', '🚅', '🚆', '🚇', '🚈', '🚉',
    '🚊', '🚝', '🚞', '🚋', '🚌', '🚍', '🚎', '🚐',
    '🚑', '🚒', '🚓', '🚔', '🚕', '🚖', '🚗', '🚘',
    '🏎️', '🏍️', '🛵', '🦽', '🦼', '🛺', '🚲', '🛴',
    '🛹', '🛼', '🚏', '🛣️', '🛤️', '🗺️', '🗾', '🧭',
    '🏔️', '⛰️', '🌋', '🗻', '🏕️', '🏖️', '🏗️', '🏘️',
  ],

  symbols: [
    '💯', '🔥', '✨', '⭐', '🌟', '💫', '⚡', '☄️',
    '💥', '❄️', '🌈', '☀️', '🌤️', '⛅', '🌦️', '🌧️',
    '⛈️', '🌩️', '🌨️', '🌪️', '🌫️', '🌬️', '🌀', '🌊',
    '💧', '💦', '☔', '☂️', '🌂', '⛱️',
    '⚽', '🏀', '🏈', '⚾', '🥎', '🎾', '🏐', '🏉',
    '🎱', '🏓', '🏸', '🏒', '🥊', '🥋', '🎽',
    // ✅ Removed 🛹 🏆 🎖️ 🎵 🎶 — already in celebration category
    '⛸️', '🏋️', '🤼', '🤸', '⛹️', '🤺', '🏇', '🏊',
    '🚵', '🚴',
    '🔑', '🗝️', '🔐', '🔒', '🔓',
    '🔔', '🔕', '📣', '📢', '💬', '💭',
    '🗯️', '♻️', '✅', '❌', '❓', '❗', '💤', '🚫',
  ],
};

/**
 * Most commonly used emojis shown in the default 'common' tab.
 * Curated for quick access — no duplicates within this list.
 */
export const commonEmojis = [
  '😀', '😂', '🤣', '😍', '🥰', '😘', '😊', '🙂',
  '😎', '🤩', '😏', '😒', '😢', '😭', '😤', '😠',
  '🤯', '😱', '🥺', '😴', '🤔', '🤫', '🤭', '🥳',
  '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '💔',
  '🔥', '✨', '💯', '👍', '👎', '👌', '🙏', '👏',
  '🎉', '🎊', '🎁', '🏆', '💪', '🤝', '✌️', '☝️',
];

/**
 * Valid category keys — used for validation when setting active category.
 */
const VALID_CATEGORY_KEYS = new Set([
  'common',
  'smileys',
  'gestures',
  'hearts',
  'celebration',
  'food',
  'animals',
  'travel',
  'symbols',
]);

/**
 * Category tabs configuration.
 * Defined at module level — never recreated on render.
 */
export const categoryTabs = [
  { key: 'common',      label: '⭐' },
  { key: 'smileys',     label: '😀' },
  { key: 'gestures',    label: '👍' },
  { key: 'hearts',      label: '❤️' },
  { key: 'celebration', label: '🎉' },
  { key: 'food',        label: '🍕' },
  { key: 'animals',     label: '🐶' },
  { key: 'travel',      label: '✈️' },
  { key: 'symbols',     label: '💯' },
];

// ─────────────────────────────────────────────────────────────────
// HOOK
// ─────────────────────────────────────────────────────────────────

/**
 * useEmojiPicker
 *
 * Manages state and actions for the emoji picker component.
 *
 * Features:
 * - Validated setNewMessage guard (no crash if undefined)
 * - Validated emoji guard (no undefined appended to message)
 * - Validated category key setter (no invalid categories)
 * - All action callbacks memoized with useCallback
 * - Active emojis memoized with useMemo
 * - Resets to 'common' tab on close
 * - categoryTabs and emoji data are module-level constants
 *
 * @param {function} setNewMessage - State setter for the message input
 * @returns {object} Emoji picker state and action handlers
 */
const useEmojiPicker = (setNewMessage) => {
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [activeCategory, setActiveCategoryState] = useState('common');
  const [searchQuery, setSearchQuery] = useState('');

  // ── Validated category setter ────────────────────────────────────
  /**
   * Sets the active emoji category.
   * Ignores invalid category keys to prevent undefined behavior.
   *
   * @param {string} key - Category key to activate
   */
  const setActiveCategory = useCallback((key) => {
    if (!VALID_CATEGORY_KEYS.has(key)) {
      console.warn(`useEmojiPicker: invalid category key "${key}"`);
      return;
    }
    setActiveCategoryState(key);
    setSearchQuery(''); // Reset search when switching categories
  }, []);

  // ── Add emoji to message input ───────────────────────────────────
  /**
   * Appends a validated emoji to the message input.
   * Safely handles undefined/null/empty emoji values.
   *
   * @param {string} emoji - Emoji character to append
   */
  const addEmoji = useCallback(
    (emoji) => {
      if (!emoji || typeof emoji !== 'string' || !emoji.trim()) return;

      if (typeof setNewMessage !== 'function') {
        console.warn('useEmojiPicker: setNewMessage is not a function');
        return;
      }

      setNewMessage((prev) => (prev ?? '') + emoji);
    },
    [setNewMessage]
  );

  // ── Toggle picker visibility ─────────────────────────────────────
  /**
   * Toggles the emoji picker open/closed.
   * Resets search query when toggling.
   */
  const toggleEmojiPicker = useCallback(() => {
    setShowEmojiPicker((prev) => {
      if (prev) {
        // Closing — reset search
        setSearchQuery('');
      }
      return !prev;
    });
  }, []);

  // ── Close picker ─────────────────────────────────────────────────
  /**
   * Closes the emoji picker and resets to the default 'common' tab.
   * Resets search query.
   */
  const closeEmojiPicker = useCallback(() => {
    setShowEmojiPicker(false);
    setActiveCategoryState('common'); // ✅ Reset to default tab on close
    setSearchQuery('');
  }, []);

  // ── Open picker ──────────────────────────────────────────────────
  /**
   * Opens the emoji picker.
   */
  const openEmojiPicker = useCallback(() => {
    setShowEmojiPicker(true);
  }, []);

  // ── Get emojis for the active category ──────────────────────────
  /**
   * Returns the emoji list for the current active category,
   * filtered by search query if one is active.
   * Memoized — only recalculates when activeCategory or searchQuery changes.
   *
   * @returns {string[]}
   */
  const activeEmojis = useMemo(() => {
    const baseList =
      activeCategory === 'common'
        ? commonEmojis
        : emojiCategories[activeCategory] ?? commonEmojis;

    if (!searchQuery.trim()) return baseList;

    // Simple search: filter emojis that include the query
    // Note: proper emoji search requires a name database
    // This is a basic implementation — enhance with emoji-name library if needed
    const query = searchQuery.trim().toLowerCase();
    return baseList.filter((e) => e.includes(query));
  }, [activeCategory, searchQuery]);

  /**
   * @deprecated Use activeEmojis directly instead.
   * Kept for backwards compatibility with existing callers.
   */
  const getActiveEmojis = useCallback(() => activeEmojis, [activeEmojis]);

  // ─────────────────────────────────────────────────────────────────
  // PUBLIC API
  // ─────────────────────────────────────────────────────────────────
  return {
    // ── State ──────────────────────────────────────────────────────
    showEmojiPicker,
    activeCategory,
    searchQuery,

    // ── Data (module-level constants — stable references) ──────────
    commonEmojis,
    emojiCategories,
    categoryTabs,
    activeEmojis,       // ✅ Memoized — use this in FlatList data prop

    // ── Actions ────────────────────────────────────────────────────
    addEmoji,
    toggleEmojiPicker,
    openEmojiPicker,
    closeEmojiPicker,
    setActiveCategory,  // ✅ Validated setter — not raw setState
    setSearchQuery,     // Expose for search input binding
    getActiveEmojis,    // ⚠️ Deprecated — use activeEmojis instead
  };
};

export default useEmojiPicker;