// src/screens/auth/SignupCompleteScreen.tsx
// Step 3 of signup — username + password on one screen

import React, { useState, useEffect, useRef, useCallback } from 'react';
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

type Props = RootStackScreenProps<'SignupComplete'>;

type UsernameStatus = 'idle' | 'checking' | 'available' | 'taken' | 'invalid';

const SYMBOL_RE = /[._]/;
const VALID_RE  = /^[a-zA-Z0-9._]{3,30}$/;
const PW_RULES  = [
  { label: 'At least 8 characters',          test: (p: string) => p.length >= 8 },
  { label: 'One uppercase letter',            test: (p: string) => /[A-Z]/.test(p) },
  { label: 'One number',                      test: (p: string) => /\d/.test(p) },
  { label: 'One special character (!@#...)',  test: (p: string) => /[^a-zA-Z0-9]/.test(p) },
];

// ─── Password field (outside component to prevent re-mount) ───────────────────
const PasswordField: React.FC<{
  value:       string;
  onChange:    (t: string) => void;
  placeholder: string;
  T:           ReturnType<typeof getTheme>;
  inputRef?:   React.RefObject<TextInput>;
  onSubmit?:   () => void;
}> = ({ value, onChange, placeholder, T, inputRef, onSubmit }) => {
  const [show, setShow] = useState(false);
  return (
    <View style={[
      pwStyles.wrap,
      { backgroundColor: T.bgInput, borderColor: value.length > 0 ? T.accent : T.border },
    ]}>
      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={T.textMuted}
        secureTextEntry={!show}
        autoCapitalize="none"
        autoCorrect={false}
        blurOnSubmit={false}
        returnKeyType="done"
        onSubmitEditing={onSubmit}
        style={[pwStyles.input, { color: T.text, fontFamily: fonts.medium, fontSize: fontSizes.md }]}
      />
      <TouchableOpacity onPress={() => setShow(s => !s)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <Ionicons name={show ? 'eye-off-outline' : 'eye-outline'} size={18} color={T.text3} />
      </TouchableOpacity>
    </View>
  );
};

const pwStyles = StyleSheet.create({
  wrap:  { flexDirection: 'row', alignItems: 'center', height: 52, paddingHorizontal: spacing.md, borderRadius: radii.lg, borderWidth: 1, marginBottom: spacing.sm },
  input: { flex: 1, includeFontPadding: false },
});

// ─── Screen ───────────────────────────────────────────────────────────────────
export const SignupCompleteScreen: React.FC<Props> = ({ navigation, route }) => {
  const T = getTheme(useColorScheme());
  const { setUser } = useAuth();
  const { phone } = route.params;

  const [username,  setUsername]  = useState('');
  const [password,  setPassword]  = useState('');
  const [confirm,   setConfirm]   = useState('');
  const [status,    setStatus]    = useState<UsernameStatus>('idle');
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState('');

  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const passRef  = useRef<TextInput>(null);
  const confRef  = useRef<TextInput>(null);

  // Username availability debounce
  useEffect(() => {
    if (debounce.current) clearTimeout(debounce.current);
    if (!username) { setStatus('idle'); return; }
    if (!VALID_RE.test(username) || !SYMBOL_RE.test(username)) { setStatus('invalid'); return; }

    setStatus('checking');
    debounce.current = setTimeout(async () => {
      try {
        const available = await AuthApi.checkUsername(username);
        setStatus(available ? 'available' : 'taken');
      } catch {
        setStatus('idle');
      }
    }, 500);

    return () => { if (debounce.current) clearTimeout(debounce.current); };
  }, [username]);

  const allRules     = PW_RULES.every(r => r.test(password));
  const pwMatch      = password === confirm && confirm.length > 0;
  const canCreate    = status === 'available' && allRules && pwMatch;

  const handleCreate = async () => {
    if (!canCreate || loading) return;
    setLoading(true);
    setError('');
    try {
      const { user } = await AuthApi.signup({ username, phone, password });
      await setUser(user);
      navigation.reset({ index: 0, routes: [{ name: 'MainTabs' }] });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Signup failed. Try again.');
    } finally {
      setLoading(false);
    }
  };

  const statusColor = { idle: T.text3, checking: T.text3, available: T.success, taken: T.error, invalid: T.error }[status];
  const statusMsg   = {
    idle:      'Must contain at least one . or _',
    checking:  'Checking availability...',
    available: `@${username} is available ✓`,
    taken:     `@${username} is already taken`,
    invalid:   'Letters, numbers, . and _ only (3–30 chars, needs . or _)',
  }[status];

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: T.bg }]} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <TouchableOpacity style={styles.back} onPress={() => navigation.goBack()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="arrow-back" size={22} color={T.text} />
          </TouchableOpacity>

          {/* Steps */}
          <View style={styles.steps}>
            {[0,1,2].map(i => (
              <View key={i} style={[styles.dot, { backgroundColor: T.accent }]} />
            ))}
          </View>

          <Text style={[styles.title, { color: T.text, fontFamily: fonts.bold, fontSize: fontSizes.xxl }]}>
            Almost there!
          </Text>
          <Text style={[{ color: T.text3, fontFamily: fonts.regular, fontSize: fontSizes.sm, lineHeight: 20, marginBottom: spacing.xl }]}>
            Choose a username and set your password.
          </Text>

          {/* Username */}
          <View style={[
            styles.inputWrap,
            {
              backgroundColor: T.bgInput,
              borderColor: status === 'available' ? T.success
                         : status === 'taken' || status === 'invalid' ? T.error
                         : T.border,
            },
          ]}>
            <Text style={[{ color: T.text3, fontFamily: fonts.regular, fontSize: fontSizes.md }]}>@</Text>
            <TextInput
              value={username}
              onChangeText={t => setUsername(t.toLowerCase().replace(/\s/g, ''))}
              placeholder="your.username"
              placeholderTextColor={T.textMuted}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="next"
              onSubmitEditing={() => passRef.current?.focus()}
              style={[styles.input, { color: T.text, fontFamily: fonts.medium, fontSize: fontSizes.md }]}
            />
            {status === 'checking' && <ActivityIndicator size="small" color={T.text3} />}
            {status === 'available' && <Ionicons name="checkmark-circle" size={20} color={T.success} />}
            {(status === 'taken' || status === 'invalid') && <Ionicons name="close-circle" size={20} color={T.error} />}
          </View>
          <Text style={[{ color: statusColor, fontFamily: fonts.regular, fontSize: fontSizes.xs, marginBottom: spacing.lg, marginLeft: 4 }]}>
            {statusMsg}
          </Text>

          {/* Password */}
          <PasswordField
            value={password}
            onChange={t => { setPassword(t); setError(''); }}
            placeholder="Password"
            T={T}
            inputRef={passRef}
            onSubmit={() => confRef.current?.focus()}
          />

          {/* Password rules */}
          <View style={{ gap: 5, marginBottom: spacing.md, marginTop: -spacing.xs }}>
            {PW_RULES.map(r => {
              const ok = r.test(password);
              return (
                <View key={r.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Ionicons name={ok ? 'checkmark-circle' : 'ellipse-outline'} size={13} color={ok ? T.success : T.text3} />
                  <Text style={[{ color: ok ? T.success : T.text3, fontFamily: fonts.regular, fontSize: fontSizes.xs }]}>
                    {r.label}
                  </Text>
                </View>
              );
            })}
          </View>

          {/* Confirm password */}
          <PasswordField
            value={confirm}
            onChange={t => { setConfirm(t); setError(''); }}
            placeholder="Confirm password"
            T={T}
            inputRef={confRef}
            onSubmit={handleCreate}
          />

          {confirm.length > 0 && !pwMatch && (
            <Text style={[{ color: T.error, fontFamily: fonts.regular, fontSize: fontSizes.xs, marginTop: -spacing.xs, marginBottom: spacing.sm }]}>
              Passwords do not match
            </Text>
          )}

          {error ? (
            <Text style={[{ color: T.error, fontFamily: fonts.regular, fontSize: fontSizes.sm, textAlign: 'center', marginBottom: spacing.md }]}>
              {error}
            </Text>
          ) : null}

          {/* Submit */}
          <TouchableOpacity
            style={[styles.btn, { backgroundColor: canCreate && !loading ? T.accent : T.bgInput, marginTop: spacing.sm }]}
            onPress={handleCreate}
            disabled={!canCreate || loading}
            activeOpacity={0.88}
          >
            {loading
              ? <ActivityIndicator size="small" color="#fff" />
              : <>
                  <Ionicons name="checkmark-circle-outline" size={18} color={canCreate ? '#fff' : T.text3} />
                  <Text style={[{ color: canCreate ? '#fff' : T.text3, fontFamily: fonts.bold, fontSize: fontSizes.md }]}>
                    Create Account
                  </Text>
                </>
            }
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe:      { flex: 1 },
  scroll:    { flexGrow: 1, paddingHorizontal: spacing.xl, paddingTop: spacing.lg, paddingBottom: spacing.xl },
  back:      { marginBottom: spacing.lg },
  steps:     { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.xxl },
  dot:       { width: 8, height: 8, borderRadius: 99 },
  title:     { marginBottom: spacing.sm },
  inputWrap: { flexDirection: 'row', alignItems: 'center', height: 52, paddingHorizontal: spacing.md, borderRadius: radii.lg, borderWidth: 1, marginBottom: spacing.xs, gap: spacing.sm },
  input:     { flex: 1, includeFontPadding: false },
  btn:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, paddingVertical: spacing.lg, borderRadius: radii.xl },
});