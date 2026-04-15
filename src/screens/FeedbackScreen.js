import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  Animated,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialIcons';

import styles from '../assets/FeedbackStyles';
import FeedbackService from '../services/FeedbackService';

/* ─── Star Rating Sub-Component ─────────────────────────────────────────────
   Extracted from an inline render function to avoid re-creating it on every
   parent render and to give it a stable identity for React's reconciler.
──────────────────────────────────────────────────────────────────────────── */
const StarRating = React.memo(({ rating, onRate, disabled }) => (
  <View style={styles.starContainer}>
    <Text style={styles.ratingLabel}>Rate Your Experience (Optional)</Text>
    <View style={styles.starsRow}>
      {[1, 2, 3, 4, 5].map((star) => {
        const isActive = star <= rating;
        return (
          <TouchableOpacity
            key={star}
            /*
              Tapping the currently active star resets the rating to 0,
              giving users a way to clear their selection.
            */
            onPress={() => onRate(star === rating ? 0 : star)}
            disabled={disabled}
            activeOpacity={0.8}
          >
            <Icon
              name={isActive ? 'star' : 'star-border'}
              size={28}
              color={isActive ? '#FFC107' : '#9CA3AF'}
              style={styles.starIcon}
            />
          </TouchableOpacity>
        );
      })}
    </View>
  </View>
));

/* ─── Screen ─────────────────────────────────────────────────────────────── */
const FeedbackScreen = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [rating, setRating] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Animation refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim, scaleAnim]);

  const handleSubmitFeedback = useCallback(async () => {
    if (message.trim().length < 5) {
      Alert.alert('Validation Error', 'Minimum 5 characters required.');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await FeedbackService.submitFeedback({
        subject,
        message,
        rating,
      });

      Alert.alert('Success', result.message, [
        {
          text: 'OK',
          onPress: () => navigation.goBack(),
        },
      ]);
    } catch (e) {
      Alert.alert('Error', e.message || 'Something went wrong');
    } finally {
      setIsSubmitting(false);
    }
  }, [message, subject, rating, navigation]);

  return (
    <View style={styles.container}>
      <StatusBar
        translucent
        barStyle="light-content"
        backgroundColor="transparent"
      />

      <LinearGradient
        colors={['#050816', '#0B1120', '#020617']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        {/* ===== HEADER ===== */}
        <View style={styles.header}>
          {/*
            Layer 1 — Status bar spacer.
            Occupies exactly the system status bar height so the content
            row below it is never drawn behind the system bar.
            No children — it is a pure spacing block.
          */}
          <View style={{ height: insets.top }} />

          {/*
            Layer 2 — Visible content row.
            Back button and title live here. Because this View has its own
            fixed height (HEADER_HEIGHT) and uses flexbox centering, the
            back button's absolute positioning is scoped to this row only —
            not to the full header including the inset spacer above.
          */}
          <View style={styles.headerContent}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={styles.backButton}
              activeOpacity={0.85}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Icon name="arrow-back" size={20} color="#E5E7EB" />
            </TouchableOpacity>

            <Text style={styles.headerTitle}>Feedback</Text>
          </View>
        </View>

        {/* ===== CONTENT ===== */}
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Animated.View
            style={[
              styles.content,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }, { scale: scaleAnim }],
              },
            ]}
          >
            {/* Icon + Title */}
            <View style={styles.iconContainer}>
              <View style={styles.iconBadge}>
                <Icon name="feedback" size={26} color="#42A5F5" />
              </View>
              <Text style={styles.title}>We Value Your Feedback!</Text>
              <Text style={styles.description}>
                Help us improve Shield Security by sharing your thoughts,
                suggestions, or any issues you have experienced.
              </Text>
            </View>

            {/* Subject Input */}
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Subject (Optional)</Text>
              <TextInput
                style={styles.subjectInput}
                placeholder="Short summary of your feedback"
                placeholderTextColor="rgba(176, 190, 197, 0.8)"
                value={subject}
                onChangeText={setSubject}
                editable={!isSubmitting}
              />
            </View>

            {/* Rating */}
            <StarRating
              rating={rating}
              onRate={setRating}
              disabled={isSubmitting}
            />

            {/* Message Input */}
            <View style={styles.inputContainer}>
              <View style={styles.labelRow}>
                <Text style={styles.inputLabel}>Your Feedback *</Text>
                <Text style={styles.charCount}>{message.length} characters</Text>
              </View>
              <TextInput
                style={styles.textInput}
                placeholder="Describe your experience, issues, or suggestions in detail..."
                placeholderTextColor="rgba(176, 190, 197, 0.8)"
                value={message}
                onChangeText={setMessage}
                multiline
                editable={!isSubmitting}
                textAlignVertical="top"
              />
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              style={styles.submitButton}
              onPress={handleSubmitFeedback}
              disabled={isSubmitting}
              activeOpacity={0.9}
            >
              <LinearGradient
                colors={
                  isSubmitting
                    ? ['#1F2937', '#111827']
                    : ['#42A5F5', '#00CCFF']
                }
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.submitGradient}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Icon name="send" size={18} color="#FFFFFF" />
                    <Text style={styles.submitButtonText}>Submit Feedback</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>
        </ScrollView>
      </LinearGradient>
    </View>
  );
};

export default FeedbackScreen;