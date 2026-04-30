// src/screens/services/ServicesScreen.tsx

import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Modal,
  Pressable,
  Dimensions,
  FlatList,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from 'react-native';
import { getTheme, fonts, fontSizes, spacing, radii } from '../../theme/theme';
import { Avatar, QaafPlusBadge } from '../../components/ui';
import {
  MOCK_TUTORS, MOCK_ASSIGNMENTS,
  TutorListing, AssignmentListing,
} from '../../constants/mockServices';
import { MainTabScreenProps } from '../../types/navigation';

type Props     = MainTabScreenProps<'Services'>;
type ActiveTab = 'tutors' | 'assignments';

const { width: SW } = Dimensions.get('window');

// ─── Book Session Sheet ───────────────────────────────────────────────────────
const BookSessionSheet: React.FC<{
  tutor:   TutorListing | null;
  visible: boolean;
  T:       ReturnType<typeof getTheme>;
  onClose: () => void;
}> = ({ tutor, visible, T, onClose }) => {
  const [hours, setHours] = useState(1);
  if (!tutor) return null;

  const total = tutor.rate * hours;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={[styles.sheetScrim]} onPress={onClose} />
      <View style={[styles.sheet, { backgroundColor: T.bgCard }]}>
        {/* Handle */}
        <View style={[styles.handle, { backgroundColor: T.border }]} />

        <Text style={[styles.sheetTitle, { color: T.text, fontFamily: fonts.bold, fontSize: fontSizes.xl }]}>
          Book Session
        </Text>

        {/* Tutor info */}
        <View style={[styles.sheetTutorRow, { borderBottomColor: T.border }]}>
          <Avatar size="md" name={tutor.username} />
          <View style={{ flex: 1 }}>
            <Text style={[{ color: T.text, fontFamily: fonts.semibold, fontSize: fontSizes.md }]}>
              {tutor.username}
            </Text>
            <Text style={[{ color: T.text3, fontFamily: fonts.regular, fontSize: fontSizes.xs }]}>
              {tutor.subjects.join(' · ')}
            </Text>
          </View>
          <Text style={[{ color: T.accent, fontFamily: fonts.bold, fontSize: fontSizes.md }]}>
            Rs {tutor.rate}/hr
          </Text>
        </View>

        {/* Hours picker */}
        <View style={styles.sheetRow}>
          <Text style={[{ color: T.text, fontFamily: fonts.medium, fontSize: fontSizes.md }]}>
            Hours
          </Text>
          <View style={styles.hoursPicker}>
            <TouchableOpacity
              style={[styles.hoursBtn, { backgroundColor: T.bgInput }]}
              onPress={() => setHours(h => Math.max(1, h - 1))}
            >
              <Ionicons name="remove" size={18} color={T.text} />
            </TouchableOpacity>
            <Text style={[{ color: T.text, fontFamily: fonts.bold, fontSize: fontSizes.lg, minWidth: 32, textAlign: 'center' }]}>
              {hours}
            </Text>
            <TouchableOpacity
              style={[styles.hoursBtn, { backgroundColor: T.bgInput }]}
              onPress={() => setHours(h => Math.min(8, h + 1))}
            >
              <Ionicons name="add" size={18} color={T.text} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Total */}
        <View style={[styles.sheetTotal, { backgroundColor: T.accentMuted, borderRadius: radii.lg }]}>
          <Text style={[{ color: T.text2, fontFamily: fonts.medium, fontSize: fontSizes.md }]}>
            Total
          </Text>
          <Text style={[{ color: T.accent, fontFamily: fonts.bold, fontSize: fontSizes.xl }]}>
            Rs {total.toLocaleString()}
          </Text>
        </View>

        {/* Note */}
        <Text style={[{ color: T.text3, fontFamily: fonts.regular, fontSize: fontSizes.xs, textAlign: 'center', marginBottom: spacing.md }]}>
          Payment held by platform · Released after session is confirmed
        </Text>

        {/* Confirm */}
        <TouchableOpacity
          style={[styles.confirmBtn, { backgroundColor: T.accent }]}
          onPress={onClose}
          activeOpacity={0.85}
        >
          <Ionicons name="calendar-outline" size={18} color="#fff" />
          <Text style={[{ color: '#fff', fontFamily: fonts.bold, fontSize: fontSizes.md }]}>
            Request Session
          </Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
};

