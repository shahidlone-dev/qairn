// src/components/chats/ChatsHeader.tsx

import React from 'react';
import { View, Text, TouchableOpacity, TextInput, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { SharedValue, useAnimatedStyle, withTiming, Easing } from 'react-native-reanimated';
import { fonts, fontSizes, spacing, radii } from '../../types/theme';
import { FilterType } from '../../constants/mockChats';

const FILTERS: { key: FilterType; label: string }[] = [
  { key: 'all',        label: 'All'           },
  { key: 'unread',     label: 'Unread'        },
  { key: 'favorites',  label: 'Favorites'     },
  { key: 'groups',     label: 'Groups'        },
  { key: 'department', label: 'My Department' },
  { key: 'section',    label: 'My Section'    },
];

interface Props {
  T: any;
  insets: any;
  query: string;
  setQuery: (q: string) => void;
  filter: FilterType;
  setFilter: (f: FilterType) => void;
  selectionMode: boolean;
  selectedCount: number;
  onClearSelection: () => void;
  onMenuPress: () => void;
  isScrollingDown: SharedValue<boolean>; // Reanimated scroll signal
}

export const ChatsHeader: React.FC<Props> = ({
  T, insets, query, setQuery, filter, setFilter, 
  selectionMode, selectedCount, onClearSelection, onMenuPress,
  isScrollingDown
}) => {
  
  // Slide up and hide the search/filters when scrolling down
  const collapsibleStyle = useAnimatedStyle(() => {
    return {
      // 100px is roughly the height of the Search Bar + Filter Pills
      transform: [
        { 
          translateY: withTiming(isScrollingDown.value ? -100 : 0, {
            duration: 300, easing: Easing.out(Easing.cubic)
          }) 
        }
      ],
      opacity: withTiming(isScrollingDown.value ? 0 : 1, { duration: 250 }),
      // Shrink the height so the FlatList moves up seamlessly
      height: withTiming(isScrollingDown.value ? 0 : 100, { duration: 300 })
    };
  });

  return (
    <View style={{ backgroundColor: T.bg, paddingTop: insets.top, zIndex: 10 }}>
      {/* ── Static Top Bar ── */}
      <View style={[styles.header, { borderBottomColor: selectionMode ? T.border : 'transparent', backgroundColor: selectionMode ? T.bgInput : T.bg }]}>
        {selectionMode ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
            <TouchableOpacity onPress={onClearSelection} hitSlop={20}>
              <Ionicons name="close" size={24} color={T.text} />
            </TouchableOpacity>
            <Text style={{ color: T.text, fontFamily: fonts.bold, fontSize: fontSizes.lg }}>{selectedCount}</Text>
          </View>
        ) : (
          <Text style={[styles.headerTitle, { color: T.text }]}>Chats</Text>
        )}

        <View style={styles.headerActions}>
          {selectionMode ? (
             <>
                <TouchableOpacity style={styles.headerBtn}><Ionicons name="archive-outline" size={22} color={T.text} /></TouchableOpacity>
                <TouchableOpacity style={styles.headerBtn}><Ionicons name="trash-outline" size={22} color={T.error} /></TouchableOpacity>
             </>
          ) : (
             <>
                <TouchableOpacity style={styles.headerBtn}><Ionicons name="camera-outline" size={24} color={T.text} /></TouchableOpacity>
                <TouchableOpacity style={styles.headerBtn} onPress={onMenuPress}><Ionicons name="ellipsis-vertical" size={22} color={T.text} /></TouchableOpacity>
             </>
          )}
        </View>
      </View>

      {/* ── Collapsible Search & Filters ── */}
      {!selectionMode && (
        <Animated.View style={[{ overflow: 'hidden' }, collapsibleStyle]}>
          {/* Search Bar */}
          <View style={[styles.searchContainer, { backgroundColor: T.bg }]}>
            <View style={[styles.searchWrap, { backgroundColor: T.bgInput, borderRadius: radii.lg }]}>
              <Ionicons name="search-outline" size={18} color={T.text3} />
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="Search chats..."
                placeholderTextColor={T.textMuted}
                style={[styles.searchInput, { color: T.text, fontFamily: fonts.medium }]}
                clearButtonMode="while-editing"
              />
            </View>
          </View>

          {/* Filter Pills */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillsScroll} keyboardShouldPersistTaps="handled">
            {FILTERS.map(f => (
              <TouchableOpacity
                key={f.key}
                onPress={() => setFilter(f.key)}
                style={[
                  styles.pill,
                  { backgroundColor: filter === f.key ? T.accent : T.bgInput, borderColor: filter === f.key ? T.accent : T.borderSubtle }
                ]}
              >
                <Text style={[styles.pillText, { color: filter === f.key ? '#fff' : T.text2 }]}>{f.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </Animated.View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.base, paddingVertical: spacing.sm, minHeight: 50 },
  headerTitle: { fontSize: fontSizes.xl, fontFamily: fonts.bold },
  headerActions: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center' },
  headerBtn: { padding: spacing.xs },
  searchContainer: { paddingVertical: spacing.sm, paddingHorizontal: spacing.base },
  searchWrap: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md, height: 40, gap: spacing.sm },
  searchInput: { flex: 1, fontSize: fontSizes.md, includeFontPadding: false, paddingVertical: 0 },
  pillsScroll: { paddingHorizontal: spacing.base, paddingBottom: spacing.sm, gap: spacing.sm, alignItems: 'center' },
  pill: { paddingHorizontal: spacing.md, paddingVertical: 8, borderRadius: radii.pill, borderWidth: 1 },
  pillText: { fontSize: fontSizes.xs, fontFamily: fonts.bold },
});