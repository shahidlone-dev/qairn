import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, useColorScheme } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { getTheme, fonts, fontSizes, spacing, radii } from '../../types/theme';
import { RootStackScreenProps } from '../../types/navigation';

type Props = RootStackScreenProps<'NewGroup'>;

export const NewGroupScreen: React.FC<Props> = ({ navigation }) => {
  const T = getTheme(useColorScheme());
  const [search, setSearch] = useState('');

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: T.bg }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.topBar, { borderBottomColor: T.borderSubtle }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="close" size={26} color={T.text} />
        </TouchableOpacity>
        <View style={styles.headerTitles}>
          <Text style={[styles.title, { color: T.text }]}>New Group</Text>
          <Text style={[styles.subtitle, { color: T.text3 }]}>Add participants</Text>
        </View>
        <TouchableOpacity disabled={true} style={{ opacity: 0.5 }}>
          <Text style={[styles.nextText, { color: T.accent }]}>Next</Text>
        </TouchableOpacity>
      </View>

      {/* Search Input */}
      <View style={styles.searchContainer}>
        <View style={[styles.searchBox, { backgroundColor: T.bgInput }]}>
          <Ionicons name="search" size={18} color={T.text3} />
          <TextInput
            style={[styles.input, { color: T.text }]}
            placeholder="Search people..."
            placeholderTextColor={T.text3}
            value={search}
            onChangeText={setSearch}
            autoFocus
          />
        </View>
      </View>

      {/* Body / Empty State */}
      <View style={styles.center}>
        <Ionicons name="people-circle-outline" size={64} color={T.textMuted} />
        <Text style={[styles.emptySub, { color: T.text3 }]}>
          Search for friends to start a group chat.
        </Text>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1 },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.base, paddingVertical: spacing.md, borderBottomWidth: StyleSheet.hairlineWidth },
  headerTitles: { alignItems: 'center' },
  title: { fontFamily: fonts.bold, fontSize: fontSizes.lg },
  subtitle: { fontFamily: fonts.medium, fontSize: fontSizes.xs, marginTop: 2 },
  nextText: { fontFamily: fonts.bold, fontSize: fontSizes.md },
  
  searchContainer: { paddingHorizontal: spacing.base, paddingVertical: spacing.md },
  searchBox: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md, height: 44, borderRadius: radii.md, gap: spacing.sm },
  input: { flex: 1, fontFamily: fonts.medium, fontSize: fontSizes.md, height: '100%' },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xl, paddingBottom: 120 },
  emptySub: { fontFamily: fonts.medium, fontSize: fontSizes.md, textAlign: 'center', marginTop: spacing.md },
});