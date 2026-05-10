// src/screens/auth/ResetPasswordScreen.tsx

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

type Props = RootStackScreenProps<'ResetPassword'>;

export const ResetPasswordScreen: React.FC<Props> = ({ navigation, route }) => {
  const T = getTheme(useColorScheme());

  const [password,  setPassword]  = useState('');
  const [confirm,   setConfirm]   = useState('');
  const [showPass,  setShowPass]  = useState(false);
  const [showConf,  setShowConf]  = useState(false);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState('');

  const isStrong       = password.length >= 8;
  const passwordsMatch = password === confirm && confirm.length > 0;
  const canReset       = isStrong && passwordsMatch;

  const handleReset = async () => {
    if (!canReset) return;
    setLoading(true);
    try {
      await new Promise(r => setTimeout(r, 900));
      // On success go back to login
      navigation.reset({ index: 0, routes: [{ name: 'Auth' }] });
    } catch {
      setError('Something went wrong. Please try again.');
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
          <View style={[styles.iconWrap, { backgroundColor: T.successMuted }]}>
            <Ionicons name="shield-checkmark-outline" size={32} color={T.success} />
          </View>

          <Text style={[styles.title, { color: T.text, fontFamily: fonts.bold, fontSize: fontSizes.xxl }]}>
            New password
          </Text>
          <Text style={[styles.sub, { color: T.text3, fontFamily: fonts.regular, fontSize: fontSizes.sm }]}>
            Choose a strong password for your account
          </Text>

          {/* New password */}
          <View style={[styles.inputWrap, {
            backgroundColor: T.bgInput, borderRadius: radii.lg,
            borderWidth: 1, borderColor: isStrong ? T.success : T.border,
          }]}>
            <TextInput
              value={password}
              onChangeText={t => { setPassword(t); setError(''); }}
              placeholder="New password"
              placeholderTextColor={T.textMuted}
              secureTextEntry={!showPass}
              autoCapitalize="none"
              autoFocus
              style={[styles.input, { color: T.text, fontFamily: fonts.medium, fontSize: fontSizes.md }]}
            />
            <TouchableOpacity onPress={() => setShowPass(p => !p)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name={showPass ? 'eye-off-outline' : 'eye-outline'} size={20} color={T.text3} />
            </TouchableOpacity>
          </View>

          {/* Confirm password */}
          <View style={[styles.inputWrap, {
            backgroundColor: T.bgInput, borderRadius: radii.lg,
            borderWidth: 1,
            borderColor: confirm.length > 0 ? (passwordsMatch ? T.success : T.error) : T.border,
          }]}>
            <TextInput
              value={confirm}
              onChangeText={t => { setConfirm(t); setError(''); }}
              placeholder="Confirm new password"
              placeholderTextColor={T.textMuted}
              secureTextEntry={!showConf}
              autoCapitalize="none"
              style={[styles.input, { color: T.text, fontFamily: fonts.medium, fontSize: fontSizes.md }]}
            />
            <TouchableOpacity onPress={() => setShowConf(p => !p)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name={showConf ? 'eye-off-outline' : 'eye-outline'} size={20} color={T.text3} />
            </TouchableOpacity>
          </View>

          {confirm.length > 0 && !passwordsMatch && (
            <Text style={[{ color: T.error, fontFamily: fonts.regular, fontSize: fontSizes.xs }]}>
              Passwords do not match
            </Text>
          )}
          {error ? (
            <Text style={[{ color: T.error, fontFamily: fonts.regular, fontSize: fontSizes.xs }]}>{error}</Text>
          ) : null}

          <TouchableOpacity
            style={[styles.btn, { backgroundColor: canReset ? T.accent : T.bgInput, marginTop: spacing.xl }]}
            onPress={handleReset}
            activeOpacity={canReset ? 0.88 : 1}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name="lock-closed-outline" size={18} color={canReset ? '#fff' : T.text3} />
                <Text style={[{ color: canReset ? '#fff' : T.text3, fontFamily: fonts.bold, fontSize: fontSizes.md }]}>
                  Reset Password
                </Text>
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
  title: { marginBottom: spacing.sm },
  sub:   { lineHeight: 20, marginBottom: spacing.xl },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center',
    height: 52, paddingHorizontal: spacing.md,
    marginBottom: spacing.md, gap: spacing.sm,
  },
  input: { flex: 1, includeFontPadding: false },
  btn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing.sm, paddingVertical: spacing.lg, borderRadius: radii.xl,
  },
});