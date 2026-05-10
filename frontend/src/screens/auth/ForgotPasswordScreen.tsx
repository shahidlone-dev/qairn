// src/screens/auth/ForgotPasswordScreen.tsx

import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  TextInput, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from 'react-native';
import { getTheme, fonts, fontSizes, spacing, radii } from '../../types/theme';
import { RootStackScreenProps } from '../../types/navigation';

type Props = RootStackScreenProps<'ForgotPassword'>;

export const ForgotPasswordScreen: React.FC<Props> = ({ navigation, route }) => {
  const T = getTheme(useColorScheme());
  const { username } = route.params;

  const [phone,   setPhone]   = useState('');
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  const isValid = phone.replace(/\D/g, '').length === 10;

  const handleSend = async () => {
    if (!isValid) return;
    setLoading(true);
    setError('');

    try {
      // ── Replace with real Twilio call ─────────────────────────────────
      await new Promise(r => setTimeout(r, 900));
      navigation.navigate('OtpVerify', { phone, mode: 'forgotPassword' });
    } catch {
      setError('Could not send OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: T.bg }]} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>

        <TouchableOpacity style={styles.back} onPress={() => navigation.goBack()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="arrow-back" size={22} color={T.text} />
        </TouchableOpacity>

        <View style={styles.content}>
          <View style={[styles.iconWrap, { backgroundColor: T.accentMuted }]}>
            <Ionicons name="lock-open-outline" size={32} color={T.accent} />
          </View>

          <Text style={[styles.title, { color: T.text, fontFamily: fonts.bold, fontSize: fontSizes.xxl }]}>
            Reset password
          </Text>
          <Text style={[styles.sub, { color: T.text3, fontFamily: fonts.regular, fontSize: fontSizes.sm }]}>
            Enter the phone number linked to{' '}
            <Text style={{ color: T.text, fontFamily: fonts.semibold }}>@{username}</Text>
            {' '}and we'll send a verification code.
          </Text>

          {/* Phone input */}
          <View style={[styles.inputWrap, {
            backgroundColor: T.bgInput, borderRadius: radii.lg,
            borderWidth: 1, borderColor: error ? T.error : isValid ? T.success : T.border,
          }]}>
            <View style={[styles.countryCode, { borderRightColor: T.border }]}>
              <Text style={[{ color: T.text, fontFamily: fonts.semibold, fontSize: fontSizes.md }]}>
                🇮🇳 +91
              </Text>
            </View>
            <TextInput
              value={phone}
              onChangeText={t => { setPhone(t); setError(''); }}
              placeholder="98765 43210"
              placeholderTextColor={T.textMuted}
              keyboardType="phone-pad"
              autoFocus
              maxLength={10}
              style={[styles.input, { color: T.text, fontFamily: fonts.medium, fontSize: fontSizes.md }]}
            />
            {isValid && !error && <Ionicons name="checkmark-circle" size={20} color={T.success} />}
          </View>

          {error ? (
            <Text style={[{ color: T.error, fontFamily: fonts.regular, fontSize: fontSizes.xs, marginBottom: spacing.xl }]}>
              {error}
            </Text>
          ) : <View style={{ height: spacing.xl }} />}

          <TouchableOpacity
            style={[styles.btn, { backgroundColor: isValid ? T.accent : T.bgInput }]}
            onPress={handleSend}
            activeOpacity={isValid ? 0.88 : 1}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Text style={[{ color: isValid ? '#fff' : T.text3, fontFamily: fonts.bold, fontSize: fontSizes.md }]}>
                  Send OTP
                </Text>
                <Ionicons name="send-outline" size={18} color={isValid ? '#fff' : T.text3} />
              </>
            )}
          </TouchableOpacity>
        </View>

      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe:    { flex: 1 },
  back:    { padding: spacing.base },
  content: { flex: 1, paddingHorizontal: spacing.xl, paddingTop: spacing.lg },
  iconWrap: {
    width: 72, height: 72, borderRadius: radii.xl,
    alignItems: 'center', justifyContent: 'center', marginBottom: spacing.xl,
  },
  title:   { marginBottom: spacing.sm },
  sub:     { lineHeight: 20, marginBottom: spacing.xl },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center',
    height: 52, marginBottom: spacing.sm, paddingRight: spacing.md,
  },
  countryCode: {
    paddingHorizontal: spacing.md, borderRightWidth: StyleSheet.hairlineWidth,
    height: '100%', alignItems: 'center', justifyContent: 'center',
  },
  input: { flex: 1, paddingHorizontal: spacing.sm, includeFontPadding: false },
  btn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing.sm, paddingVertical: spacing.lg, borderRadius: radii.xl,
  },
});