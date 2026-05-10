import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, useColorScheme } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { getTheme, fonts, fontSizes, spacing } from '../../types/theme';
import { RootStackScreenProps } from '../../types/navigation';

type Props = RootStackScreenProps<'BlockedChats'>;

export const BlockedChatsScreen: React.FC<Props> = ({ navigation }) => {
  const T = getTheme(useColorScheme());

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: T.bg }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.topBar, { borderBottomColor: T.borderSubtle }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="arrow-back" size={24} color={T.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: T.text }]}>Blocked</Text>
        <View style={{ width: 24 }} /> {/* Balance spacer */}
      </View>

      {/* Body / Empty State */}
      <View style={styles.center}>
        <Ionicons name="shield-checkmark-outline" size={64} color={T.textMuted} />
        <Text style={[styles.emptyTitle, { color: T.text }]}>No blocked chats</Text>
        <Text style={[styles.emptySub, { color: T.text3 }]}>
          People you block will not be able to message you or view your profile.
        </Text>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1 },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.base, paddingVertical: spacing.md, borderBottomWidth: StyleSheet.hairlineWidth },
  title: { fontFamily: fonts.bold, fontSize: fontSizes.lg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xl, paddingBottom: 80 },
  emptyTitle: { fontFamily: fonts.semibold, fontSize: fontSizes.lg, marginTop: spacing.lg, marginBottom: spacing.xs },
  emptySub: { fontFamily: fonts.medium, fontSize: fontSizes.sm, textAlign: 'center', lineHeight: 20 },
});