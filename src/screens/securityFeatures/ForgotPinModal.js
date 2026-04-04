/**
 * ForgotPinModal.js
 *
 * Place this file at:
 *   src/screens/securityFeatures/ForgotPinModal.js
 *
 * Props:
 *   visible   {boolean}  - show/hide the modal
 *   service   {string}   - one of the 4 shield service constants
 *   onClose   {function} - called when user taps Cancel or X
 *   onSuccess {function} - called after PIN is successfully reset
 *
 * Flow:
 *   STEP 1 → verify   : user answers security question (text input)
 *   STEP 2 → newPin   : user enters new 6-digit PIN (keypad)
 *   STEP 3 → confirm  : user re-enters PIN to confirm (keypad)
 *   STEP 4 → success  : success screen, auto-fires onSuccess() after 1.8s
 */

import React, {
    useState,
    useRef,
    useEffect,
    useCallback,
} from 'react';
import {
    Modal,
    View,
    Text,
    TextInput,
    TouchableOpacity,
    Animated,
    Vibration,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

import {
    getSecurityQuestion,
    verifySecurityAnswer,
    forceResetPin,
    getPinServiceLabel,
} from '../../services/forgotPinService';

import ForgotPinStyles from '../../assets/ForgotPinStyles';
import { Colors } from '../../assets/theme';
import EmailOtpModal from './EmailOtpModal';

/* ─────────────────────────────────────────────────────────────
   STEP CONSTANTS
───────────────────────────────────────────────────────────── */
const STEP_VERIFY = 'verify';
const STEP_NEW_PIN = 'newPin';
const STEP_CONFIRM = 'confirm';
const STEP_SUCCESS = 'success';

/* ─────────────────────────────────────────────────────────────
   SUB-COMPONENT: Numeric Keypad
───────────────────────────────────────────────────────────── */
const NumericKeypad = ({ onKeyPress }) => {
    const rows = [['1', '2', '3'], ['4', '5', '6'], ['7', '8', '9']];

    return (
        <View style={ForgotPinStyles.keypad}>
            {rows.map((row, ri) => (
                <View key={ri} style={ForgotPinStyles.keyRow}>
                    {row.map((key) => (
                        <TouchableOpacity
                            key={key}
                            style={ForgotPinStyles.keyBtn}
                            onPress={() => onKeyPress(key)}
                            activeOpacity={0.6}
                        >
                            <Text style={ForgotPinStyles.keyText}>{key}</Text>
                        </TouchableOpacity>
                    ))}
                </View>
            ))}

            {/* Bottom row: empty | 0 | backspace */}
            <View style={ForgotPinStyles.keyRow}>
                <View style={ForgotPinStyles.keyBtnEmpty} />

                <TouchableOpacity
                    style={ForgotPinStyles.keyBtn}
                    onPress={() => onKeyPress('0')}
                    activeOpacity={0.6}
                >
                    <Text style={ForgotPinStyles.keyText}>0</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={ForgotPinStyles.keyBtn}
                    onPress={() => onKeyPress('backspace')}
                    activeOpacity={0.6}
                >
                    <Icon name="backspace" size={22} color={Colors.textPrimary} />
                </TouchableOpacity>
            </View>
        </View>
    );
};

/* ─────────────────────────────────────────────────────────────
   SUB-COMPONENT: PIN Dots Row
───────────────────────────────────────────────────────────── */
const PinDots = ({ value, shakeAnim }) => (
    <Animated.View
        style={[
            ForgotPinStyles.dotsRow,
            { transform: [{ translateX: shakeAnim }] },
        ]}
    >
        {[...Array(6)].map((_, i) => (
            <View
                key={i}
                style={[
                    ForgotPinStyles.dot,
                    i < value.length && ForgotPinStyles.dotFilled,
                ]}
            />
        ))}
    </Animated.View>
);

/* ─────────────────────────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────────────────────────── */
const ForgotPinModal = ({ visible, service, onClose, onSuccess, onEmailFlow }) => {

    /* ── State ── */
    const [step, setStep] = useState(STEP_VERIFY);
    const [question, setQuestion] = useState(null);
    const [qLoading, setQLoading] = useState(false);
    const [answer, setAnswer] = useState('');
    const [answerFocused, setAnsF] = useState(false);
    const [newPin, setNewPin] = useState('');
    const [confirmPin, setConfirmPin] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    /* ── Animation refs ── */
    const shakeAnim = useRef(new Animated.Value(0)).current;
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(40)).current;
    const stepFade = useRef(new Animated.Value(1)).current;

    /* ── Derived ── */
    const serviceLabel = getPinServiceLabel(service);
    const [answers, setAnswers] = useState([]);

    const [showEmailRecovery, setShowEmailRecovery] = useState(false);
    const [otpVisible, setOtpVisible] = useState(false);
    /* ────────────────────────────────────────────
       On modal open → reset everything + load question
    ──────────────────────────────────────────── */
    useEffect(() => {
        if (visible) {
            resetAll();
            loadQuestion();
            slideAnim.setValue(40);
            fadeAnim.setValue(0);
            Animated.parallel([
                Animated.timing(fadeAnim, { toValue: 1, duration: 280, useNativeDriver: true }),
                Animated.timing(slideAnim, { toValue: 0, duration: 280, useNativeDriver: true }),
            ]).start();
        }
    }, [visible]);

    const resetAll = () => {
        setStep(STEP_VERIFY);
        setAnswer('');
        setNewPin('');
        setConfirmPin('');
        setError('');
        setLoading(false);
        setQuestion(null);
    };

    const loadQuestion = async () => {
        setQLoading(true);
        try {
            const q = await getSecurityQuestion();
            setQuestion(q);

            // ✅ NEW: initialize answers array
            if (Array.isArray(q)) {
                setAnswers(new Array(q.length).fill(''));
            }

        } catch {
            setQuestion(null);
        } finally {
            setQLoading(false);
        }
    };


    const handleAnswerChange = (text, index) => {
        const updated = [...answers];
        updated[index] = text;
        setAnswers(updated);
    };

   const handleSendOtp = async () => {
    try {
        console.log("OTP sent");

        // // ✅ CLOSE CURRENT MODAL
        // onClose && onClose();

         // ✅ Tell parent to handle modal switch
    onEmailFlow && onEmailFlow();
    
        // ✅ OPEN OTP MODAL
        setTimeout(() => {
            setOtpVisible(true);
        }, 300);

    } catch (error) {
        console.log(error);
    }
};


    /* ────────────────────────────────────────────
       Step transition with fade animation
    ──────────────────────────────────────────── */
    const goToStep = (nextStep) => {
        Animated.timing(stepFade, {
            toValue: 0, duration: 150, useNativeDriver: true,
        }).start(() => {
            setError('');
            setStep(nextStep);
            Animated.timing(stepFade, {
                toValue: 1, duration: 200, useNativeDriver: true,
            }).start();
        });
    };

    /* ────────────────────────────────────────────
       Shake + vibrate on wrong input
    ──────────────────────────────────────────── */
    const triggerShake = () => {
        Vibration.vibrate(120);
        Animated.sequence([
            Animated.timing(shakeAnim, { toValue: -10, duration: 55, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: 10, duration: 55, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: -8, duration: 55, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: 0, duration: 55, useNativeDriver: true }),
        ]).start();
    };

    /* ────────────────────────────────────────────
       Keypad input handler (reusable)
    ──────────────────────────────────────────── */
    const handleKeyPress = useCallback((key, setter, current) => {
        if (key === 'backspace') {
            setter(current.slice(0, -1));
        } else if (current.length < 6) {
            setter(current + key);
        }
    }, []);

    /* ────────────────────────────────────────────
       STEP 1: Verify security question answer
    ──────────────────────────────────────────── */
    const handleVerifyAnswer = async () => {

        // ✅ VALIDATION (multi + single support)
        if (Array.isArray(question)) {
            const hasEmpty = answers.some(a => !a || !a.trim());

            if (hasEmpty) {
                setError('Please answer all security questions.');
                triggerShake();
                return;
            }
        } else {
            if (!answer.trim()) {
                setError('Please enter your security answer.');
                triggerShake();
                return;
            }
        }

        setLoading(true);
        setError('');

        try {

            // ✅ BUILD CORRECT PAYLOAD
            let payloadAnswers = [];

            if (Array.isArray(question)) {
                payloadAnswers = question.map((q, index) => ({
                    question_id: q.id,
                    answer: answers[index]?.trim() || ''
                }));
            } else {
                payloadAnswers = [
                    {
                        question_id: question?.id || 1,
                        answer: answer.trim()
                    }
                ];
            }

            // ✅ API CALL
            const result = await verifySecurityAnswer(payloadAnswers);

            // ✅ HANDLE RESPONSE


            if (!result.valid) {
                setError(result.error || 'Incorrect answer. Please try again.');

                // ✅ NEW: show email recovery after 3 failed attempts
                if (result.attemptsLeft !== undefined && result.attemptsLeft <= 2) {
                    setShowEmailRecovery(true);
                }

                triggerShake();
                return;
            }

            // ✅ SUCCESS → NEXT STEP
            goToStep(STEP_NEW_PIN);

        } catch (error) {
            setError('Verification failed. Please try again.');
            triggerShake();
        } finally {
            setLoading(false);
        }
    };
    /* ────────────────────────────────────────────
       STEP 2: Auto-advance when 6 digits entered
    ──────────────────────────────────────────── */
    useEffect(() => {
        if (step === STEP_NEW_PIN && newPin.length === 6) {
            const t = setTimeout(() => goToStep(STEP_CONFIRM), 220);
            return () => clearTimeout(t);
        }
    }, [newPin, step]);

    /* ────────────────────────────────────────────
       STEP 3: Auto-confirm when 6 digits entered
    ──────────────────────────────────────────── */
    useEffect(() => {
        if (step === STEP_CONFIRM && confirmPin.length === 6) {
            const t = setTimeout(() => handleConfirmPin(), 220);
            return () => clearTimeout(t);
        }
    }, [confirmPin, step]);

    const handleConfirmPin = async () => {
        if (confirmPin !== newPin) {
            setError('PINs do not match. Please try again.');
            setConfirmPin('');
            triggerShake();
            return;
        }
        setLoading(true);
        setError('');
        try {
            const result = await forceResetPin(service, newPin);
            if (!result.success) {
                setError(result.error || 'Failed to reset PIN. Please try again.');
                setConfirmPin('');
                triggerShake();
                return;
            }
            goToStep(STEP_SUCCESS);
        } catch {
            setError('Failed to reset PIN. Please try again.');
            setConfirmPin('');
            triggerShake();
        } finally {
            setLoading(false);
        }
    };

    /* ────────────────────────────────────────────
       STEP 4: Auto-close success after 1.8s
    ──────────────────────────────────────────── */
    useEffect(() => {
        if (step === STEP_SUCCESS) {
            const t = setTimeout(() => {
                onSuccess && onSuccess();
            }, 1800);
            return () => clearTimeout(t);
        }
    }, [step]);

    /* ────────────────────────────────────────────
       RENDER HELPERS
    ──────────────────────────────────────────── */

    const renderError = () =>
        error ? (
            <View style={ForgotPinStyles.errorBox}>
                <Icon name="error-outline" size={14} color={Colors.danger} />
                <Text style={ForgotPinStyles.errorText}>{error}</Text>
            </View>
        ) : null;

    /* ── Step Badge labels ── */
    const BADGE_LABELS = {
        [STEP_VERIFY]: 'Step 1 of 3  •  Verify Identity',
        [STEP_NEW_PIN]: 'Step 2 of 3  •  New PIN',
        [STEP_CONFIRM]: 'Step 3 of 3  •  Confirm PIN',
        [STEP_SUCCESS]: '✓  Complete',
    };

    /* ─────────────────────────────────────────
       STEP 1 RENDER — Security Question
    ───────────────────────────────────────── */
    const renderVerifyStep = () => (
        <>
            <Text style={ForgotPinStyles.title}>Forgot Your PIN?</Text>
            <Text style={ForgotPinStyles.description}>
                Answer your security question to verify your identity, then set a new PIN.
            </Text>

            {/* Service label pill */}
            <View style={ForgotPinStyles.servicePill}>
                <View style={ForgotPinStyles.servicePillDot} />
                <Text style={ForgotPinStyles.servicePillText}>{serviceLabel}</Text>
            </View>

            {/* Security question card */}
            {qLoading ? (
                <View style={ForgotPinStyles.loadingRow}>
                    <ActivityIndicator size="small" color={Colors.primary} />
                    <Text style={ForgotPinStyles.loadingText}>Loading security question...</Text>
                </View>
            ) : question ? (
                <View style={ForgotPinStyles.questionCard}>
                    <Text style={ForgotPinStyles.questionLabel}>YOUR SECURITY QUESTION</Text>

                    {/* ✅ FIX: handle object/array safely */}
                    {Array.isArray(question) ? (
                        question.map((item, index) => (
                            <Text key={item.id || index} style={ForgotPinStyles.questionText}>
                                {index + 1}. {item.question}
                            </Text>
                        ))
                    ) : (
                        <Text style={ForgotPinStyles.questionText}>
                            {typeof question === 'object' ? question.question : question}
                        </Text>
                    )}

                </View>
            ) : (
                <View style={[ForgotPinStyles.questionCard, ForgotPinStyles.questionCardError]}>
                    <Text style={ForgotPinStyles.questionLabel}>SECURITY QUESTION</Text>
                    <Text style={[ForgotPinStyles.questionText, ForgotPinStyles.questionTextError]}>
                        No security question found. Please contact support or re-install the app.
                    </Text>
                </View>
            )}

            {/* Answer text input */}
            {Array.isArray(question) ? (
                question.map((item, index) => (
                    <View key={item.id || index} style={{ marginBottom: 12 }}>

                        <Text style={ForgotPinStyles.questionText}>
                            {index + 1}. {item.question}
                        </Text>

                        <TextInput
                            style={[
                                ForgotPinStyles.answerInput,
                                answerFocused && ForgotPinStyles.answerInputFocused,
                            ]}
                            placeholder="Type your answer here..."
                            value={answers[index] || ''}
                            onChangeText={(t) => {
                                handleAnswerChange(t, index);
                                setError('');
                            }}
                        />

                    </View>
                ))
            ) : (
                <TextInput
                    style={[
                        ForgotPinStyles.answerInput,
                        answerFocused && ForgotPinStyles.answerInputFocused,
                    ]}
                    placeholder="Type your answer here..."
                    value={answer}
                    onChangeText={(t) => { setAnswer(t); setError(''); }}
                />
            )}

            {renderError()}

          

            {/* Action buttons */}
            <View style={ForgotPinStyles.btnRow}>
                <TouchableOpacity
                    style={ForgotPinStyles.cancelBtn}
                    onPress={onClose}
                    activeOpacity={0.75}
                >
                    <Text style={ForgotPinStyles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[
                        ForgotPinStyles.primaryBtn,
                        (
                            (Array.isArray(question)
                                ? (question.length === 0 || answers.some(a => !a || !a.trim()))
                                : !answer.trim()
                            ) || loading
                        ) && ForgotPinStyles.primaryBtnDisabled,
                    ]}
                    onPress={handleVerifyAnswer}
                    activeOpacity={0.75}
                    disabled={
                        (Array.isArray(question)
                            ? (question.length === 0 || answers.some(a => !a || !a.trim()))
                            : !answer.trim()
                        ) || loading
                    }
                >
                    <Text style={ForgotPinStyles.primaryBtnText}>
                        {loading ? 'Verifying...' : 'Verify Answer'}
                    </Text>
                </TouchableOpacity>


            </View>
             

  {/* ✅ NEW: Email recovery option */}
           <TouchableOpacity
  onPress={handleSendOtp}
  style={{ marginTop: 12, alignItems: 'center' }}
>
  <Text style={{ color: '#6C63FF', fontWeight: '600' }}>
    Forgot via Email?
  </Text>
</TouchableOpacity>

        </>
    );

    /* ─────────────────────────────────────────
       STEP 2 RENDER — Enter New PIN
    ───────────────────────────────────────── */
    const renderNewPinStep = () => (
        <>
            <Text style={ForgotPinStyles.title}>Set New PIN</Text>
            <Text style={ForgotPinStyles.description}>
                Enter a new 6-digit PIN for your{'\n'}
                <Text style={ForgotPinStyles.descriptionAccent}>{serviceLabel}</Text>.
            </Text>

            <PinDots value={newPin} shakeAnim={shakeAnim} />
            {renderError()}

            <NumericKeypad
                onKeyPress={(k) => {
                    setError('');
                    handleKeyPress(k, setNewPin, newPin);
                }}
            />

            {/* Back link */}
            <TouchableOpacity
                style={ForgotPinStyles.backLink}
                onPress={() => { goToStep(STEP_VERIFY); setNewPin(''); }}
                activeOpacity={0.7}
            >
                <Icon name="arrow-back" size={14} color={Colors.primary} />
                <Text style={ForgotPinStyles.backLinkText}>Back to verification</Text>
            </TouchableOpacity>
        </>
    );

    /* ─────────────────────────────────────────
       STEP 3 RENDER — Confirm New PIN
    ───────────────────────────────────────── */
    const renderConfirmStep = () => (
        <>
            <Text style={ForgotPinStyles.title}>Confirm New PIN</Text>
            <Text style={ForgotPinStyles.description}>
                Re-enter the same 6-digit PIN to confirm.
            </Text>

            <PinDots value={confirmPin} shakeAnim={shakeAnim} />
            {renderError()}

            {loading ? (
                <View style={ForgotPinStyles.loadingRow}>
                    <ActivityIndicator size="small" color={Colors.primary} />
                    <Text style={ForgotPinStyles.loadingText}>Saving new PIN...</Text>
                </View>
            ) : (
                <NumericKeypad
                    onKeyPress={(k) => {
                        setError('');
                        handleKeyPress(k, setConfirmPin, confirmPin);
                    }}
                />
            )}

            {/* Back link */}
            <TouchableOpacity
                style={ForgotPinStyles.backLink}
                onPress={() => { goToStep(STEP_NEW_PIN); setConfirmPin(''); setNewPin(''); }}
                activeOpacity={0.7}
            >
                <Icon name="arrow-back" size={14} color={Colors.primary} />
                <Text style={ForgotPinStyles.backLinkText}>Re-enter new PIN</Text>
            </TouchableOpacity>
        </>
    );

    /* ─────────────────────────────────────────
       STEP 4 RENDER — Success
    ───────────────────────────────────────── */
    const renderSuccessStep = () => (
        <View style={ForgotPinStyles.successContainer}>
            <View style={ForgotPinStyles.successIconCircle}>
                <Icon name="check-circle" size={44} color={Colors.secondary} />
            </View>
            <Text style={ForgotPinStyles.successTitle}>PIN Reset Successful!</Text>
            <Text style={ForgotPinStyles.successDesc}>
                Your{' '}
                <Text style={ForgotPinStyles.successDescAccent}>{serviceLabel}</Text>
                {' '}has been updated.{'\n'}Use your new PIN to unlock.
            </Text>
            <TouchableOpacity
                style={ForgotPinStyles.successBtn}
                onPress={() => onSuccess && onSuccess()}
                activeOpacity={0.8}
            >
                <Text style={ForgotPinStyles.successBtnText}>Done</Text>
            </TouchableOpacity>
        </View>
    );

    /* ─────────────────────────────────────────
       MAIN RENDER
    ───────────────────────────────────────── */
    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
            statusBarTranslucent
        >
            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            >
                <ScrollView
                    contentContainerStyle={ForgotPinStyles.overlay}
                    keyboardShouldPersistTaps="handled"
                    scrollEnabled={false}
                >
                    <Animated.View
                        style={[
                            ForgotPinStyles.container,
                            {
                                opacity: fadeAnim,
                                transform: [{ translateY: slideAnim }],
                            },
                        ]}
                    >
                        {/* ── Top bar: icon + close button ── */}
                        <View style={ForgotPinStyles.headerRow}>
                            <View style={ForgotPinStyles.headerLeft}>
                                <Icon name="lock-reset" size={20} color={Colors.primary} />
                                <Text style={ForgotPinStyles.headerTitle}>Reset PIN</Text>
                            </View>
                            {step !== STEP_SUCCESS && (
                                <TouchableOpacity
                                    style={ForgotPinStyles.closeBtn}
                                    onPress={onClose}
                                    activeOpacity={0.7}
                                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                >
                                    <Icon name="close" size={22} color={Colors.textSecondary} />
                                </TouchableOpacity>
                            )}
                        </View>

                        {/* ── Step badge ── */}
                        <View style={ForgotPinStyles.badge}>
                            <Text style={ForgotPinStyles.badgeText}>{BADGE_LABELS[step]}</Text>
                        </View>

                        <View style={ForgotPinStyles.divider} />

                        {/* ── Step content (fades on transition) ── */}
                        <Animated.View style={{ opacity: stepFade }}>
                            {step === STEP_VERIFY && renderVerifyStep()}
                            {step === STEP_NEW_PIN && renderNewPinStep()}
                            {step === STEP_CONFIRM && renderConfirmStep()}
                            {step === STEP_SUCCESS && renderSuccessStep()}
                        </Animated.View>

                    </Animated.View>
                </ScrollView>
            </KeyboardAvoidingView>

            {/* ✅ ADD HERE (IMPORTANT) */}
            <EmailOtpModal
                visible={otpVisible}
                onClose={() => setOtpVisible(false)}
                onVerified={() => {
                    setOtpVisible(false);       // close email modal
                   goToStep(STEP_NEW_PIN);     // go directly to "Set New PIN" step
                }}
            />

        </Modal>
    );
};

export default ForgotPinModal;