// ─── Order Assignment Sheet ───────────────────────────────────────────────────
const OrderAssignmentSheet: React.FC<{
  helper:  AssignmentListing | null;
  visible: boolean;
  T:       ReturnType<typeof getTheme>;
  onClose: () => void;
}> = ({ helper, visible, T, onClose }) => {
  const [pages, setPages] = useState(5);
  if (!helper) return null;

  const total = helper.pricePerPage * pages;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.sheetScrim} onPress={onClose} />
      <View style={[styles.sheet, { backgroundColor: T.bgCard }]}>
        <View style={[styles.handle, { backgroundColor: T.border }]} />

        <Text style={[styles.sheetTitle, { color: T.text, fontFamily: fonts.bold, fontSize: fontSizes.xl }]}>
          Order Assignment
        </Text>

        {/* Helper info */}
        <View style={[styles.sheetTutorRow, { borderBottomColor: T.border }]}>
          <Avatar size="md" name={helper.username} />
          <View style={{ flex: 1 }}>
            <Text style={[{ color: T.text, fontFamily: fonts.semibold, fontSize: fontSizes.md }]}>
              {helper.username}
            </Text>
            <Text style={[{ color: T.text3, fontFamily: fonts.regular, fontSize: fontSizes.xs }]}>
              {helper.subjects[0]} · {helper.deliveryDays}d delivery
            </Text>
          </View>
          <Text style={[{ color: T.accent, fontFamily: fonts.bold, fontSize: fontSizes.md }]}>
            Rs {helper.pricePerPage}/pg
          </Text>
        </View>

        {/* Pages picker */}
        <View style={styles.sheetRow}>
          <Text style={[{ color: T.text, fontFamily: fonts.medium, fontSize: fontSizes.md }]}>
            Pages
          </Text>
          <View style={styles.hoursPicker}>
            <TouchableOpacity
              style={[styles.hoursBtn, { backgroundColor: T.bgInput }]}
              onPress={() => setPages(p => Math.max(1, p - 1))}
            >
              <Ionicons name="remove" size={18} color={T.text} />
            </TouchableOpacity>
            <Text style={[{ color: T.text, fontFamily: fonts.bold, fontSize: fontSizes.lg, minWidth: 32, textAlign: 'center' }]}>
              {pages}
            </Text>
            <TouchableOpacity
              style={[styles.hoursBtn, { backgroundColor: T.bgInput }]}
              onPress={() => setPages(p => Math.min(helper.maxPages, p + 1))}
            >
              <Ionicons name="add" size={18} color={T.text} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Max pages note */}
        <Text style={[{ color: T.text3, fontFamily: fonts.regular, fontSize: fontSizes.xs, textAlign: 'right', marginTop: -spacing.sm, marginBottom: spacing.sm }]}>
          Max {helper.maxPages} pages
        </Text>

        {/* Total */}
        <View style={[styles.sheetTotal, { backgroundColor: T.accentMuted, borderRadius: radii.lg }]}>
          <Text style={[{ color: T.text2, fontFamily: fonts.medium, fontSize: fontSizes.md }]}>
            Total
          </Text>
          <Text style={[{ color: T.accent, fontFamily: fonts.bold, fontSize: fontSizes.xl }]}>
            Rs {total.toLocaleString()}
          </Text>
        </View>

        <Text style={[{ color: T.text3, fontFamily: fonts.regular, fontSize: fontSizes.xs, textAlign: 'center', marginBottom: spacing.md }]}>
          Payment held by platform · Released after you confirm delivery
        </Text>

        <TouchableOpacity
          style={[styles.confirmBtn, { backgroundColor: T.teal }]}
          onPress={onClose}
          activeOpacity={0.85}
        >
          <Ionicons name="create-outline" size={18} color="#fff" />
          <Text style={[{ color: '#fff', fontFamily: fonts.bold, fontSize: fontSizes.md }]}>
            Place Order
          </Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
};

