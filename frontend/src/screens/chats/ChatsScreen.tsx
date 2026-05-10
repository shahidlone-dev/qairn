// src/screens/chats/ChatsScreen.tsx

import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Pressable } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from 'react-native';
import Animated, { useSharedValue, useAnimatedScrollHandler } from 'react-native-reanimated';
import { BlurView } from 'expo-blur'; 

import { getTheme, fonts, fontSizes, spacing, radii } from '../../types/theme';
import { Avatar } from '../../components/ui';
import { MOCK_CHATS, Chat, FilterType } from '../../constants/mockChats';
import { MainTabScreenProps } from '../../types/navigation';
import { CURRENT_USER } from '../../constants/mockFeed';

import { ChatRow } from '../../components/chats/ChatRow';
import { ChatsHeader } from '../../components/chats/ChatsHeader';
import { useStoryStore, userHasStory } from '../../store/useStoryStore';

type Props = MainTabScreenProps<'Chats'>;
type ChatWithStory = Chat & { hasStory?: boolean };

export const ChatsScreen: React.FC<Props> = ({ navigation }) => {
  const scheme = useColorScheme();
  const T = getTheme(scheme);
  const insets = useSafeAreaInsets();

  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<FilterType>('all');
  const [menuOpen, setMenuOpen] = useState(false);

  const [selectedChats, setSelectedChats] = useState<Set<string>>(new Set());
  const [mutedStories, setMutedStories] = useState<Set<string>>(new Set());

  const selectionMode = selectedChats.size > 0;

  // ── Reanimated Scroll Sensor ──
  const isScrollingDown = useSharedValue(false);
  const lastScrollY = useSharedValue(0);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      const currentY = event.contentOffset.y;
      if (currentY < 0) return; 

      if (currentY > lastScrollY.value + 5) {
        isScrollingDown.value = true;
      } else if (currentY < lastScrollY.value - 5) {
        isScrollingDown.value = false;
      }
      lastScrollY.value = currentY;
    },
  });

  const filtered = useMemo(() => {
    // hasStory is now a passive override only — leave it unset and let the
    // useStoryStore + userHasStory() helper decide. Group chats explicitly
    // opt out so the ring never renders on them.
    let list: ChatWithStory[] = MOCK_CHATS.map(chat => ({
      ...chat,
      hasStory: chat.type !== 'group' ? undefined : false,
    }));

    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(c => c.name.toLowerCase().includes(q) || c.lastMessage.toLowerCase().includes(q));
    }
    switch (filter) {
      case 'groups':     return list.filter(c => c.type === 'group');
      case 'unread':     return list.filter(c => c.unread > 0);
      case 'favorites':  return list.filter(c => c.favorite);
      case 'department': return list.filter(c => c.isDept);
      case 'section':    return list.filter(c => c.isSection);
      default:           return list;
    }
  }, [query, filter]);

  const handleRowPress = (chat: ChatWithStory) => {
    if (selectionMode) {
      toggleSelection(chat.id);
    } else {
      navigation.navigate('ChatRoom', { name: chat.name });
    }
  };

  const toggleSelection = (chatId: string) => {
    setSelectedChats(prev => {
      const next = new Set(prev);
      if (next.has(chatId)) next.delete(chatId);
      else next.add(chatId);
      return next;
    });
  };

  const glassCardColor = scheme === 'dark' ? 'rgba(25, 25, 25, 0.65)' : 'rgba(255, 255, 255, 0.75)';
  const glassIconBg = scheme === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)';

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: T.bg }]} edges={['left', 'right']}>
      
      <ChatsHeader 
        T={T}
        insets={insets}
        query={query}
        setQuery={setQuery}
        filter={filter}
        setFilter={setFilter}
        selectionMode={selectionMode}
        selectedCount={selectedChats.size}
        onClearSelection={() => setSelectedChats(new Set())}
        onMenuPress={() => setMenuOpen(true)}
        isScrollingDown={isScrollingDown}
      />

      <Animated.FlatList
        data={filtered}
        keyExtractor={item => item.id}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingBottom: 120 }}
        
        ListHeaderComponent={
          selectionMode ? null : (
            <TouchableOpacity 
              style={[styles.savedRow, { borderBottomColor: T.borderSubtle, backgroundColor: T.bg }]}
              onPress={() => navigation.navigate('ChatRoom', { name: CURRENT_USER.username })}
              disabled={selectionMode}
            >
              {/* ── My Story Upload Trigger ── */}
              <TouchableOpacity 
                activeOpacity={0.8}
                disabled={selectionMode}
                onPress={() => {
                  navigation.navigate('StoryCamera');
                }}
              >
                <View style={styles.avatarWrap}>
                  <Avatar size="md" name={CURRENT_USER.username} />
                  <View style={[styles.addBadge, { backgroundColor: T.accent, borderColor: T.bg }]}>
                    <Ionicons name="add" size={14} color="#fff" />
                  </View>
                </View>
              </TouchableOpacity>

              <View style={styles.savedContent}>
                <Text style={{ color: T.text, fontFamily: fonts.bold, fontSize: fontSizes.md }}>Saved Messages</Text>
                <Text style={{ color: T.text3, fontFamily: fonts.medium, fontSize: fontSizes.sm }}>Your personal space</Text>
              </View>
              <Ionicons name="bookmark" size={20} color={T.accent} />
            </TouchableOpacity>
          )
        }
        
        renderItem={({ item }) => (
          <ChatRow 
            chat={item} 
            T={T} 
            isSelected={selectedChats.has(item.id)}
            selectionMode={selectionMode}
            isStoryMuted={mutedStories.has(item.id)}
            onPress={() => handleRowPress(item)} 
            onLongPress={() => !selectionMode && toggleSelection(item.id)}
            
            // ── Avatar tap routing ──
            // Story viewer if (a) the user has a story AND (b) the current
            // viewer hasn't already watched it. Otherwise straight to profile.
            // Reads the store imperatively here (not via subscription) because
            // we only need a single snapshot at tap time.
            onAvatarPress={() => {
              const viewed = useStoryStore.getState().viewedStories.has(item.id);
              const hasUnviewed =
                item.type !== 'group'
                && (item.hasStory ?? true) !== false
                && userHasStory(item.id)
                && !viewed;
              if (hasUnviewed) {
                navigation.navigate('StoryViewer', { userId: item.id });
              } else {
                navigation.navigate('Profile', { userId: item.id });
              }
            }}
            onNamePress={() => {
              navigation.navigate('Profile', { userId: item.id });
            }}
          />
        )}
        
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="chatbubbles-outline" size={48} color={T.textMuted} />
            <Text style={[styles.emptyText, { color: T.text2 }]}>No conversations found</Text>
          </View>
        }
      />

      {/* ── Top Right 3-Dot Menu Modal ── */}
      <Modal visible={menuOpen} transparent animationType="fade" onRequestClose={() => setMenuOpen(false)}>
        <BlurView intensity={scheme === 'dark' ? 30 : 20} tint={scheme === 'dark' ? 'dark' : 'light'} style={StyleSheet.absoluteFill}>
          <Pressable style={styles.dropScrimGlass} onPress={() => setMenuOpen(false)}>
            <BlurView 
              intensity={80} 
              tint={scheme === 'dark' ? 'dark' : 'light'} 
              style={[styles.dropMenu, { backgroundColor: glassCardColor, borderColor: T.borderSubtle, top: insets.top + 55 }]}
            >
{[
  { icon: 'person-add-outline', label: 'Chat requests', route: 'ChatRequests' },
  { icon: 'ban-outline',        label: 'Blocked chats', route: 'BlockedChats' },
  { icon: 'checkmark-done',     label: 'Read all',      route: null },
  { icon: 'people-outline',     label: 'New group',     route: 'NewGroup' },
].map((item, i, arr) => (
  <TouchableOpacity 
    key={item.label} 
    style={[styles.dropItem, i < arr.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: T.borderSubtle }]}
    onPress={() => {
      setMenuOpen(false);
      // Navigate to the route if it exists
      if (item.route) {
        navigation.navigate(item.route as any);
      } else if (item.label === 'Read all') {
        // Implement read all logic here later
        console.log("Read all pressed");
      }
    }}
  >
    <View style={[styles.dropIconWrap, { backgroundColor: glassIconBg }]}>
      <Ionicons name={item.icon as any} size={18} color={T.text} />
    </View>
    <Text style={[styles.dropText, { color: T.text }]}>{item.label}</Text>
  </TouchableOpacity>
))}
            </BlurView>
          </Pressable>
        </BlurView>
      </Modal>

    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1 },
  savedRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.base, paddingVertical: spacing.md, gap: spacing.md, borderBottomWidth: StyleSheet.hairlineWidth },
  avatarWrap: { position: 'relative', alignItems: 'center', justifyContent: 'center' },
  addBadge: { position: 'absolute', bottom: -2, right: -2, width: 22, height: 22, borderRadius: 11, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  savedContent: { flex: 1 },
  emptyState: { alignItems: 'center', marginTop: 100 },
  emptyText: { marginTop: spacing.md, fontSize: fontSizes.md, fontFamily: fonts.medium },

  dropScrimGlass: { flex: 1, backgroundColor: 'rgba(0,0,0,0.1)', justifyContent: 'center', alignItems: 'center' },
  dropMenu: { position: 'absolute', right: spacing.base, width: 220, borderRadius: radii.xl, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.15, shadowRadius: 20, elevation: 10 },
  dropItem: { flexDirection: 'row', alignItems: 'center', padding: spacing.md, gap: spacing.md },
  dropIconWrap: { width: 36, height: 36, borderRadius: radii.md, alignItems: 'center', justifyContent: 'center' },
  dropText: { fontSize: fontSizes.md, fontFamily: fonts.medium },
});