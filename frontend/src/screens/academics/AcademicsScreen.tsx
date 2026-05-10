// src/screens/academics/AcademicsScreen.tsx

import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from 'react-native';
import { getTheme, fonts, fontSizes, spacing } from '../../types/theme';
import { MainTabScreenProps } from '../../types/navigation';

type Props = MainTabScreenProps<'Academics'>;

export const AcademicsScreen: React.FC<Props> = () => {
  const T = getTheme(useColorScheme());

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: T.bg }]} edges={['top']}>
      <View style={[styles.header, { borderBottomColor: T.border }]}>
        <Text style={[styles.title, { color: T.text, fontFamily: fonts.bold }]}>
          Academics
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.placeholder, { backgroundColor: T.bgCard }]}>
          <Ionicons name="school" size={48} color={T.accent} />
          <Text style={[styles.phTitle, { color: T.text, fontFamily: fonts.semibold }]}>
            Courses, Results & Attendance
          </Text>
          <Text style={[styles.phSub, { color: T.text3, fontFamily: fonts.regular }]}>
            Sync your university to see attendance, CGPA, fee status and timetable.
          </Text>
        </View>
        {/* Next: Attendance cards, CGPA, Fee status, Timetable */}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe:        { flex: 1 },
  header:      {
    paddingHorizontal: spacing.base,
    paddingVertical:   spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  title:       { fontSize: fontSizes.xl },
  content:     { padding: spacing.base },
  placeholder: {
    borderRadius: 16,
    padding:      spacing.xxl,
    alignItems:   'center',
    gap:          spacing.md,
    marginTop:    spacing.xxl,
  },
  phTitle: { fontSize: fontSizes.lg, textAlign: 'center' },
  phSub:   { fontSize: fontSizes.md, textAlign: 'center', lineHeight: 22 },
});