// ─── Tutor card ───────────────────────────────────────────────────────────────
const TutorCard: React.FC<{
  tutor:   TutorListing;
  T:       ReturnType<typeof getTheme>;
  onBook:  (tutor: TutorListing) => void;
}> = ({ tutor, T, onBook }) => (
  <View style={[styles.card, { backgroundColor: T.bgCard, borderColor: T.border }]}>
    {/* Top row */}
    <View style={styles.cardTop}>
      <Avatar size="md" name={tutor.username} />
      <View style={styles.cardMeta}>
        <View style={styles.cardNameRow}>
          <Text style={[{ color: T.text, fontFamily: fonts.semibold, fontSize: fontSizes.md }]}>
            {tutor.username}
          </Text>
          {tutor.premium && <QaafPlusBadge size="xs" style={{ marginLeft: spacing.xs }} />}
          {/* Availability dot */}
          <View style={[
            styles.availDot,
            { backgroundColor: tutor.available ? T.success : T.border },
          ]} />
        </View>
        <Text style={[{ color: T.text3, fontFamily: fonts.regular, fontSize: fontSizes.xs }]}>
          {tutor.dept} · ⭐ {tutor.rating} · {tutor.sessions} sessions
        </Text>
      </View>
      {/* Rate */}
      <View style={styles.cardRate}>
        <Text style={[{ color: T.accent, fontFamily: fonts.bold, fontSize: fontSizes.md }]}>
          Rs {tutor.rate}
        </Text>
        <Text style={[{ color: T.text3, fontFamily: fonts.regular, fontSize: fontSizes.xxs }]}>
          per hour
        </Text>
      </View>
    </View>

    {/* Subject chips */}
    <View style={styles.chipRow}>
      {tutor.subjects.map(s => (
        <View key={s} style={[styles.chip, { backgroundColor: T.bgInput }]}>
          <Text style={[{ color: T.text2, fontFamily: fonts.medium, fontSize: fontSizes.xxs }]}>
            {s}
          </Text>
        </View>
      ))}
    </View>

    {/* Bio */}
    <Text style={[styles.bio, { color: T.text3, fontFamily: fonts.regular, fontSize: fontSizes.xs }]} numberOfLines={2}>
      {tutor.bio}
    </Text>

    {/* Book button */}
    <TouchableOpacity
      style={[
        styles.actionBtn,
        { backgroundColor: tutor.available ? T.accent : T.bgInput },
      ]}
      onPress={() => tutor.available && onBook(tutor)}
      activeOpacity={tutor.available ? 0.85 : 1}
    >
      <Ionicons
        name={tutor.available ? 'calendar-outline' : 'time-outline'}
        size={16}
        color={tutor.available ? '#fff' : T.text3}
      />
      <Text style={[{
        color:      tutor.available ? '#fff' : T.text3,
        fontFamily: fonts.semibold,
        fontSize:   fontSizes.sm,
      }]}>
        {tutor.available ? 'Book Session' : 'Not Available'}
      </Text>
    </TouchableOpacity>
  </View>
);

