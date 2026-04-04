import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    Alert,
    Modal,
    FlatList,
    Animated,
    ScrollView,
    Platform,
    Dimensions,
    BackHandler,
    Easing,
    KeyboardAvoidingView,
    TouchableWithoutFeedback,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import CustomDrawerContent from '../../components/CustomDrawerContent';
import styles from '../../assets/ShowSecurityQuestionStyles';
const ShowSecurityQuestionScreen = ({ navigation }) => {
    const { width } = Dimensions.get('window');

    const [question1, setQuestion1] = useState('');
    const [answer1, setAnswer1] = useState('');
    const [question2, setQuestion2] = useState('');
    const [answer2, setAnswer2] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [activeQuestionField, setActiveQuestionField] = useState(null);
    // NEW STATE: Track if security questions are loaded
    const [securityQuestionsLoaded, setSecurityQuestionsLoaded] = useState(false);

    // Drawer State
    const [drawerOpen, setDrawerOpen] = useState(false);
    const drawerWidth = width * 0.75;
    const drawerOffset = useRef(new Animated.Value(-drawerWidth)).current;
    const overlayOpacity = useRef(new Animated.Value(0)).current;

    const securityQuestions = [
        "What was your first pet's name?",
        "What city were you born in?",
        "What was your mother's maiden name?",
        "What was the name of your first school?",
        "What was your childhood nickname?"
    ];

    // Load security questions on component mount
    useEffect(() => {
        const loadSecurityQuestions = async () => {
            try {
                const storedData = await AsyncStorage.multiGet([
                    '@security_question_1',
                    '@security_answer_1',
                    '@security_question_2',
                    '@security_answer_2',
                ]);

                const data = storedData.reduce((acc, [key, value]) => {
                    if (key && value !== null) {
                        acc[key] = value;
                    }
                    return acc;
                }, {});

                // Check if ALL four pieces of data are present
                const allDataPresent =
                    data['@security_question_1'] &&
                    data['@security_answer_1'] &&
                    data['@security_question_2'] &&
                    data['@security_answer_2'];

                if (allDataPresent) {
                    setQuestion1(data['@security_question_1']);
                    setAnswer1(data['@security_answer_1']);
                    setQuestion2(data['@security_question_2']);
                    setAnswer2(data['@security_answer_2']);
                    // NEW: Set securityQuestionsLoaded to true
                    setSecurityQuestionsLoaded(true);
                    console.log('✅ Security questions loaded and complete:', data);
                } else {
                    // NEW: Ensure it's false if not all data is present
                    setSecurityQuestionsLoaded(false);
                    console.log('⚠️ Security questions incomplete or not found.');
                }
            } catch (error) {
                console.error('❌ Error loading security questions:', error);
                setSecurityQuestionsLoaded(false); // Ensure false on error
            }
        };

        loadSecurityQuestions();
    }, []);

    // Add drawer animation
    useEffect(() => {
        Animated.parallel([
            Animated.timing(drawerOffset, {
                toValue: drawerOpen ? 0 : -drawerWidth,
                duration: 300,
                useNativeDriver: true,
                easing: Easing.inOut(Easing.ease)
            }),
            Animated.timing(overlayOpacity, {
                toValue: drawerOpen ? 0.5 : 0,
                duration: 300,
                useNativeDriver: true,
            })
        ]).start();
    }, [drawerOpen, drawerWidth, drawerOffset, overlayOpacity]);

    // Add back handler
    useEffect(() => {
        const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
            if (drawerOpen) {
                setDrawerOpen(false);
                return true;
            }
            return false;
        });

        return () => backHandler.remove();
    }, [drawerOpen]);

    const storeSecurityQuestions = async (q1, a1, q2, a2) => {
        try {
            await AsyncStorage.multiSet([
                ['@security_question_1', q1.trim()],
                ['@security_answer_1', a1.toLowerCase().trim()],
                ['@security_question_2', q2.trim()],
                ['@security_answer_2', a2.toLowerCase().trim()],
            ]);
            console.log('✅ Security questions saved.');
            // NEW: Set to true after successful save
            setSecurityQuestionsLoaded(true);
            return true;
        } catch (error) {
            console.error('❌ Storage Error:', error);
            return false;
        }
    };

    const handleComplete = async () => {
        if (!question1 || !answer1 || !question2 || !answer2) {
            Alert.alert('Incomplete', 'Please answer all security questions.');
            return;
        }

        if (question1 === question2) {
            Alert.alert('Invalid', 'Please select different questions.');
            return;
        }

        if (answer1.trim().length < 2 || answer2.trim().length < 2) {
            Alert.alert('Short Answer', 'Answers must be at least 2 characters.');
            return;
        }

        const stored = await storeSecurityQuestions(question1, answer1, question2, answer2);

        if (stored) {
            Alert.alert('Success', 'Security questions saved.', [
                { text: 'Continue', onPress: () => navigation.navigate('PasswordEntry') },
            ]);
        } else {
            Alert.alert('Error', 'Something went wrong while saving.');
        }
    };

    const openQuestionPicker = (field) => {
        setActiveQuestionField(field);
        setShowModal(true);
    };

    const selectQuestion = (question) => {
        activeQuestionField === 1 ? setQuestion1(question) : setQuestion2(question);
        setShowModal(false);
    };

    const renderQuestionItem = ({ item }) => (
        <TouchableOpacity style={styles.questionItem} onPress={() => selectQuestion(item)}>
            <Text style={styles.questionText}>{item}</Text>
        </TouchableOpacity>
    );

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.container}
        >
            {/* Drawer Overlay */}
            {drawerOpen && (
                <TouchableWithoutFeedback onPress={() => setDrawerOpen(false)}>
                    <Animated.View
                        style={[
                            StyleSheet.absoluteFill,
                            {
                                backgroundColor: '#000',
                                opacity: overlayOpacity,
                                zIndex: 1
                            }
                        ]}
                    />
                </TouchableWithoutFeedback>
            )}

            {/* Drawer - Pass securityQuestionsLoaded prop */}
            <Animated.View
                style={[
                    styles.drawer,
                    {
                        width: drawerWidth,
                        transform: [{ translateX: drawerOffset }],
                    }
                ]}
            >
                <CustomDrawerContent
                    navigation={navigation}
                    closeDrawer={() => setDrawerOpen(false)}
                    // NEW PROP: Pass the state to the drawer
                    showNavigationButtons={securityQuestionsLoaded}
                />
            </Animated.View>

            {/* Menu Button - Conditionally rendered only when drawer is NOT open */}
            {!drawerOpen && (
                <TouchableOpacity
                    style={styles.menuButton}
                    onPress={() => setDrawerOpen(true)}
                >
                    <Text style={styles.menuButtonText}>☰</Text>
                </TouchableOpacity>
            )}

            <ScrollView
                style={styles.scrollContainer}
                contentContainerStyle={styles.content}
                keyboardShouldPersistTaps="handled"
            >
                <View style={styles.card}>
                    <Text style={styles.title}>Security Questions</Text>
                    <Text style={styles.subtitle}>
                        Set up security questions for password recovery
                    </Text>

                    <Text style={styles.label}>Question 1</Text>
                    <TouchableOpacity
                        style={styles.questionSelector}
                        onPress={() => openQuestionPicker(1)}
                    >
                        <Text style={[styles.selectorText, !question1 && styles.placeholder]}>
                            {question1 || 'Select a question...'}
                        </Text>
                    </TouchableOpacity>
                    <TextInput
                        style={styles.input}
                        placeholder="Your answer"
                        placeholderTextColor="#999"
                        value={answer1}
                        onChangeText={setAnswer1}
                        autoCapitalize="none"
                    />

                    <Text style={styles.label}>Question 2</Text>
                    <TouchableOpacity
                        style={styles.questionSelector}
                        onPress={() => openQuestionPicker(2)}
                    >
                        <Text style={[styles.selectorText, !question2 && styles.placeholder]}>
                            {question2 || 'Select a question...'}
                        </Text>
                    </TouchableOpacity>
                    <TextInput
                        style={styles.input}
                        placeholder="Your answer"
                        placeholderTextColor="#999"
                        value={answer2}
                        onChangeText={setAnswer2}
                        autoCapitalize="none"
                    />

                    <TouchableOpacity style={styles.button} onPress={handleComplete}>
                        <Text style={styles.buttonText}>Complete Setup</Text>
                    </TouchableOpacity>
                </View>

                {/* Modal */}
                <Modal
                    visible={showModal}
                    transparent
                    animationType="slide"
                    onRequestClose={() => setShowModal(false)}
                >
                    <View style={styles.modalOverlay}>
                        <View style={styles.modalContent}>
                            <Text style={styles.modalTitle}>Select a Security Question</Text>
                            <FlatList
                                data={securityQuestions}
                                renderItem={renderQuestionItem}
                                keyExtractor={(item, index) => index.toString()}
                                showsVerticalScrollIndicator={false}
                            />
                            <TouchableOpacity
                                style={styles.cancelButton}
                                onPress={() => setShowModal(false)}
                            >
                                <Text style={styles.cancelText}>Cancel</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </Modal>
            </ScrollView>
        </KeyboardAvoidingView>
    );
};

export default ShowSecurityQuestionScreen;