// src/screens/search/SearchScreen.tsx

import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from 'react-native';
import { getTheme, fonts, fontSizes, spacing, radii } from '../../theme/theme';
import { RootStackScreenProps } from '../../types/navigation';

type Props = RootStackScreenProps<'Search'>;

const TRENDING = [
  'DSA notes',
  'Python tutor',
  'CS301 past papers',
  'Final year project',
  'Old books for sale',
  'Circuit analysis notes',
];

export const SearchScreen: React.FC<Props> = ({ navigation }) => {
  const T        = getTheme(useColorScheme());
  const inputRef = useRef<TextInput>(null);

  const [query,  setQuery]  = useState('');
  const [recent, setRecent] = useState(['zara.malik', 'ahmed.k', 'DSA help']);
  const [activeFilter, setActiveFilter] = useState('All');

  const applySearch = (term: string) => {
    setQuery(term);
    inputRef.current?.focus();
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: T.bg }]} edges={['top']}>

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <View style={[styles.header, { borderBottomColor: T.border }]}>
        <View style={[styles.searchBar, { backgroundColor: T.bgInput, borderRadius: radii.lg }]}>
          <Ionicons name="search-outline" size={18} color={T.text3} />
          <TextInput
            ref={inputRef}
            value={query}
            onChangeText={setQuery}
            placeholder="Search students, notes, posts..."
            placeholderTextColor={T.textMuted}
            autoFocus
            returnKeyType="search"
            style={[styles.searchInput, { color: T.text, fontFamily: fonts.regular, fontSize: fontSizes.md }]}
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close-circle" size={18} color={T.text3} />
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={[{ color: T.accent, fontFamily: fonts.semibold, fontSize: fontSizes.md }]}>
            Cancel
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

        {/* ── When no query ─────────────────────────────────────────────────── */}
        {query.length === 0 && (
          <>
            {/* Recent */}
            {recent.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHead}>
                  <Text style={[styles.sectionTitle, { color: T.text, fontFamily: fonts.semibold }]}>
                    Recent
                  </Text>
                  <TouchableOpacity onPress={() => setRecent([])}>
                    <Text style={[{ color: T.accent, fontFamily: fonts.medium, fontSize: fontSizes.sm }]}>
                      Clear all
                    </Text>
                  </TouchableOpacity>
                </View>
                {recent.map(item => (
                  <TouchableOpacity
                    key={item}
                    style={[styles.row, { borderBottomColor: T.borderSubtle }]}
                    onPress={() => applySearch(item)}
                    activeOpacity={0.75}
                  >
                    <View style={[styles.rowIcon, { backgroundColor: T.bgCard }]}>
                      <Ionicons name="time-outline" size={16} color={T.text3} />
                    </View>
                    <Text style={[{ flex: 1, color: T.text2, fontFamily: fonts.regular, fontSize: fontSizes.md }]}>
                      {item}
                    </Text>
                    <TouchableOpacity
                      onPress={() => setRecent(p => p.filter(r => r !== item))}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Ionicons name="close" size={16} color={T.text3} />
                    </TouchableOpacity>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Trending */}
            <View style={styles.section}>
              <View style={styles.sectionHead}>
                <Text style={[styles.sectionTitle, { color: T.text, fontFamily: fonts.semibold }]}>
                  Trending on campus
                </Text>
              </View>
              {TRENDING.map(item => (
                <TouchableOpacity
                  key={item}
                  style={[styles.row, { borderBottomColor: T.borderSubtle }]}
                  onPress={() => applySearch(item)}
                  activeOpacity={0.75}
                >
                  <View style={[styles.rowIcon, { backgroundColor: T.bgCard }]}>
                    <Ionicons name="trending-up" size={16} color={T.accent} />
                  </View>
                  <Text style={[{ flex: 1, color: T.text2, fontFamily: fonts.regular, fontSize: fontSizes.md }]}>
                    {item}
                  </Text>
                  <Ionicons name="arrow-forward" size={16} color={T.text3} />
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        {/* ── When typing ───────────────────────────────────────────────────── */}
        {query.length > 0 && (
          <View style={styles.section}>
            {/* Filter chips */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chips}
            >
              {['All', 'People', 'Posts', 'Notes', 'Market'].map(f => {
                const active = activeFilter === f;
                return (
                  <TouchableOpacity
                    key={f}
                    style={[
                      styles.chip,
                      {
                        backgroundColor: active ? T.accent : T.bgCard,
                        borderColor:     active ? T.accent : T.border,
                      },
                    ]}
                    onPress={() => setActiveFilter(f)}
                  >
                    <Text style={[{
                      color:      active ? '#fff' : T.text2,
                      fontFamily: active ? fonts.semibold : fonts.medium,
                      fontSize:   fontSizes.xs,
                    }]}>
                      {f}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Results placeholder */}
            <View style={styles.emptyResult}>
              <Ionicons name="search-outline" size={40} color={T.text3} />
              <Text style={[{ color: T.text, fontFamily: fonts.semibold, fontSize: fontSizes.md, textAlign: 'center', marginTop: spacing.md }]}>
                Search for "{query}"
              </Text>
              <Text style={[{ color: T.text3, fontFamily: fonts.regular, fontSize: fontSizes.sm, textAlign: 'center', marginTop: spacing.xs }]}>
                Results will appear here once backend is connected
              </Text>
            </View>
          </View>
        )}

      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection:     'row',
    alignItems:        'center',
    gap:               spacing.md,
    paddingHorizontal: spacing.base,
    paddingVertical:   spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  searchBar: {
    flex:              1,
    flexDirection:     'row',
    alignItems:        'center',
    paddingHorizontal: spacing.md,
    height:            42,
    gap:               spacing.sm,
  },
  searchInput: { flex: 1, includeFontPadding: false },

  section:     { paddingTop: spacing.md },
  sectionHead: {
    flexDirection:     'row',
    alignItems:        'center',
    justifyContent:    'space-between',
    paddingHorizontal: spacing.base,
    paddingBottom:     spacing.sm,
  },
  sectionTitle: { fontSize: fontSizes.md },

  row: {
    flexDirection:     'row',
    alignItems:        'center',
    paddingHorizontal: spacing.base,
    paddingVertical:   spacing.md,
    gap:               spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowIcon: {
    width:          34,
    height:         34,
    borderRadius:   radii.md,
    alignItems:     'center',
    justifyContent: 'center',
  },

  chips: {
    paddingHorizontal: spacing.base,
    paddingBottom:     spacing.md,
    gap:               spacing.sm,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical:   spacing.xs,
    borderRadius:      radii.pill,
    borderWidth:       StyleSheet.hairlineWidth,
  },

  emptyResult: {
    alignItems:        'center',
    paddingVertical:   spacing.xxl,
    paddingHorizontal: spacing.xxl,
  },
});