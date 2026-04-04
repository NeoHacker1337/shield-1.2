import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  Modal,
  FlatList,
  Platform,
  KeyboardAvoidingView,
  Animated,
  StatusBar,
  ScrollView,
  Dimensions,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import SInfo from 'react-native-sensitive-info';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { BASE_URL, DEFAULT_HEADERS, API_TIMEOUT } from '../../utils/config';
import styles from '../../assets/SecurityQuestionsStyles';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const fetchWithTimeout = async (resource, options = {}, timeout = API_TIMEOUT) => {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  const response = await fetch(resource, { ...options, signal: controller.signal });
  clearTimeout(id);
  return response;
};

const SecurityQuestionsScreen = ({ navigation }) => {
  const [question1, setQuestion1] = useState('');
  const [answer1, setAnswer1] = useState('');
  const [question2, setQuestion2] = useState('');
  const [answer2, setAnswer2] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [activeQuestionField, setActiveQuestionField] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const modalAnim = useRef(new Animated.Value(0)).current;
  const scrollViewRef = useRef(null);

  const SECURITY_QUESTIONS_URL = `${BASE_URL}/v1/security-questions`;

  const securityQuestions = useRef([
    "What was your first pet's name?",
    "What city were you born in?",
    "What was your mother's maiden name?",
    "What was the name of your first school?",
    "What was your childhood nickname?",
    "What is your favorite movie?",
    "What street did you grow up on?",
    "What was your first car model?",
  ]).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();

    loadUserEmail();
  }, []);

  const loadUserEmail = async () => {
    try {
      const storedEmail = await SInfo.getItem('shield-email', {
        sharedPreferencesName: 'shieldSharedPrefs',
        keychainService: 'shieldKeychain'
      });
      setEmail(storedEmail);
    } catch (error) {
      console.error('Failed to load email:', error);
      Alert.alert('Error', 'Failed to retrieve user information. Please try logging in again.');
    }
  };

  const handleAnswer1Change = useCallback((text) => {
    setAnswer1(text);
  }, []);

  const handleAnswer2Change = useCallback((text) => {
    setAnswer2(text);
  }, []);

  const submitSecurityQuestions = async (userEmail, q1, a1, q2, a2) => {
    const payload = {
      email: userEmail,
      question_1: q1,
      answer_1: a1,
      question_2: q2,
      answer_2: a2,
    };

    try {
      const res = await fetchWithTimeout(SECURITY_QUESTIONS_URL, {
        method: 'POST',
        headers: DEFAULT_HEADERS,
        body: JSON.stringify(payload),
      }, API_TIMEOUT);

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || `Request failed: ${res.status}`);
      }

      return await res.json();
    } catch (error) {
      console.error('Security questions API error:', error);
      throw error;
    }
  };

  const storeSecurityQuestionsLocally = async (q1, a1, q2, a2) => {
    try {
      await AsyncStorage.multiSet([
        ['@security_question_1', q1.trim()],
        ['@security_answer_1', a1.toLowerCase().trim()],
        ['@security_question_2', q2.trim()],
        ['@security_answer_2', a2.toLowerCase().trim()],
      ]);
      return true;
    } catch (error) {
      console.error('Local Storage Error:', error);
      return false;
    }
  };

  const handleComplete = async () => {
    if (!question1 || !answer1 || !question2 || !answer2) {
      Alert.alert('Error', 'Please configure all security questions.');
      return;
    }

    if (question1 === question2) {
      Alert.alert('Error', 'Please select different security questions.');
      return;
    }

    if (answer1.trim().length < 2 || answer2.trim().length < 2) {
      Alert.alert('Error', 'Answers must be at least 2 characters.');
      return;
    }

    if (!email) {
      Alert.alert('Error', 'User email not found. Please try logging in again.');
      return;
    }

    setIsLoading(true);

    try {
      const response = await submitSecurityQuestions(email, question1, answer1, question2, answer2);

      if (response.success) {
        await storeSecurityQuestionsLocally(question1, answer1, question2, answer2);

        Alert.alert(
          'Success',
          'Security questions configured successfully.',
          [
            {
              text: 'Continue',
              onPress: () => navigation.navigate('GetPremium')
            },
          ]
        );
      } else {
        throw new Error(response.message || 'Failed to store security questions');
      }
    } catch (error) {
      console.error('Security questions submission failed:', error);

      let errorMessage = 'Failed to configure security questions.';
      if (error.message.includes('network')) {
        errorMessage = 'Request timed out. Please check your connection and try again.';
      } else if (error.message.includes('Validation')) {
        errorMessage = 'Please check your inputs and try again.';
      } else if (error.message) {
        errorMessage = error.message;
      }

      Alert.alert('Error', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const openQuestionPicker = useCallback((field) => {
    setActiveQuestionField(field);
    setShowModal(true);
    Animated.timing(modalAnim, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, []);

  const closeModal = useCallback(() => {
    Animated.timing(modalAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => setShowModal(false));
  }, []);

  const selectQuestion = useCallback((question) => {
    if (activeQuestionField === 1) {
      setQuestion1(question);
    } else {
      setQuestion2(question);
    }
    closeModal();
  }, [activeQuestionField]);

  const renderQuestionItem = useCallback(({ item }) => (
    <TouchableOpacity
      onPress={() => selectQuestion(item)}
      activeOpacity={0.7}
      style={styles.questionItem}
    >
      <View style={styles.questionItemContent}>
        <Text style={styles.questionText}>{item}</Text>
      </View>
    </TouchableOpacity>
  ), [selectQuestion]);

  const handleInputFocus = (inputName) => {
    setKeyboardVisible(true);
    setTimeout(() => {
      if (scrollViewRef.current) {
        let yOffset = 0;
        if (inputName === 'answer1') yOffset = screenHeight * 0.35;
        if (inputName === 'answer2') yOffset = screenHeight * 0.5;
        scrollViewRef.current.scrollTo({ y: yOffset, animated: true });
      }
    }, 100);
  };

  const handleInputBlur = () => {
    setKeyboardVisible(false);
  };

  const isButtonDisabled = !question1 || !answer1 || !question2 || !answer2 || isLoading;

  const resetFeaturePin = async (feature) => {

    if (feature === 'chatHide')
      await Keychain.resetGenericPassword({ service: CHAT_HIDE_SERVICE });

    if (feature === 'chatLock')
      await Keychain.resetGenericPassword({ service: CHAT_LOCK_SERVICE });

    if (feature === 'securityHide')
      await Keychain.resetGenericPassword({ service: SECURITY_HIDE_SERVICE });

    if (feature === 'passcode')
      await AuthService.removePasscode();

  };

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor="#0A0A0A" />
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <ScrollView
          ref={scrollViewRef}
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          bounces={true}
        >
          <Animated.View
            style={[styles.mainContainer, { opacity: fadeAnim }]}
          >
            {/* Header Section */}
            <View style={styles.header}>
              <View style={styles.shieldIconContainer}>
                <Icon name="shield" size={32} color="#0A0A0A" />
              </View>
              <Text style={styles.mainTitle}>SECURITY PROTOCOL</Text>

              <View style={styles.statusBadge}>
                <View style={styles.statusDot} />
                <Text style={styles.statusText}>CONFIGURING RECOVERY SYSTEM</Text>
              </View>

              <Text style={styles.subTitle}>
                Configure security questions for account recovery
              </Text>
            </View>

            {/* Main Card Container */}
            <View style={styles.cardContainer}>
              {/* Primary Question */}
              <View style={styles.questionSection}>
                <Text style={styles.sectionLabel}>PRIMARY QUESTION</Text>
                <TouchableOpacity
                  onPress={() => openQuestionPicker(1)}
                  activeOpacity={0.8}
                  style={styles.selectorButton}
                >
                  <View style={styles.selectorIcon}>
                    <Text style={styles.questionMark}>?</Text>
                  </View>
                  <Text style={[styles.selectorText, question1 && styles.selectorTextSelected]}>
                    {question1 || 'SELECT QUESTION'}
                  </Text>
                  <Icon name="keyboard-arrow-down" size={24} color="#4ADE80" />
                </TouchableOpacity>

                {question1 && (
                  <View style={styles.inputContainer}>
                    <TextInput
                      style={styles.input}
                      value={answer1}
                      onChangeText={handleAnswer1Change}
                      onFocus={() => handleInputFocus('answer1')}
                      onBlur={handleInputBlur}
                      placeholder="Enter your answer..."
                      placeholderTextColor="#666666"
                      secureTextEntry={true}
                      autoCorrect={false}
                      autoCapitalize="none"
                      returnKeyType="next"
                    />
                  </View>
                )}
              </View>

              {/* Secondary Question */}
              <View style={styles.questionSection}>
                <Text style={styles.sectionLabel}>SECONDARY QUESTION</Text>
                <TouchableOpacity
                  onPress={() => openQuestionPicker(2)}
                  activeOpacity={0.8}
                  style={styles.selectorButton}
                >
                  <View style={styles.selectorIcon}>
                    <Text style={styles.questionMark}>?</Text>
                  </View>
                  <Text style={[styles.selectorText, question2 && styles.selectorTextSelected]}>
                    {question2 || 'SELECT QUESTION'}
                  </Text>
                  <Icon name="keyboard-arrow-down" size={24} color="#4ADE80" />
                </TouchableOpacity>

                {question2 && (
                  <View style={styles.inputContainer}>
                    <TextInput
                      style={styles.input}
                      value={answer2}
                      onChangeText={handleAnswer2Change}
                      onFocus={() => handleInputFocus('answer2')}
                      onBlur={handleInputBlur}
                      placeholder="Enter your answer..."
                      placeholderTextColor="#666666"
                      secureTextEntry={true}
                      autoCorrect={false}
                      autoCapitalize="none"
                      returnKeyType="done"
                    />
                  </View>
                )}
              </View>

              {/* Complete Button */}
              <TouchableOpacity
                style={[styles.completeButton, isButtonDisabled && styles.buttonDisabled]}
                onPress={handleComplete}
                disabled={isButtonDisabled}
                activeOpacity={0.8}
              >
                <View style={styles.buttonIconContainer}>
                  <Icon
                    name={isLoading ? "hourglass-empty" : "check"}
                    size={20}
                    color="#0A0A0A"
                    style={styles.buttonIcon}
                  />
                </View>
                <Text style={styles.completeButtonText}>
                  {isLoading ? 'SAVING...' : 'COMPLETE SETUP'}
                </Text>
              </TouchableOpacity>

              {/* Security Notice */}
              <View style={styles.securityNotice}>
                <Icon name="warning" size={18} color="#F59E0B" />
                <Text style={styles.noticeText}>
                  Store your answers securely. They will be required for account recovery.
                </Text>
              </View>
            </View>

            {/* Footer */}
            <View style={styles.footer}>
              <Text style={styles.footerBrand}>SHIELD</Text>
              <Text style={styles.footerTagline}>ENCRYPTED RECOVERY • ZERO TRUST</Text>
            </View>

            {/* Extra padding for keyboard */}
            {keyboardVisible && <View style={styles.keyboardSpacer} />}
          </Animated.View>
        </ScrollView>

        {/* Question Selection Modal */}
        <Modal
          visible={showModal}
          transparent={true}
          animationType="none"
          onRequestClose={closeModal}
          statusBarTranslucent={true}
        >
          <Animated.View
            style={[styles.modalOverlay, { opacity: modalAnim }]}
          >
            <Animated.View
              style={[
                styles.modalContent,
                {
                  transform: [
                    {
                      scale: modalAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.8, 1],
                      }),
                    },
                  ],
                },
              ]}
            >
              <View style={styles.modalInner}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>SELECT SECURITY QUESTION</Text>
                  <TouchableOpacity
                    onPress={closeModal}
                    style={styles.closeButton}
                    activeOpacity={0.7}
                  >
                    <Icon name="close" size={24} color="#ffffff" />
                  </TouchableOpacity>
                </View>

                <FlatList
                  data={securityQuestions}
                  renderItem={renderQuestionItem}
                  keyExtractor={(_, index) => index.toString()}
                  showsVerticalScrollIndicator={false}
                  style={styles.modalList}
                  contentContainerStyle={styles.modalListContent}
                  initialNumToRender={10}
                  maxToRenderPerBatch={10}
                  windowSize={5}
                />

                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={closeModal}
                  activeOpacity={0.8}
                >
                  <Text style={styles.cancelText}>CANCEL</Text>
                </TouchableOpacity>
              </View>
            </Animated.View>
          </Animated.View>
        </Modal>
      </KeyboardAvoidingView>
    </>
  );
};

export default SecurityQuestionsScreen;