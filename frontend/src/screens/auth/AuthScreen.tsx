// src/screens/auth/AuthScreen.tsx
// Single screen — login + signup toggle

import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  TextInput, KeyboardAvoidingView, Platform,
  ScrollView, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from 'react-native';
import { getTheme, fonts, fontSizes, spacing, radii } from '../../types/theme';
import { RootStackScreenProps } from '../../types/navigation';
import { useAuth } from '../../hooks/useAuth';
import AuthApi from '../../api/auth.api';
import { ApiError } from '../../api/client';

type Props = RootStackScreenProps<'Auth'>;
type Mode  = 'login' | 'signup';

// ─── Input component ──────────────────────────────────────────────────────────
const Input: React.FC<{
  value:        string;
  onChange:     (t: string) => void;
  placeholder:  string;
  icon:         keyof typeof Ionicons.glyphMap;
  secure?:      boolean;
  keyboard?:    'default' | 'phone-pad' | 'email-address';
  error?:       string;
  T:            ReturnType<typeof getTheme>;
  returnKey?:   'next' | 'done' | 'go';
  onSubmit?:    () => void;
  inputRef?:    React.RefObject<TextInput>;
}> = ({ value, onChange, placeholder, icon, secure, keyboard, error, T, returnKey, onSubmit, inputRef }) => {
  const [show, setShow] = useState(false);
  return (
    <View style={{ marginBottom: spacing.sm }}>
      <View style={[
        inputStyles.wrap,
        { backgroundColor: T.bgInput, borderColor: error ? T.error : value ? T.accent : T.border },
      ]}>
        <Ionicons name={icon} size={18} color={T.text3} style={{ marginRight: spacing.sm }} />
        <TextInput
          ref={inputRef}
          value={value}
          onChangeText={onChange}
          placeholder={placeholder}
          placeholderTextColor={T.textMuted}
          secureTextEntry={secure && !show}
          keyboardType={keyboard ?? 'default'}
          autoCapitalize="none"
          autoCorrect={false}
          blurOnSubmit={false}
          returnKeyType={returnKey ?? 'next'}
          onSubmitEditing={onSubmit}
          style={[inputStyles.input, { color: T.text, fontFamily: fonts.regular, fontSize: fontSizes.md }]}
        />
        {secure && (
          <TouchableOpacity onPress={() => setShow(s => !s)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name={show ? 'eye-off-outline' : 'eye-outline'} size={18} color={T.text3} />
          </TouchableOpacity>
        )}
      </View>
      {error ? (
        <Text style={[inputStyles.error, { color: T.error, fontFamily: fonts.regular, fontSize: fontSizes.xs }]}>
          {error}
        </Text>
      ) : null}
    </View>
  );
};

const inputStyles = StyleSheet.create({
  wrap:  { flexDirection: 'row', alignItems: 'center', height: 52, paddingHorizontal: spacing.md, borderRadius: radii.lg, borderWidth: 1 },
  input: { flex: 1, includeFontPadding: false },
  error: { marginTop: 4, marginLeft: 4 },
});

// ─── Screen ───────────────────────────────────────────────────────────────────
export const AuthScreen: React.FC<Props> = ({ navigation }) => {
  const T      = getTheme(useColorScheme());
  const { setUser } = useAuth();
  const [mode, setMode] = useState<Mode>('login');

  // Login state
  const [identifier, setIdentifier] = useState('');
  const [password,   setPassword]   = useState('');
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState('');

  const passRef = useRef<TextInput>(null);

  const switchMode = (m: Mode) => {
    setMode(m);
    setIdentifier('');
    setPassword('');
    setError('');
  };

  // ── Login ──────────────────────────────────────────────────────────────────
  const handleLogin = async () => {
    if (!identifier.trim() || !password) return;
    setLoading(true);
    setError('');
    try {
      const { user } = await AuthApi.login({ identifier: identifier.trim(), password });
      await setUser(user);
      navigation.reset({ index: 0, routes: [{ name: 'MainTabs' }] });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Login failed. Try again.');
    } finally {
      setLoading(false);
    }
  };

  // ── Signup → go to phone screen ────────────────────────────────────────────
  const handleSignupStart = () => {
    navigation.navigate('SignupPhone');
  };

  const canLogin = identifier.trim().length >= 3 && password.length >= 6;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: T.bg }]} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Logo */}
          <View style={styles.logoArea}>
            <View style={[styles.logoCircle, { backgroundColor: T.accent }]}>
              <Text style={[{ color: '#fff', fontFamily: fonts.bold, fontSize: 36 }]}>q</Text>
            </View>
            <Text style={[{ color: T.text, fontFamily: fonts.bold, fontSize: fontSizes.xxl, marginTop: spacing.sm }]}>
              qaaf
            </Text>
            <Text style={[{ color: T.text3, fontFamily: fonts.regular, fontSize: fontSizes.sm, marginTop: 4 }]}>
              Your campus. Connected.
            </Text>
          </View>

          {/* Toggle */}
          <View style={[styles.toggle, { backgroundColor: T.bgInput }]}>
            {(['login', 'signup'] as Mode[]).map(m => (
              <TouchableOpacity
                key={m}
                style={[styles.toggleBtn, mode === m && { backgroundColor: T.bg, borderRadius: radii.lg }]}
                onPress={() => switchMode(m)}
                activeOpacity={0.8}
              >
                <Text style={[{
                  color:      mode === m ? T.text    : T.text3,
                  fontFamily: mode === m ? fonts.semibold : fonts.regular,
                  fontSize:   fontSizes.md,
                }]}>
                  {m === 'login' ? 'Log In' : 'Sign Up'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {mode === 'login' ? (
            // ── Login form ───────────────────────────────────────────────────
            <View style={{ marginTop: spacing.xl }}>
              <Input
                value={identifier}
                onChange={t => { setIdentifier(t); setError(''); }}
                placeholder="Phone number or username"
                icon="person-outline"
                keyboard="default"
                T={T}
                returnKey="next"
                onSubmit={() => passRef.current?.focus()}
              />
              <Input
                value={password}
                onChange={t => { setPassword(t); setError(''); }}
                placeholder="Password"
                icon="lock-closed-outline"
                secure
                T={T}
                returnKey="done"
                onSubmit={handleLogin}
                inputRef={passRef}
              />

              {error ? (
                <Text style={[{ color: T.error, fontFamily: fonts.regular, fontSize: fontSizes.sm, marginBottom: spacing.md, textAlign: 'center' }]}>
                  {error}
                </Text>
              ) : null}

              <TouchableOpacity
                style={[styles.primaryBtn, { backgroundColor: canLogin && !loading ? T.accent : T.bgInput }]}
                onPress={handleLogin}
                disabled={!canLogin || loading}
                activeOpacity={0.88}
              >
                {loading
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Text style={[{ color: canLogin ? '#fff' : T.text3, fontFamily: fonts.bold, fontSize: fontSizes.md }]}>Log In</Text>
                }
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.linkRow}
                onPress={() => navigation.navigate('ForgotPassword', { username: identifier })}
              >
                <Text style={[{ color: T.accent, fontFamily: fonts.medium, fontSize: fontSizes.sm }]}>
                  Forgot password?
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            // ── Signup CTA ────────────────────────────────────────────────────
            <View style={{ marginTop: spacing.xl, gap: spacing.md }}>
              <Text style={[{ color: T.text3, fontFamily: fonts.regular, fontSize: fontSizes.sm, textAlign: 'center', lineHeight: 20 }]}>
                Join your campus community. Buy, sell, learn and connect.
              </Text>
              <TouchableOpacity
                style={[styles.primaryBtn, { backgroundColor: T.accent }]}
                onPress={handleSignupStart}
                activeOpacity={0.88}
              >
                <Text style={[{ color: '#fff', fontFamily: fonts.bold, fontSize: fontSizes.md }]}>
                  Create Account
                </Text>
                <Ionicons name="arrow-forward" size={18} color="#fff" />
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe:       { flex: 1 },
  scroll:     { flexGrow: 1, paddingHorizontal: spacing.xl, paddingTop: spacing.xxl, paddingBottom: spacing.xl },
  logoArea:   { alignItems: 'center', marginBottom: spacing.xl },
  logoCircle: { width: 64, height: 64, borderRadius: radii.lg, alignItems: 'center', justifyContent: 'center' },
  toggle:     { flexDirection: 'row', borderRadius: radii.xl, padding: 4 },
  toggleBtn:  { flex: 1, paddingVertical: spacing.md, alignItems: 'center' },
  primaryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, paddingVertical: spacing.lg, borderRadius: radii.xl },
  linkRow:    { alignItems: 'center', marginTop: spacing.md },
});