// ─── Assignment card ──────────────────────────────────────────────────────────
const AssignmentCard: React.FC<{
  helper:  AssignmentListing;
  T:       ReturnType<typeof getTheme>;
  onOrder: (helper: AssignmentListing) => void;
}> = ({ helper, T, onOrder }) => (
  <View style={[styles.card, { backgroundColor: T.bgCard, borderColor: T.border }]}>
    {/* Top row */}
    <View style={styles.cardTop}>
      <Avatar size="md" name={helper.username} />
      <View style={styles.cardMeta}>
        <View style={styles.cardNameRow}>
          <Text style={[{ color: T.text, fontFamily: fonts.semibold, fontSize: fontSizes.md }]}>
            {helper.username}
          </Text>
          {helper.premium && <QaafPlusBadge size="xs" style={{ marginLeft: spacing.xs }} />}
        </View>
        <Text style={[{ color: T.text3, fontFamily: fonts.regular, fontSize: fontSizes.xs }]}>
          {helper.dept} · ⭐ {helper.rating} · {helper.done} done
        </Text>
      </View>
      {/* Rate */}
      <View style={styles.cardRate}>
        <Text style={[{ color: T.teal, fontFamily: fonts.bold, fontSize: fontSizes.md }]}>
          Rs {helper.pricePerPage}
        </Text>
        <Text style={[{ color: T.text3, fontFamily: fonts.regular, fontSize: fontSizes.xxs }]}>
          per page
        </Text>
      </View>
    </View>

    {/* Subject chips */}
    <View style={styles.chipRow}>
      {helper.subjects.map(s => (
        <View key={s} style={[styles.chip, { backgroundColor: T.bgInput }]}>
          <Text style={[{ color: T.text2, fontFamily: fonts.medium, fontSize: fontSizes.xxs }]}>
            {s}
          </Text>
        </View>
      ))}
    </View>

    {/* Bio */}
    <Text style={[styles.bio, { color: T.text3, fontFamily: fonts.regular, fontSize: fontSizes.xs }]} numberOfLines={2}>
      {helper.bio}
    </Text>

    {/* Delivery info row */}
    <View style={styles.deliveryRow}>
      <View style={[styles.deliveryChip, { backgroundColor: T.tealMuted }]}>
        <Ionicons name="time-outline" size={12} color={T.teal} />
        <Text style={[{ color: T.teal, fontFamily: fonts.medium, fontSize: fontSizes.xxs }]}>
          {helper.deliveryDays}d delivery
        </Text>
      </View>
      <View style={[styles.deliveryChip, { backgroundColor: T.bgInput }]}>
        <Ionicons name="document-outline" size={12} color={T.text3} />
        <Text style={[{ color: T.text3, fontFamily: fonts.medium, fontSize: fontSizes.xxs }]}>
          Up to {helper.maxPages} pages
        </Text>
      </View>
    </View>

    {/* Order button */}
    <TouchableOpacity
      style={[styles.actionBtn, { backgroundColor: T.teal }]}
      onPress={() => onOrder(helper)}
      activeOpacity={0.85}
    >
      <Ionicons name="create-outline" size={16} color="#fff" />
      <Text style={[{ color: '#fff', fontFamily: fonts.semibold, fontSize: fontSizes.sm }]}>
        Order Now
      </Text>
    </TouchableOpacity>
  </View>
);

