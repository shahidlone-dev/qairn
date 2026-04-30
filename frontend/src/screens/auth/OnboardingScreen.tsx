// src/screens/auth/OnboardingScreen.tsx

import React, { useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from 'react-native';
import * as Notifications from 'expo-notifications';
import { getTheme, fonts, fontSizes, spacing, radii, colors } from '../../theme/theme';
import { RootStackScreenProps } from '../../types/navigation';

type Props = RootStackScreenProps<'Onboarding'>;

const { width: SW, height: SH } = Dimensions.get('window');

// ─── Feature items ────────────────────────────────────────────────────────────
const FEATURES = [
  {
    icon:  'people-outline'     as const,
    color: colors.coral,
    title: 'Campus Social',
    desc:  'Connect with students, share posts and stay in the loop with your campus community.',
  },
  {
    icon:  'storefront-outline' as const,
    color: colors.teal,
    title: 'Campus Marketplace',
    desc:  'Buy and sell notes, books and items — all within your university.',
  },
  {
    icon:  'school-outline'     as const,
    color: colors.blue,
    title: 'Academic Hub',
    desc:  'Track attendance, results, fee and timetable — everything in one place.',
  },
  {
    icon:  'briefcase-outline'  as const,
    color: colors.purple,
    title: 'Hire & Learn',
    desc:  'Book tutors or get assignment help from senior students on campus.',
  },
];

export const OnboardingScreen: React.FC<Props> = ({ navigation }) => {
  const T = getTheme(useColorScheme());

  // ── Request permissions then navigate ──────────────────────────────────────
  const handleGetStarted = async () => {
    try {
      // Trigger native notification permission modal
      await Notifications.requestPermissionsAsync();
    } catch (_) {
      // Permission denied or error — continue anyway
    }
    navigation.replace('Auth');
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: T.bg }]} edges={['top', 'bottom']}>

      {/* ── Logo + app name ──────────────────────────────────────────────── */}
      <View style={styles.logoArea}>
        <View style={[styles.logoCircle, { backgroundColor: T.accent }]}>
          <Text style={[styles.logoText, { fontFamily: fonts.bold }]}>q</Text>
        </View>
        <Text style={[styles.appName, { color: T.text, fontFamily: fonts.bold, fontSize: fontSizes.hero }]}>
          qaaf
        </Text>
        <Text style={[styles.tagline, { color: T.text3, fontFamily: fonts.regular, fontSize: fontSizes.md }]}>
          Your campus. Connected.
        </Text>
      </View>

      {/* ── Feature list ─────────────────────────────────────────────────── */}
      <View style={styles.features}>
        {FEATURES.map((f, i) => (
          <View key={i} style={styles.featureRow}>
            <View style={[styles.featureIcon, { backgroundColor: f.color + '18' }]}>
              <Ionicons name={f.icon} size={22} color={f.color} />
            </View>
            <View style={styles.featureText}>
              <Text style={[{ color: T.text, fontFamily: fonts.semibold, fontSize: fontSizes.md }]}>
                {f.title}
              </Text>
              <Text style={[{ color: T.text3, fontFamily: fonts.regular, fontSize: fontSizes.sm, lineHeight: 18, marginTop: 2 }]}>
                {f.desc}
              </Text>
            </View>
          </View>
        ))}
      </View>

      {/* ── Bottom CTA ───────────────────────────────────────────────────── */}
      <View style={styles.bottom}>
        <TouchableOpacity
          style={[styles.getStartedBtn, { backgroundColor: T.accent }]}
          onPress={handleGetStarted}
          activeOpacity={0.88}
        >
          <Text style={[{ color: '#fff', fontFamily: fonts.bold, fontSize: fontSizes.lg }]}>
            Get Started
          </Text>
          <Ionicons name="arrow-forward" size={20} color="#fff" />
        </TouchableOpacity>

        <Text style={[styles.terms, { color: T.text3, fontFamily: fonts.regular, fontSize: fontSizes.xs }]}>
          By continuing you agree to our{' '}
          <Text style={{ color: T.accent }}>Terms of Service</Text>
          {' '}and{' '}
          <Text style={{ color: T.accent }}>Privacy Policy</Text>
        </Text>
      </View>

    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1 },

  // Logo
  logoArea: {
    alignItems:     'center',
    paddingTop:     spacing.xxl,
    paddingBottom:  spacing.xl,
  },
  logoCircle: {
    width:          72,
    height:         72,
    borderRadius:   radii.xl,
    alignItems:     'center',
    justifyContent: 'center',
    marginBottom:   spacing.md,
  },
  logoText: {
    color:    '#fff',
    fontSize: 40,
    lineHeight: 48,
  },
  appName: {},
  tagline: { marginTop: spacing.xs },

  // Features
  features: {
    flex:              1,
    paddingHorizontal: spacing.xl,
    gap:               spacing.lg,
    justifyContent:    'center',
  },
  featureRow: {
    flexDirection: 'row',
    alignItems:    'flex-start',
    gap:           spacing.md,
  },
  featureIcon: {
    width:          46,
    height:         46,
    borderRadius:   radii.md,
    alignItems:     'center',
    justifyContent: 'center',
    flexShrink:     0,
  },
  featureText: { flex: 1 },

  // Bottom
  bottom: {
    paddingHorizontal: spacing.xl,
    paddingBottom:     spacing.lg,
    gap:               spacing.md,
  },
  getStartedBtn: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'center',
    gap:            spacing.sm,
    paddingVertical: spacing.lg,
    borderRadius:   radii.xl,
  },
  terms: {
    textAlign:  'center',
    lineHeight: 18,
  },
});