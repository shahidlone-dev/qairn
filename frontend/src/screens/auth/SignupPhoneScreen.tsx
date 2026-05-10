// src/screens/auth/SignupPhoneScreen.tsx
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
import AuthApi from '../../api/auth.api';
import { ApiError } from '../../api/client';

type Props = RootStackScreenProps<'SignupPhone'>;

export const SignupPhoneScreen: React.FC<Props> = ({ navigation }) => {
  const T = getTheme(useColorScheme());
  const [phone,   setPhone]   = useState('');
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  const digits  = phone.replace(/\D/g, '');
  const isValid = digits.length === 10;
  const e164    = `+91${digits}`;

  const handleSend = async () => {
    if (!isValid || loading) return;
    setLoading(true);
    setError('');
    try {
      await AuthApi.sendOtp(e164);
      navigation.navigate('OtpVerify', { phone: e164, mode: 'signup' });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to send OTP. Try again.');
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
          {/* Step dots */}
          <View style={styles.steps}>
            {[0,1,2].map(i => (
              <View key={i} style={[styles.dot, { backgroundColor: i === 0 ? T.accent : T.bgInput }]} />
            ))}
          </View>

          <Text style={[styles.title, { color: T.text, fontFamily: fonts.bold, fontSize: fontSizes.xxl }]}>
            Your phone number
          </Text>
          <Text style={[{ color: T.text3, fontFamily: fonts.regular, fontSize: fontSizes.sm, lineHeight: 20, marginBottom: spacing.xl }]}>
            We'll send a verification code to confirm it's you.
          </Text>

          {/* Phone input */}
          <View style={[
            styles.inputWrap,
            { backgroundColor: T.bgInput, borderColor: error ? T.error : isValid ? T.success : T.border },
          ]}>
            <View style={[styles.prefix, { borderRightColor: T.border }]}>
              <Text style={[{ color: T.text, fontFamily: fonts.semibold, fontSize: fontSizes.md }]}>🇮🇳 +91</Text>
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
              returnKeyType="done"
              onSubmitEditing={handleSend}
            />
            {isValid && !error && <Ionicons name="checkmark-circle" size={20} color={T.success} />}
          </View>

          {error ? (
            <Text style={[{ color: T.error, fontFamily: fonts.regular, fontSize: fontSizes.xs, marginBottom: spacing.md }]}>
              {error}
            </Text>
          ) : (
            <Text style={[{ color: T.text3, fontFamily: fonts.regular, fontSize: fontSizes.xs, marginBottom: spacing.xl }]}>
              OTP will be sent to +91 {phone}
            </Text>
          )}

          <TouchableOpacity
            style={[styles.btn, { backgroundColor: isValid && !loading ? T.accent : T.bgInput }]}
            onPress={handleSend}
            disabled={!isValid || loading}
            activeOpacity={0.88}
          >
            {loading
              ? <ActivityIndicator size="small" color="#fff" />
              : <>
                  <Text style={[{ color: isValid ? '#fff' : T.text3, fontFamily: fonts.bold, fontSize: fontSizes.md }]}>Send OTP</Text>
                  <Ionicons name="send-outline" size={18} color={isValid ? '#fff' : T.text3} />
                </>
            }
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe:      { flex: 1 },
  back:      { padding: spacing.base },
  content:   { flex: 1, paddingHorizontal: spacing.xl },
  steps:     { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.xxl },
  dot:       { width: 8, height: 8, borderRadius: 99 },
  title:     { marginBottom: spacing.sm },
  inputWrap: { flexDirection: 'row', alignItems: 'center', height: 52, borderRadius: radii.lg, borderWidth: 1, marginBottom: spacing.sm, paddingRight: spacing.md },
  prefix:    { paddingHorizontal: spacing.md, borderRightWidth: StyleSheet.hairlineWidth, height: '100%', alignItems: 'center', justifyContent: 'center' },
  input:     { flex: 1, paddingHorizontal: spacing.sm, includeFontPadding: false },
  btn:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, paddingVertical: spacing.lg, borderRadius: radii.xl },
});