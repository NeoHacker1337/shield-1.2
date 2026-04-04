import React, { useEffect, useRef, useState } from 'react';
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
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialIcons';

import styles from '../assets/FeedbackStyles';
import FeedbackService from '../services/FeedbackService';

const FeedbackScreen = () => {
  const navigation = useNavigation();

  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [rating, setRating] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim, scaleAnim]);

  const handleSubmitFeedback = async () => {
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
  };

  const renderStars = () => (
    <View style={styles.starContainer}>
      <Text style={styles.ratingLabel}>Rate Your Experience (Optional)</Text>
      <View style={styles.starsRow}>
        {[1, 2, 3, 4, 5].map((star) => {
          const isActive = star <= rating;
          return (
            <TouchableOpacity
              key={star}
              onPress={() => setRating(star)}
              disabled={isSubmitting}
              activeOpacity={0.8}
            >
              <Icon
                name={isActive ? 'star' : 'star-border'}
                size={28}
                color={isActive ? '#FFC107' : '#9CA3AF'}
                style={{ marginHorizontal: 4 }}
              />
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#050816" />
      <LinearGradient
        colors={['#050816', '#0B1120', '#020617']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        {/* ===== HEADER ===== */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
            activeOpacity={0.85}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Icon
              name={Platform.OS === 'ios' ? 'arrow-back-ios' : 'arrow-back'}
              size={20}
              color="#E5E7EB"
            />
          </TouchableOpacity>

          <Text style={styles.headerTitle}>Feedback</Text>
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
            {renderStars()}

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
            <View style={styles.submitButton}>
              <TouchableOpacity
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
                      <Text style={styles.submitButtonText}>
                        Submit Feedback
                      </Text>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
};

export default FeedbackScreen;
