// src/screens/auth/OtpScreen.tsx
import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  TextInput, KeyboardAvoidingView, Platform, ActivityIndicator,
  Clipboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from 'react-native';
import { getTheme, fonts, fontSizes, spacing, radii } from '../../types/theme';
import { RootStackScreenProps } from '../../types/navigation';
import AuthApi from '../../api/auth.api';
import { ApiError } from '../../api/client';

type Props = RootStackScreenProps<'OtpVerify'>;
const OTP_LEN = 6;

export const OtpScreen: React.FC<Props> = ({ navigation, route }) => {
  const T = getTheme(useColorScheme());
  const { phone, mode, username } = route.params;

  const [otp,       setOtp]       = useState('');
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState('');
  const [resending, setResending] = useState(false);
  const [countdown, setCountdown] = useState(30);

  const inputRef = useRef<TextInput>(null);

  // Auto focus
  useEffect(() => { inputRef.current?.focus(); }, []);

  // Countdown timer
  useEffect(() => {
    if (countdown <= 0) return;
    const t = setInterval(() => setCountdown(c => c - 1), 1000);
    return () => clearInterval(t);
  }, [countdown]);

  // Auto submit when 6 digits entered
  useEffect(() => {
    if (otp.length === OTP_LEN) verify(otp);
  }, [otp]);

  const verify = async (code: string) => {
    setLoading(true);
    setError('');
    try {
      await AuthApi.verifyOtp(phone, code);
      if (mode === 'signup') {
        navigation.navigate('SignupComplete', { phone });
      } else {
        navigation.navigate('ResetPassword', { phone });
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Invalid code. Try again.');
      setOtp('');
      setTimeout(() => inputRef.current?.focus(), 100);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resending || countdown > 0) return;
    setResending(true);
    setError('');
    try {
      await AuthApi.sendOtp(phone);
      setCountdown(30);
      setOtp('');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to resend.');
    } finally {
      setResending(false);
    }
  };

  const handlePaste = async () => {
    try {
      const text = await Clipboard.getString();
      const digits = text.replace(/\D/g, '').slice(0, OTP_LEN);
      if (digits.length === OTP_LEN) setOtp(digits);
    } catch (_) {}
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: T.bg }]} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>

        <TouchableOpacity style={styles.back} onPress={() => navigation.goBack()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="arrow-back" size={22} color={T.text} />
        </TouchableOpacity>

        <View style={styles.content}>
          {mode === 'signup' && (
            <View style={styles.steps}>
              {[0,1,2].map(i => (
                <View key={i} style={[styles.dot, { backgroundColor: i <= 1 ? T.accent : T.bgInput }]} />
              ))}
            </View>
          )}

          {/* Icon */}
          <View style={[styles.iconWrap, { backgroundColor: T.accentMuted }]}>
            <Ionicons name="phone-portrait-outline" size={32} color={T.accent} />
          </View>

          <Text style={[styles.title, { color: T.text, fontFamily: fonts.bold, fontSize: fontSizes.xxl }]}>
            Verify your number
          </Text>
          <Text style={[{ color: T.text3, fontFamily: fonts.regular, fontSize: fontSizes.sm, textAlign: 'center', lineHeight: 20, marginBottom: spacing.xxl }]}>
            We sent a 6-digit code to{'\n'}
            <Text style={{ color: T.text, fontFamily: fonts.semibold }}>{phone}</Text>
          </Text>

          {/* Hidden input captures real keyboard input */}
          <TextInput
            ref={inputRef}
            value={otp}
            onChangeText={t => {
              setError('');
              setOtp(t.replace(/\D/g, '').slice(0, OTP_LEN));
            }}
            keyboardType="number-pad"
            textContentType="oneTimeCode"
            autoComplete="sms-otp"
            style={styles.hiddenInput}
            maxLength={OTP_LEN}
          />

          {/* Visual OTP boxes */}
          <TouchableOpacity
            style={styles.boxRow}
            onPress={() => inputRef.current?.focus()}
            activeOpacity={1}
          >
            {Array.from({ length: OTP_LEN }).map((_, i) => {
              const char    = otp[i] ?? '';
              const focused = !loading && otp.length === i;
              return (
                <View
                  key={i}
                  style={[
                    styles.box,
                    {
                      backgroundColor: T.bgInput,
                      borderColor:     error ? T.error : char ? T.accent : focused ? T.accent : T.border,
                      borderWidth:     char || focused ? 2 : 1,
                    },
                  ]}
                >
                  {loading && i === otp.length
                    ? <ActivityIndicator size="small" color={T.accent} />
                    : <Text style={[{ color: T.text, fontFamily: fonts.bold, fontSize: fontSizes.xl }]}>{char}</Text>
                  }
                </View>
              );
            })}
          </TouchableOpacity>

          {/* Error / hint */}
          {error ? (
            <Text style={[styles.hint, { color: T.error }]}>{error}</Text>
          ) : (
            <Text style={[styles.hint, { color: T.text3 }]}>Code auto-verifies when entered</Text>
          )}

          {/* Paste button */}
          <TouchableOpacity style={[styles.pasteBtn, { borderColor: T.border }]} onPress={handlePaste}>
            <Ionicons name="clipboard-outline" size={14} color={T.text3} />
            <Text style={[{ color: T.text3, fontFamily: fonts.medium, fontSize: fontSizes.xs }]}>Paste code</Text>
          </TouchableOpacity>

          {/* Resend */}
          <View style={styles.resendRow}>
            {countdown > 0 ? (
              <Text style={[{ color: T.text3, fontFamily: fonts.regular, fontSize: fontSizes.sm }]}>
                Resend in <Text style={{ color: T.accent, fontFamily: fonts.semibold }}>{countdown}s</Text>
              </Text>
            ) : (
              <TouchableOpacity onPress={handleResend} disabled={resending}>
                {resending
                  ? <ActivityIndicator size="small" color={T.accent} />
                  : <Text style={[{ color: T.accent, fontFamily: fonts.semibold, fontSize: fontSizes.sm }]}>Resend OTP</Text>
                }
              </TouchableOpacity>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe:        { flex: 1 },
  back:        { padding: spacing.base },
  content:     { flex: 1, paddingHorizontal: spacing.xl, alignItems: 'center' },
  steps:       { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.xl, alignSelf: 'flex-start' },
  dot:         { width: 8, height: 8, borderRadius: 99 },
  iconWrap:    { width: 72, height: 72, borderRadius: radii.xl, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.xl },
  title:       { marginBottom: spacing.sm, textAlign: 'center' },
  hiddenInput: { position: 'absolute', opacity: 0, height: 0, width: 0 },
  boxRow:      { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm },
  box:         { width: 46, height: 56, borderRadius: radii.lg, alignItems: 'center', justifyContent: 'center' },
  hint:        { fontFamily: fonts.regular, fontSize: fontSizes.xs, marginBottom: spacing.md, textAlign: 'center' },
  pasteBtn:    { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: radii.pill, borderWidth: 1, marginBottom: spacing.xl },
  resendRow:   { alignItems: 'center' },
});