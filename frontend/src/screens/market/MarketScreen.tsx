// src/screens/market/MarketScreen.tsx

import React, { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  TextInput, Dimensions, SectionList, FlatList, Modal, Pressable
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from 'react-native';
import { getTheme, fonts, fontSizes, spacing, radii } from '../../types/theme';
import { NOTES, ITEMS, NoteListing, ItemListing, Condition } from '../../constants/mockMarket';
import { MainTabScreenProps } from '../../types/navigation';

type Props = MainTabScreenProps<'Market'>;
type Filter = 'all' | 'notes' | 'items' | 'dept';

const { width: SW } = Dimensions.get('window');
const ITEM_CARD_W = SW * 0.42;

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatPrice(n: number) { return `Rs ${n.toLocaleString()}`; }
function conditionLabel(c: Condition) { return c === 'new' ? 'New' : c === 'slight' ? 'Slightly Used' : 'Well Used'; }
function conditionColor(c: Condition, T: ReturnType<typeof getTheme>) { return c === 'new' ? T.success : c === 'slight' ? T.warning : T.error; }
function timeAgo(d: string) { const s=(Date.now()-new Date(d).getTime())/1000; return s<86400?`${Math.floor(s/3600)}h ago`:`${Math.floor(s/86400)}d ago`; }

// ─── Note row ─────────────────────────────────────────────────────────────────
const NoteRow: React.FC<{ note: NoteListing; T: ReturnType<typeof getTheme>; onPress: () => void }> = ({ note, T, onPress }) => (
  <TouchableOpacity style={[styles.noteRow, { borderBottomColor: T.borderSubtle }]} onPress={onPress} activeOpacity={0.8}>
    <View style={[styles.noteIcon, { backgroundColor: T.goldMuted }]}>
      <Ionicons name="document-text" size={22} color={T.gold} />
    </View>
    <View style={styles.noteInfo}>
      <Text style={[{ color: T.text, fontFamily: fonts.semibold, fontSize: fontSizes.sm }]} numberOfLines={1}>{note.title}</Text>
      <Text style={[{ color: T.text3, fontFamily: fonts.regular, fontSize: fontSizes.xs, marginTop: 2 }]}>{note.dept} · {note.pages} pages · ⭐ {note.rating}</Text>
      <View style={styles.noteBottom}>
        <View style={[styles.noteTypePill, { backgroundColor: note.noteType === 'pdf' ? T.blueMuted : T.goldMuted }]}>
          <Ionicons name={note.noteType === 'pdf' ? 'download-outline' : 'cube-outline'} size={10} color={note.noteType === 'pdf' ? T.blue : T.gold} />
          <Text style={[{ color: note.noteType === 'pdf' ? T.blue : T.gold, fontFamily: fonts.semibold, fontSize: fontSizes.xxs }]}>{note.noteType === 'pdf' ? 'PDF' : 'Physical'}</Text>
        </View>
        <Text style={[{ color: T.text3, fontFamily: fonts.regular, fontSize: fontSizes.xxs }]}>{note.sales} sold</Text>
      </View>
    </View>
    <View style={styles.notePrice}>
      <Text style={[{ color: T.accent, fontFamily: fonts.bold, fontSize: fontSizes.md }]}>{formatPrice(note.price)}</Text>
      <TouchableOpacity style={[styles.buyBtn, { backgroundColor: T.accent }]} onPress={onPress} activeOpacity={0.85}>
        <Text style={[{ color: '#fff', fontFamily: fonts.semibold, fontSize: fontSizes.xxs }]}>Buy</Text>
      </TouchableOpacity>
    </View>
  </TouchableOpacity>
);

// ─── Item card ────────────────────────────────────────────────────────────────
const ItemCard: React.FC<{ item: ItemListing; T: ReturnType<typeof getTheme>; onPress: () => void }> = ({ item, T, onPress }) => (
  <TouchableOpacity style={[styles.itemCard, { width: ITEM_CARD_W, backgroundColor: T.bgCard, borderColor: T.border }]} onPress={onPress} activeOpacity={0.85}>
    <View style={[styles.itemImg, { backgroundColor: T.accentMuted }]}>
      <Ionicons name="cube-outline" size={32} color={T.accent} />
      <View style={[styles.conditionDot, { backgroundColor: conditionColor(item.condition, T) }]} />
    </View>
    <View style={styles.itemInfo}>
      <Text style={[{ color: T.text, fontFamily: fonts.semibold, fontSize: fontSizes.sm }]} numberOfLines={1}>{item.title}</Text>
      <Text style={[{ color: T.text3, fontFamily: fonts.regular, fontSize: fontSizes.xs, marginTop: 2 }]}>{item.dept} · {conditionLabel(item.condition)}</Text>
      <View style={styles.itemBottom}>
        <Text style={[{ color: T.accent, fontFamily: fonts.bold, fontSize: fontSizes.md }]}>{formatPrice(item.price)}</Text>
        <Text style={[{ color: T.text3, fontFamily: fonts.regular, fontSize: fontSizes.xxs }]}>{timeAgo(item.timestamp)}</Text>
      </View>
    </View>
  </TouchableOpacity>
);

// ─── Screen ───────────────────────────────────────────────────────────────────
export const MarketScreen: React.FC<Props> = ({ navigation }) => {
  const T = getTheme(useColorScheme());
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [modalVisible, setModalVisible] = useState(false);

  const FILTERS: { key: Filter; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
    { key: 'all', label: 'Everything', icon: 'apps-outline' },
    { key: 'notes', label: 'Study Notes', icon: 'document-text-outline' },
    { key: 'items', label: 'Physical Items', icon: 'cube-outline' },
    { key: 'dept', label: 'My Department', icon: 'school-outline' },
  ];

  // Dynamically construct data sections based on the selected filter
  const sections = useMemo(() => {
    const data = [];
    if (filter === 'all') {
      data.push({ type: 'items', title: 'Items for Sale', icon: 'cube', color: T.accent, data: [ITEMS] });
      data.push({ type: 'notes', title: 'Notes', icon: 'document-text', color: T.gold, data: NOTES });
    } else if (filter === 'notes') {
      data.push({ type: 'notes', title: 'Notes', icon: 'document-text', color: T.gold, data: NOTES });
    } else if (filter === 'items') {
      data.push({ type: 'items', title: 'Items for Sale', icon: 'cube', color: T.accent, data: [ITEMS] });
    } else if (filter === 'dept') {
      data.push({ type: 'empty', title: '', data: [{ id: 'empty' }] });
    }
    return data;
  }, [filter, T]);

  const renderSectionHeader = ({ section }: any) => {
    if (section.type === 'empty') return null;
    return (
      <View style={[styles.sectionHead, { backgroundColor: T.bg }]}>
        <View style={styles.sectionLeft}>
          <Ionicons name={section.icon} size={18} color={section.color} />
          <Text style={[{ color: T.text, fontFamily: fonts.semibold, fontSize: fontSizes.md }]}>{section.title}</Text>
        </View>
        {filter === 'all' && (
          <TouchableOpacity onPress={() => setFilter(section.type as Filter)}>
            <Text style={[{ color: T.accent, fontFamily: fonts.medium, fontSize: fontSizes.sm }]}>See all</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const renderItem = ({ item, section }: any) => {
    switch (section.type) {
      case 'items':
        return (
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalScroll}
            decelerationRate="fast"
            snapToInterval={ITEM_CARD_W + spacing.md}
            data={item}
            keyExtractor={(i) => i.id}
            renderItem={({ item: gridItem }) => (
              <ItemCard item={gridItem} T={T} onPress={() => navigation.navigate('MarketListing', { listingId: gridItem.id })} />
            )}
          />
        );
      case 'notes':
        return <NoteRow note={item} T={T} onPress={() => navigation.navigate('MarketListing', { listingId: item.id })} />;
      case 'empty':
        return (
          <View style={styles.emptyState}>
            <Ionicons name="school-outline" size={44} color={T.text3} />
            <Text style={[{ color: T.text, fontFamily: fonts.semibold, fontSize: fontSizes.md, textAlign: 'center', marginTop: spacing.md }]}>CS Department Market</Text>
            <Text style={[{ color: T.text3, fontFamily: fonts.regular, fontSize: fontSizes.sm, textAlign: 'center', marginTop: spacing.xs }]}>Listings from your department will appear here once synced.</Text>
          </View>
        );
      default:
        return null;
    }
  };

  const HeaderComponent = () => (
    <View style={{ backgroundColor: T.bg }}>
      <View style={[styles.header, { borderBottomColor: T.border }]}>
        <Text style={[{ color: T.text, fontFamily: fonts.bold, fontSize: fontSizes.xl }]}>Market</Text>
        <View style={styles.headerRight}>
          <TouchableOpacity 
            onPress={() => setModalVisible(true)} 
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            {/* The icon highlights if a filter other than 'all' is selected */}
            <Ionicons name="options-outline" size={24} color={filter !== 'all' ? T.accent : T.text} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={[styles.searchWrap, { backgroundColor: T.bgInput, borderRadius: radii.lg }]}>
        <Ionicons name="search-outline" size={16} color={T.text3} />
        <TextInput value={query} onChangeText={setQuery} placeholder="Search notes, items..." placeholderTextColor={T.textMuted}
          style={[styles.searchInput, { color: T.text, fontFamily: fonts.regular, fontSize: fontSizes.md }]} />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => setQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="close-circle" size={16} color={T.text3} />
          </TouchableOpacity>
        )}
      </View>

      {/* Subtle "Earn Money" Inline Message */}
      <View style={styles.earnMoneyRow}>
        <Text style={[{ color: T.text2, fontFamily: fonts.regular, fontSize: fontSizes.xs }]}>
          Have study materials lying around?
        </Text>
        <TouchableOpacity hitSlop={{ top: 10, bottom: 10, left: 5, right: 5 }}>
          <Text style={[{ color: T.accent, fontFamily: fonts.semibold, fontSize: fontSizes.xs }]}>
            Sell them to earn cash
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: T.bg }]} edges={['top']}>
      <SectionList
        sections={sections}
        keyExtractor={(item, index) => item.id ? item.id : index.toString()}
        renderItem={renderItem}
        renderSectionHeader={renderSectionHeader}
        ListHeaderComponent={HeaderComponent}
        stickySectionHeadersEnabled={false}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + spacing.xl }}
      />

      {/* Dropdown Filter Modal */}
      <Modal visible={modalVisible} transparent animationType="fade" onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalScrim}>
          <Pressable style={StyleSheet.absoluteFillObject} onPress={() => setModalVisible(false)} />
          
          {/* Dropdown positioned near the top right, matching standard overflow menu styling */}
          <View style={[
            styles.dropdownContent, 
            { 
              backgroundColor: T.bg, 
              borderColor: T.border,
              top: insets.top + 55 // Anchored just below the header icon
            } 
          ]}>
            {FILTERS.map((f, index) => {
              const active = filter === f.key;
              const isLast = index === FILTERS.length - 1;
              return (
                <TouchableOpacity 
                  key={f.key} 
                  style={[styles.dropdownOption, { borderBottomWidth: isLast ? 0 : StyleSheet.hairlineWidth, borderBottomColor: T.borderSubtle }]} 
                  onPress={() => { setFilter(f.key); setModalVisible(false); }}
                >
                  <View style={styles.dropdownOptionLeft}>
                    <Ionicons name={f.icon} size={20} color={active ? T.accent : T.text} />
                    <Text style={[{ color: active ? T.accent : T.text, fontFamily: active ? fonts.semibold : fonts.regular, fontSize: fontSizes.md }]}>
                      {f.label}
                    </Text>
                  </View>
                  {active && <Ionicons name="checkmark" size={20} color={T.accent} />}
                </TouchableOpacity>
              );
            })}
          </View>

        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.base, paddingVertical: spacing.md, borderBottomWidth: StyleSheet.hairlineWidth },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  searchWrap: { flexDirection: 'row', alignItems: 'center', marginHorizontal: spacing.base, marginTop: spacing.md, paddingHorizontal: spacing.md, height: 46, gap: spacing.sm },
  searchInput: { flex: 1, includeFontPadding: false },
  
  earnMoneyRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: spacing.sm, gap: spacing.xs },
  
  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.base, paddingTop: spacing.md, paddingBottom: spacing.sm },
  sectionLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  horizontalScroll: { paddingHorizontal: spacing.base, gap: spacing.md },
  emptyState: { alignItems: 'center', paddingTop: 80, paddingHorizontal: spacing.xxl },
  
  noteRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.base, paddingVertical: spacing.md, gap: spacing.md, borderBottomWidth: StyleSheet.hairlineWidth },
  noteIcon: { width: 46, height: 46, borderRadius: radii.md, alignItems: 'center', justifyContent: 'center' },
  noteInfo: { flex: 1 },
  noteBottom: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: 4 },
  noteTypePill: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 6, paddingVertical: 2, borderRadius: radii.pill },
  notePrice: { alignItems: 'flex-end', gap: spacing.xs },
  buyBtn: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: radii.pill },
  
  itemCard: { borderRadius: radii.lg, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  itemImg: { height: 120, alignItems: 'center', justifyContent: 'center' },
  conditionDot: { position: 'absolute', top: spacing.sm, right: spacing.sm, width: 10, height: 10, borderRadius: 99 },
  itemInfo: { padding: spacing.sm },
  itemBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
  
  // Dropdown Overflow Menu styling
  modalScrim: { flex: 1, backgroundColor: 'transparent' }, // transparent to act like a true dropdown menu overlay
  dropdownContent: { 
    position: 'absolute', 
    right: spacing.base, 
    width: 220, 
    borderRadius: radii.md, 
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: spacing.xs,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  dropdownOption: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: spacing.md, paddingHorizontal: spacing.md },
  dropdownOptionLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
});