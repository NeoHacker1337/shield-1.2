import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView,
  SafeAreaView,
  StatusBar,
  KeyboardAvoidingView,
  Platform
} from 'react-native';

import * as Keychain from 'react-native-keychain';
import AuthService from '../../services/AuthService';

import styles from '../../assets/RecoverPinStyles';
import { Colors } from '../../assets/theme';

import {
  getSecurityQuestions,
  verifySecurityAnswers
} from '../../services/securityQuestionService';

const CHAT_HIDE_SERVICE = 'shield-chat-hide';
const CHAT_LOCK_SERVICE = 'shield-chat-lock';
const SECURITY_HIDE_SERVICE = 'shield-security-hide';

const RecoverPinScreen = ({ navigation, route }) => {

  const feature = route?.params?.feature;

  const [questions, setQuestions] = useState([]);
  const [answer1, setAnswer1] = useState('');
  const [answer2, setAnswer2] = useState('');

  useEffect(() => {
    loadSecurityQuestions();
  }, []);

  const getRecoveryTitle = () => {

    switch (feature) {

      case 'passcode':
        return 'Passcode Recovery';

      case 'chatHide':
        return 'Chat Hide PIN Recovery';

      case 'chatLock':
        return 'Chat Lock PIN Recovery';

      case 'securityHide':
        return 'Security Hide PIN Recovery';

      default:
        return 'PIN Recovery';

    }

  };

  const loadSecurityQuestions = async () => {

    try {

      const response = await getSecurityQuestions();

      setQuestions(response.data || []);

    } catch (error) {

      console.log('Failed loading questions', error);

      Alert.alert(
        'Error',
        'Unable to load your security questions.'
      );

    }

  };

  const resetFeaturePin = async () => {

    try {

      if (feature === 'chatHide') {
        await Keychain.resetGenericPassword({ service: CHAT_HIDE_SERVICE });
      }

      if (feature === 'chatLock') {
        await Keychain.resetGenericPassword({ service: CHAT_LOCK_SERVICE });
      }

      if (feature === 'securityHide') {
        await Keychain.resetGenericPassword({ service: SECURITY_HIDE_SERVICE });
      }

      if (feature === 'passcode') {
        await AuthService.removePasscode();
      }

      Alert.alert(
        'Success',
        'PIN reset successfully',
        [
          {
            text: 'Set New PIN',
            onPress: () => navigation.goBack()
          }
        ]
      );

    } catch (error) {

      Alert.alert(
        'Error',
        'Failed to reset PIN'
      );

    }

  };

  const verifyAnswers = async () => {

  try {

    const payload = {
      feature: feature,
      answers: [
        {
          question_id: questions[0]?.id,
          question: questions[0]?.question,
          answer: answer1
        },
        {
          question_id: questions[1]?.id,
          question: questions[1]?.question,
          answer: answer2
        }
      ]
    };

    console.log("VERIFY PAYLOAD:", payload);

    const response = await verifySecurityAnswers(payload);

    console.log("VERIFY RESPONSE:", response);

      if (response.success) {

        await resetFeaturePin();

      } else {

        Alert.alert(
          'Incorrect',
          'Security answers are incorrect.'
        );

      }

    } catch (error) {

      console.log(error);

      Alert.alert(
        'Error',
        'Verification failed.'
      );

    }

  };

  return (

    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.backgroundDark} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >

        <ScrollView
          contentContainerStyle={styles.container}
          showsVerticalScrollIndicator={false}
        >

          {/* Header */}

          <View style={styles.header}>

            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <Text style={styles.backArrow}>←</Text>
            </TouchableOpacity>

            <Text style={styles.headerTitle}>
              PIN Recovery
            </Text>

            <View style={{ width: 40 }} />

          </View>

          {/* Icon */}

          <View style={styles.iconContainer}>
            <Text style={styles.iconText}>🔐</Text>
          </View>

          {/* Title */}

          <View style={styles.titleSection}>

            <Text style={styles.mainTitle}>
              {getRecoveryTitle()}
            </Text>

            <Text style={styles.subTitle}>
              Answer your security questions to verify your identity and reset your {feature === 'passcode' ? 'passcode' : 'PIN'}.
            </Text>

          </View>

          {/* Question 1 */}

          <View style={styles.questionCard}>

            <Text style={styles.questionLabel}>
              SECURITY QUESTION 1
            </Text>

            <Text style={styles.questionText}>
              {questions[0]?.question || 'Loading question...'}
            </Text>

            <TextInput
              style={styles.input}
              value={answer1}
              onChangeText={setAnswer1}
              placeholder="Enter your answer"
              placeholderTextColor={Colors.textSecondary}
              autoCapitalize="none"
              autoCorrect={false}
            />

          </View>

          {/* Question 2 */}

          <View style={styles.questionCard}>

            <Text style={styles.questionLabel}>
              SECURITY QUESTION 2
            </Text>

            <Text style={styles.questionText}>
              {questions[1]?.question || 'Loading question...'}
            </Text>

            <TextInput
              style={styles.input}
              value={answer2}
              onChangeText={setAnswer2}
              placeholder="Enter your answer"
              placeholderTextColor={Colors.textSecondary}
              autoCapitalize="none"
              autoCorrect={false}
            />

          </View>

          {/* Verify Button */}

          <TouchableOpacity
            style={[
              styles.verifyButton,
              (!answer1.trim() || !answer2.trim()) && styles.verifyButtonDisabled
            ]}
            onPress={verifyAnswers}
            disabled={!answer1.trim() || !answer2.trim()}
          >

            <Text style={styles.verifyButtonText}>
              VERIFY ANSWERS
            </Text>

          </TouchableOpacity>

          {/* Cancel */}

          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => navigation.goBack()}
          >

            <Text style={styles.cancelText}>
              Cancel Recovery
            </Text>

          </TouchableOpacity>

        </ScrollView>

      </KeyboardAvoidingView>

    </SafeAreaView>

  );

};

export default RecoverPinScreen;
