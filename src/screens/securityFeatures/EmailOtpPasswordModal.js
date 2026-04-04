import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    Modal,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    ActivityIndicator
} from 'react-native';

import AuthService from '../../services/AuthService';
import { sendOtp, verifyOtp } from '../../services/otpService';

const EmailOtpPasswordModal = ({ visible, onClose }) => {

    const [step, setStep] = useState(1);
    const [email, setEmail] = useState('');
    const [otp, setOtp] = useState('');
    const [password, setPassword] = useState('');

    const [timer, setTimer] = useState(600); // 10 min
    const [resendTimer, setResendTimer] = useState(30);

    const [loading, setLoading] = useState(false);

    /* ---------------- LOAD EMAIL ---------------- */
    useEffect(() => {
        if (visible) loadEmail();
    }, [visible]);

    const loadEmail = async () => {
        const user = await AuthService.getCurrentUser();
        setEmail(user?.email || '');
    };

    /* ---------------- OTP TIMER ---------------- */
    useEffect(() => {
        let interval;

        if (step === 2 && timer > 0) {
            interval = setInterval(() => {
                setTimer(prev => prev - 1);
            }, 1000);
        }

        return () => clearInterval(interval);
    }, [step, timer]);

    /* ---------------- RESEND TIMER ---------------- */
    useEffect(() => {
        let interval;

        if (step === 2 && resendTimer > 0) {
            interval = setInterval(() => {
                setResendTimer(prev => prev - 1);
            }, 1000);
        }

        return () => clearInterval(interval);
    }, [step, resendTimer]);

    const formatTime = () => {
        const min = Math.floor(timer / 60);
        const sec = timer % 60;
        return `${min}:${sec < 10 ? '0' : ''}${sec}`;
    };

    /* ---------------- VALIDATION ---------------- */
    const isPasswordValid = () => {
        return password.length >= 6;
    };

    /* ---------------- SEND OTP ---------------- */
    const handleSendOtp = async () => {
        try {
            setLoading(true);

            await sendOtp({
                email,
                pin_type: 'password_change'
            });

            setStep(2);
            setTimer(600);
            setResendTimer(30);

        } catch (e) {
            alert(e.message || 'Failed to send OTP');
        } finally {
            setLoading(false);
        }
    };

    /* ---------------- RESEND OTP ---------------- */
    const handleResendOtp = async () => {
        try {
            setLoading(true);

            await sendOtp({
                email,
                pin_type: 'password_change'
            });

            setResendTimer(30);

        } catch (e) {
            alert('Failed to resend OTP');
        } finally {
            setLoading(false);
        }
    };

    /* ---------------- CHANGE PASSWORD ---------------- */
    const handleChangePassword = async () => {
        try {
            setLoading(true);

            const res = await AuthService.changePassword({
                email,
                password,
                otp
            });

            if (res.success) {

                await AuthService.storeEncryptedCredentials(email, password);

                alert('✅ Password changed successfully');

                resetState();
                onClose();

            } else {
                // server validation message shown here
                alert(res.message || 'Failed to change password');
            }

        } catch (e) {
            // show backend error
            alert(e.message || 'Something went wrong');
        } finally {
            setLoading(false);
        }
    };
    /* ---------------- handle Verify ---------------- */

    const handleVerifyOtp = async () => {
        try {
            setLoading(true);

            const res = await verifyOtp({
                email,
                otp,
                pin_type: 'password_change'
            });

            if (res.success) {
                setStep(3);
            } else {
                alert(res.message || 'Invalid OTP');
            }

        } catch (e) {
            alert(e.message || 'OTP verification failed');
        } finally {
            setLoading(false);
        }
    };

    /* ---------------- RESET ---------------- */
    const resetState = () => {
        setStep(1);
        setOtp('');
        setPassword('');
        setTimer(600);
        setResendTimer(30);
    };

    /* ---------------- UI ---------------- */

    return (
        <Modal visible={visible} transparent animationType="fade">
            <View style={styles.container}>
                <View style={styles.box}>

                    <Text style={styles.title}>Change Password</Text>

                    {/* STEP 1 */}
                    {step === 1 && (
                        <>
                            <Text style={styles.label}>Registered Email</Text>
                            <Text style={styles.email}>{email}</Text>

                            <TouchableOpacity
                                style={styles.button}
                                onPress={handleSendOtp}
                                disabled={loading}
                            >
                                {loading
                                    ? <ActivityIndicator color="#fff" />
                                    : <Text style={styles.btnText}>Send OTP</Text>}
                            </TouchableOpacity>
                        </>
                    )}

                    {/* STEP 2 */}
                    {step === 2 && (
                        <>
                            <TextInput
                                placeholder="Enter OTP"
                                value={otp}
                                onChangeText={setOtp}
                                style={styles.input}
                                keyboardType="number-pad"
                            />

                            <Text style={styles.timer}>
                                OTP expires in {formatTime()}
                            </Text>

                            {timer === 0 && (
                                <Text style={styles.expired}>OTP Expired</Text>
                            )}

                            {/* RESEND */}
                            {resendTimer > 0 ? (
                                <Text style={styles.resend}>
                                    Resend OTP in {resendTimer}s
                                </Text>
                            ) : (
                                <TouchableOpacity onPress={handleResendOtp}>
                                    <Text style={styles.resendActive}>
                                        Resend OTP
                                    </Text>
                                </TouchableOpacity>
                            )}

                            <TouchableOpacity
                                style={styles.button}
                                onPress={handleVerifyOtp}
                                disabled={loading || timer === 0}
                            >
                                {loading
                                    ? <ActivityIndicator color="#fff" />
                                    : <Text style={styles.btnText}>Verify OTP</Text>}
                            </TouchableOpacity>
                        </>
                    )}

                    {/* STEP 3 */}
                    {step === 3 && (
                        <>
                            <TextInput
                                placeholder="Enter New Password"
                                value={password}
                                onChangeText={setPassword}
                                style={styles.input}
                                secureTextEntry
                            />

                            <Text style={styles.hint}>
                                Minimum 6 characters required
                            </Text>

                            <TouchableOpacity
                                style={styles.button}
                                onPress={handleChangePassword}
                                disabled={loading}
                            >
                                {loading
                                    ? <ActivityIndicator color="#fff" />
                                    : <Text style={styles.btnText}>Change Password</Text>}
                            </TouchableOpacity>
                        </>
                    )}

                    {/* CLOSE */}
                    <TouchableOpacity onPress={() => { resetState(); onClose(); }}>
                        <Text style={styles.close}>Cancel</Text>
                    </TouchableOpacity>

                </View>
            </View>
        </Modal>
    );
};

