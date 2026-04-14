import React, { memo, useMemo } from 'react';
import {
  Modal,
  View,
  TouchableOpacity,
  Text,
  TouchableWithoutFeedback,
  StyleSheet,
} from 'react-native';
import PropTypes from 'prop-types';
import Icon from 'react-native-vector-icons/MaterialIcons';
import styles from '../../assets/ChatSystemStyles';

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────
const COLOR = {
  accent:   '#075E54',
  pink:     '#E91E63',
  yellow:   '#FFC107',
  orange:   '#FF9800',
  red:      '#F44336',
  darkRed:  '#E53935',
};

// ─────────────────────────────────────────────────────────────────────────────
// LOCAL STYLES — extracted to avoid inline object allocation on every render
// ─────────────────────────────────────────────────────────────────────────────
const localStyles = StyleSheet.create({
  noBottomBorder: {
    borderBottomWidth: 0,
  },
  redText: {
    color: COLOR.red,
  },
  darkRedText: {
    color: COLOR.darkRed,
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS — defined outside component, never recreated
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Prevent touch events from bubbling up to the overlay dismiss handler.
 * Using a named no-op avoids allocating a new arrow function on every render.
 */
const stopPropagation = (e) => e.stopPropagation();

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
const SelectionDotMenu = ({
  visible,
  onClose,
  roomMeta,
  selectedRooms,
  onViewContact,
  onLockChat,
  onFavorite,
  onClearChat,
  onBlock,
  onDelete,
}) => {
  // ── Guard: normalize props defensively ──────────────────────────────────
  // FIX: Guard against undefined/null roomMeta or selectedRooms to prevent
  // crashes if props arrive late or are misconfigured.
  const safeMeta  = roomMeta      ?? {};
  const safeRooms = selectedRooms ?? new Set();

  // ── Derive all state once, not inline in JSX ─────────────────────────────
  // FIX: Spread the Set exactly once — avoids 6 separate array allocations
  // and keeps derived values stable and readable.
  const derivedState = useMemo(() => {
    const roomIds      = [...safeRooms];
    const count        = roomIds.length;
    const isSingle     = count === 1;
    const firstId      = isSingle ? roomIds[0] : null;

    // Vacuous truth guard: .every() on an empty array always returns true,
    // which would incorrectly show "Remove from Favorites" / "Unblock" when
    // nothing is selected. Explicitly return false for empty selections.
    const allFavorited = count > 0 && roomIds.every((id) => safeMeta[id]?.favorite);
    const allBlocked   = count > 0 && roomIds.every((id) => safeMeta[id]?.blocked);

    // Lock state only meaningful for a single selection
    const isLocked = isSingle && !!safeMeta[firstId]?.locked;

    return {
      count,
      isSingle,
      isLocked,
      allFavorited,
      allBlocked,
    };
  }, [safeRooms, safeMeta]);

  const {
    count,
    isSingle,
    isLocked,
    allFavorited,
    allBlocked,
  } = derivedState;

  // ── Do not render if nothing is selected ────────────────────────────────
  if (count === 0 && visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      {/* Tapping the overlay closes the menu */}
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.menuModalOverlay}>

          {/*
           * FIX: Replaced `onPress={() => {}}` with a named `stopPropagation`
           * handler — prevents the overlay dismiss from firing when the menu
           * content is tapped, without allocating a new function every render.
           */}
          <TouchableWithoutFeedback onPress={stopPropagation}>
            <View style={styles.menuModalContent}>

              {/*
               * FIX: "View Contact" only makes sense for a single selection.
               * Disabled + visually muted when multiple rooms are selected.
               */}
              <TouchableOpacity
                style={styles.menuItem}
                onPress={onViewContact}
                disabled={!isSingle}
                activeOpacity={0.7}
                accessibilityLabel="View Contact"
                accessibilityRole="button"
              >
                <Icon
                  name="person"
                  size={20}
                  color={isSingle ? COLOR.accent : '#aaa'}
                />
                <Text
                  style={[
                    styles.menuItemText,
                    !isSingle && localStyles.disabledText,
                  ]}
                >
                  View Contact
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.menuItem}
                onPress={onLockChat}
                activeOpacity={0.7}
                accessibilityLabel={isLocked ? 'Unlock Chat' : 'Lock Chat'}
                accessibilityRole="button"
              >
                <Icon
                  name={isLocked ? 'lock-open' : 'lock'}
                  size={20}
                  color={COLOR.pink}
                />
                <Text style={styles.menuItemText}>
                  {isLocked ? 'Unlock Chat' : 'Lock Chat'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.menuItem}
                onPress={onFavorite}
                activeOpacity={0.7}
                accessibilityLabel={allFavorited ? 'Remove from Favorites' : 'Add to Favorites'}
                accessibilityRole="button"
              >
                <Icon
                  name={allFavorited ? 'star' : 'star-border'}
                  size={20}
                  color={COLOR.yellow}
                />
                <Text style={styles.menuItemText}>
                  {allFavorited ? 'Remove from Favorites' : 'Add to Favorites'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.menuItem}
                onPress={onClearChat}
                activeOpacity={0.7}
                accessibilityLabel="Clear Chat"
                accessibilityRole="button"
              >
                <Icon name="cleaning-services" size={20} color={COLOR.orange} />
                <Text style={styles.menuItemText}>Clear Chat</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.menuItem}
                onPress={onBlock}
                activeOpacity={0.7}
                accessibilityLabel={allBlocked ? 'Unblock' : 'Block'}
                accessibilityRole="button"
              >
                <Icon name="block" size={20} color={COLOR.red} />
                <Text style={[styles.menuItemText, localStyles.redText]}>
                  {allBlocked ? 'Unblock' : 'Block'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.menuItem, localStyles.noBottomBorder]}
                onPress={onDelete}
                activeOpacity={0.7}
                accessibilityLabel="Delete"
                accessibilityRole="button"
              >
                <Icon name="delete" size={20} color={COLOR.darkRed} />
                <Text style={[styles.menuItemText, localStyles.darkRedText]}>
                  Delete
                </Text>
              </TouchableOpacity>

            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// PROP TYPES
// ─────────────────────────────────────────────────────────────────────────────
SelectionDotMenu.propTypes = {
  visible:       PropTypes.bool.isRequired,
  onClose:       PropTypes.func.isRequired,
  /** Keyed by room ID; each value may contain `locked`, `favorite`, `blocked` */
  roomMeta:      PropTypes.objectOf(
    PropTypes.shape({
      locked:   PropTypes.bool,
      favorite: PropTypes.bool,
      blocked:  PropTypes.bool,
    }),
  ),
  /** Set of selected room IDs */
  selectedRooms: PropTypes.instanceOf(Set),
  onViewContact: PropTypes.func,
  onLockChat:    PropTypes.func,
  onFavorite:    PropTypes.func,
  onClearChat:   PropTypes.func,
  onBlock:       PropTypes.func,
  onDelete:      PropTypes.func,
};

SelectionDotMenu.defaultProps = {
  roomMeta:      {},
  selectedRooms: new Set(),
};

export default memo(SelectionDotMenu);