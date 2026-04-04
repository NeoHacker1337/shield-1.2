import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator
} from 'react-native';

import { sendOtp, verifyOtp } from '../../services/otpService';

const EmailOtpModal = ({ visible, onClose, onVerified }) => {

  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState('email');
  const [loading, setLoading] = useState(false);

  const [resendTimer, setResendTimer] = useState(120);
  const [canResend, setCanResend] = useState(false);

  const [otpExpiry, setOtpExpiry] = useState(null);

  /* ─────────────────────────────
     TIMER LOGIC
  ───────────────────────────── */
  useEffect(() => {
    let interval;

    if (step === 'otp' && resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer(prev => prev - 1);
      }, 1000);
    }

    if (resendTimer === 0) {
      setCanResend(true);
    }

    return () => clearInterval(interval);
  }, [resendTimer, step]);

  /* ─────────────────────────────
     SEND OTP
  ───────────────────────────── */
  const handleSendOtp = async () => {
    if (!email.trim()) return;

    setLoading(true);

    try {
      const res = await sendOtp({
        email,
        pin_type: 'pin_reset'
      });

      if (res.success) {
        setStep('otp');

        // ✅ Start resend timer
        setResendTimer(120);
        setCanResend(false);

        // ✅ Set expiry (10 min)
        setOtpExpiry(Date.now() + 10 * 60 * 1000);

      } else {
        alert(res.message || 'Failed to send OTP');
      }

    } catch (e) {
      console.log(e);
    } finally {
      setLoading(false);
    }
  };

  /* ─────────────────────────────
     VERIFY OTP
  ───────────────────────────── */
  const handleVerifyOtp = async () => {
    if (!otp.trim()) return;

    // ❌ Expiry check
    if (otpExpiry && Date.now() > otpExpiry) {
      alert('OTP expired. Please request a new one.');
      return;
    }

    setLoading(true);

    try {
      const res = await verifyOtp({
        email,
        otp,
        pin_type: 'pin_reset'
      });

      if (res.success) {
        onVerified();
      } else {
        alert(res.message || 'Invalid OTP');
      }

    } catch (e) {
      console.log(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.6)'
      }}>

        <View style={{
          width: '85%',
          backgroundColor: '#1E293B',
          borderRadius: 16,
          padding: 20
        }}>

          <Text style={{
            fontSize: 18,
            fontWeight: '600',
            color: '#fff',
            marginBottom: 15
          }}>
            {step === 'email' ? 'Verify via Email' : 'Enter OTP'}
          </Text>

          {step === 'email' ? (
            <>
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="Enter your email"
                placeholderTextColor="#aaa"
                style={{
                  borderWidth: 1,
                  borderColor: '#444',
                  borderRadius: 10,
                  padding: 12,
                  color: '#fff',
                  marginBottom: 15
                }}
              />

              <TouchableOpacity
                onPress={handleSendOtp}
                style={{
                  backgroundColor: '#3B82F6',
                  padding: 12,
                  borderRadius: 10,
                  alignItems: 'center'
                }}
              >
                {loading
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={{ color: '#fff', fontWeight: '600' }}>Send OTP</Text>
                }
              </TouchableOpacity>
            </>
          ) : (
            <>
              <TextInput
                value={otp}
                onChangeText={setOtp}
                placeholder="Enter OTP"
                placeholderTextColor="#aaa"
                keyboardType="number-pad"
                style={{
                  borderWidth: 1,
                  borderColor: '#444',
                  borderRadius: 10,
                  padding: 12,
                  color: '#fff',
                  marginBottom: 15
                }}
              />

              <TouchableOpacity
                onPress={handleVerifyOtp}
                style={{
                  backgroundColor: '#10B981',
                  padding: 12,
                  borderRadius: 10,
                  alignItems: 'center'
                }}
              >
                {loading
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={{ color: '#fff', fontWeight: '600' }}>Verify OTP</Text>
                }
              </TouchableOpacity>

              {/* ⏱ Resend Timer */}
              <View style={{ marginTop: 12, alignItems: 'center' }}>
                {!canResend ? (
                  <Text style={{ color: '#aaa' }}>
                    Resend OTP in {resendTimer}s
                  </Text>
                ) : (
                  <TouchableOpacity onPress={handleSendOtp}>
                    <Text style={{ color: '#6C63FF', fontWeight: '600' }}>
                      Resend OTP
                    </Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* ⏳ Expiry Info */}
              <Text style={{
                color: '#ff6b6b',
                textAlign: 'center',
                marginTop: 8
              }}>
                OTP valid for 10 minutes
              </Text>
            </>
          )}

          <TouchableOpacity
            onPress={onClose}
            style={{ marginTop: 15, alignItems: 'center' }}
          >
            <Text style={{ color: '#aaa' }}>Cancel</Text>
          </TouchableOpacity>

        </View>
      </View>
    </Modal>
  );
};

export default EmailOtpModal;