// ─── Screen ───────────────────────────────────────────────────────────────────
export const ServicesScreen: React.FC<Props> = () => {
  const T      = getTheme(useColorScheme());
  const insets = useSafeAreaInsets();

  const [activeTab,    setActiveTab]    = useState<ActiveTab>('tutors');
  const [query,        setQuery]        = useState('');
  const [bookTarget,   setBookTarget]   = useState<TutorListing | null>(null);
  const [orderTarget,  setOrderTarget]  = useState<AssignmentListing | null>(null);

  // ── Filter by query ─────────────────────────────────────────────────────────
  const filteredTutors = useMemo(() => {
    if (!query.trim()) return MOCK_TUTORS;
    const q = query.toLowerCase();
    return MOCK_TUTORS.filter(t =>
      t.username.toLowerCase().includes(q) ||
      t.subjects.some(s => s.toLowerCase().includes(q)) ||
      t.dept.toLowerCase().includes(q)
    );
  }, [query]);

  const filteredAssignments = useMemo(() => {
    if (!query.trim()) return MOCK_ASSIGNMENTS;
    const q = query.toLowerCase();
    return MOCK_ASSIGNMENTS.filter(a =>
      a.username.toLowerCase().includes(q) ||
      a.subjects.some(s => s.toLowerCase().includes(q)) ||
      a.dept.toLowerCase().includes(q)
    );
  }, [query]);

  // Determine active data source
  const listData = activeTab === 'tutors' ? filteredTutors : filteredAssignments;

  // ── ListHeaderComponent ─────────────────────────────────────────────────────
  const renderHeader = () => (
    <View style={{ backgroundColor: T.bg }}>
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <View style={[styles.header, { borderBottomColor: T.border }]}>
        <Text style={[{ color: T.text, fontFamily: fonts.bold, fontSize: fontSizes.xl }]}>
          Services
        </Text>
        <TouchableOpacity hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="options-outline" size={22} color={T.text} />
        </TouchableOpacity>
      </View>

      {/* ── Search ────────────────────────────────────────────────────────── */}
      <View style={[styles.searchWrap, { backgroundColor: T.bgInput, borderRadius: radii.lg }]}>
        <Ionicons name="search-outline" size={16} color={T.text3} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder={activeTab === 'tutors' ? 'Search tutors, subjects...' : 'Search subjects, dept...'}
          placeholderTextColor={T.textMuted}
          style={[styles.searchInput, { color: T.text, fontFamily: fonts.regular, fontSize: fontSizes.md }]}
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => setQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="close-circle" size={16} color={T.text3} />
          </TouchableOpacity>
        )}
      </View>

      {/* ── Tab switcher ──────────────────────────────────────────────────── */}
      <View style={[styles.tabRow, { borderBottomColor: T.border }]}>
        {([
          { key: 'tutors',      label: 'Tutors',          icon: 'school-outline'    },
          { key: 'assignments', label: 'Assignment Help',  icon: 'create-outline'    },
        ] as { key: ActiveTab; label: string; icon: keyof typeof Ionicons.glyphMap }[]).map(tab => {
          const active = activeTab === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tab, active && { borderBottomColor: T.accent, borderBottomWidth: 2.5 }]}
              onPress={() => setActiveTab(tab.key)}
              activeOpacity={0.8}
            >
              <Ionicons name={tab.icon} size={16} color={active ? T.accent : T.text3} />
              <Text style={[{
                color:      active ? T.accent : T.text3,
                fontFamily: active ? fonts.semibold : fonts.regular,
                fontSize:   fontSizes.sm,
              }]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* ── Active Strip Context ────────────────────────────────────────────── */}
      <View style={styles.listTopPadding}>
        {activeTab === 'tutors' ? (
          <View style={[styles.availStrip, { backgroundColor: T.successMuted }]}>
            <View style={[styles.availDotLg, { backgroundColor: T.success }]} />
            <Text style={[{ color: T.success, fontFamily: fonts.medium, fontSize: fontSizes.xs }]}>
              {MOCK_TUTORS.filter(t => t.available).length} tutors available right now
            </Text>
          </View>
        ) : (
          <View style={[styles.availStrip, { backgroundColor: T.tealMuted }]}>
            <Ionicons name="shield-checkmark-outline" size={14} color={T.teal} />
            <Text style={[{ color: T.teal, fontFamily: fonts.medium, fontSize: fontSizes.xs }]}>
              Payment released only after you confirm delivery
            </Text>
          </View>
        )}
      </View>
    </View>
  );

  // ── ListEmptyComponent ──────────────────────────────────────────────────────
  const renderEmptyState = () => (
    <View style={styles.empty}>
      <Ionicons name={activeTab === 'tutors' ? 'school-outline' : 'create-outline'} size={40} color={T.text3} />
      <Text style={[{ color: T.text3, fontFamily: fonts.medium, fontSize: fontSizes.md, marginTop: spacing.md, textAlign: 'center' }]}>
        No {activeTab === 'tutors' ? 'tutors' : 'helpers'} found for "{query}"
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: T.bg }]} edges={['top']}>
      
      <FlatList
        data={listData}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmptyState}
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + spacing.xxl }]}
        renderItem={({ item }) => {
          if (activeTab === 'tutors') {
            return <TutorCard tutor={item as TutorListing} T={T} onBook={setBookTarget} />;
          } else {
            return <AssignmentCard helper={item as AssignmentListing} T={T} onOrder={setOrderTarget} />;
          }
        }}
      />

      {/* ── Book session sheet ─────────────────────────────────────────────── */}
      <BookSessionSheet
        tutor={bookTarget}
        visible={!!bookTarget}
        T={T}
        onClose={() => setBookTarget(null)}
      />

      {/* ── Order assignment sheet ─────────────────────────────────────────── */}
      <OrderAssignmentSheet
        helper={orderTarget}
        visible={!!orderTarget}
        T={T}
        onClose={() => setOrderTarget(null)}
      />

    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1 },

  // Header
  header: {
    flexDirection:     'row',
    alignItems:        'center',
    justifyContent:    'space-between',
    paddingHorizontal: spacing.base,
    paddingVertical:   spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },

  // Search
  searchWrap: {
    flexDirection:     'row',
    alignItems:        'center',
    marginHorizontal:  spacing.base,
    marginVertical:    spacing.sm,
    paddingHorizontal: spacing.md,
    height:            42,
    gap:               spacing.sm,
  },
  searchInput: { flex: 1, includeFontPadding: false },

  // Tabs
  tabRow: {
    flexDirection:     'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  tab: {
    flex:           1,
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'center',
    gap:            spacing.xs,
    paddingVertical: spacing.md,
  },

  // List
  list: { paddingHorizontal: spacing.base },
  listTopPadding: { paddingTop: spacing.md, paddingBottom: spacing.sm },

  // Available strip
  availStrip: {
    flexDirection:     'row',
    alignItems:        'center',
    gap:               spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical:   spacing.sm,
    borderRadius:      radii.md,
    marginBottom:      spacing.xs,
  },
  availDotLg: { width: 8, height: 8, borderRadius: 99 },

  // Card
  card: {
    borderRadius:  radii.xl,
    borderWidth:   StyleSheet.hairlineWidth,
    padding:       spacing.base,
    gap:           spacing.sm,
    marginBottom:  spacing.md, // Spacing moved here since gap in FlatList isn't supported on older RN versions
  },
  cardTop: {
    flexDirection: 'row',
    alignItems:    'flex-start',
    gap:           spacing.sm,
  },
  cardMeta:    { flex: 1 },
  cardNameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginBottom: 3 },
  cardRate:    { alignItems: 'flex-end' },
  availDot: {
    width:        8,
    height:       8,
    borderRadius: 99,
    marginLeft:   spacing.xs,
  },

  // Chips
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  chip: {
    paddingHorizontal: spacing.sm,
    paddingVertical:   3,
    borderRadius:      radii.pill,
  },

  // Bio
  bio: { lineHeight: 18 },

  // Delivery row
  deliveryRow: { flexDirection: 'row', gap: spacing.sm },
  deliveryChip: {
    flexDirection:     'row',
    alignItems:        'center',
    gap:               4,
    paddingHorizontal: spacing.sm,
    paddingVertical:   4,
    borderRadius:      radii.pill,
  },

  // Action button
  actionBtn: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'center',
    gap:            spacing.sm,
    paddingVertical: spacing.md,
    borderRadius:   radii.lg,
    marginTop:      spacing.xs,
  },

  // Empty state
  empty: {
    alignItems:     'center',
    paddingTop:     60,
  },

  // Bottom sheet
  sheetScrim: {
    flex:            1,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheet: {
    position:             'absolute',
    bottom:               0,
    left:                 0,
    right:                0,
    borderTopLeftRadius:  radii.xxl,
    borderTopRightRadius: radii.xxl,
    padding:              spacing.lg,
    paddingBottom:        spacing.xxl,
    shadowColor:          '#000',
    shadowOffset:         { width: 0, height: -4 },
    shadowOpacity:        0.12,
    shadowRadius:         16,
    elevation:            20,
  },
  handle: {
    width:        40,
    height:       4,
    borderRadius: 99,
    alignSelf:    'center',
    marginBottom: spacing.lg,
  },
  sheetTitle: { marginBottom: spacing.md },
  sheetTutorRow: {
    flexDirection:     'row',
    alignItems:        'center',
    gap:               spacing.md,
    paddingBottom:     spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    marginBottom:      spacing.md,
  },
  sheetRow: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'space-between',
    marginBottom:   spacing.md,
  },
  hoursPicker: {
    flexDirection:  'row',
    alignItems:     'center',
    gap:            spacing.lg,
  },
  hoursBtn: {
    width:          36,
    height:         36,
    borderRadius:   radii.md,
    alignItems:     'center',
    justifyContent: 'center',
  },
  sheetTotal: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'space-between',
    padding:        spacing.base,
    marginBottom:   spacing.md,
  },
  confirmBtn: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'center',
    gap:            spacing.sm,
    paddingVertical: spacing.md,
    borderRadius:   radii.lg,
  },
});