export default EmailOtpPasswordModal;

/* ---------------- STYLES ---------------- */

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center'
    },
    box: {
        width: '88%',
        backgroundColor: '#fff',
        padding: 20,
        borderRadius: 14
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 15
    },
    label: {
        fontSize: 13,
        color: '#666'
    },
    email: {
        fontSize: 15,
        fontWeight: '600',
        marginBottom: 15
    },
    input: {
        borderWidth: 1,
        borderColor: '#ddd',
        padding: 12,
        borderRadius: 8,
        marginBottom: 10
    },
    button: {
        backgroundColor: '#6C63FF',
        padding: 14,
        borderRadius: 8,
        alignItems: 'center',
        marginTop: 10
    },
    btnText: {
        color: '#fff',
        fontWeight: 'bold'
    },
    timer: {
        fontSize: 12,
        color: '#666'
    },
    expired: {
        color: 'red',
        fontSize: 12,
        marginTop: 4
    },
    resend: {
        fontSize: 12,
        color: '#999',
        marginTop: 5
    },
    resendActive: {
        fontSize: 13,
        color: '#6C63FF',
        marginTop: 5,
        fontWeight: '600'
    },
    hint: {
        fontSize: 12,
        color: '#888',
        marginBottom: 5
    },
    close: {
        textAlign: 'center',
        marginTop: 15,
        color: '#888'
    }
});