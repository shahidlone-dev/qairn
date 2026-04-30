// src/screens/chats/ChatsScreen.tsx

import React, { useState, useMemo, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Animated,
  Modal,
  Pressable,
  ScrollView,
  NativeSyntheticEvent,
  NativeScrollEvent,
  Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from 'react-native';
import { getTheme, fonts, fontSizes, spacing, radii } from '../../theme/theme';
import { Avatar } from '../../components/ui';
import { MOCK_CHATS, Chat, FilterType } from '../../constants/mockChats';
import { MainTabScreenProps } from '../../types/navigation';
import { CURRENT_USER } from '../../constants/mockFeed';

type Props = MainTabScreenProps<'Chats'>;

type ChatWithStory = Chat & { hasStory?: boolean };

const PILL_HEIGHT = 48; 

// ─── Helpers ──────────────────────────────────────────────────────────────────
function chatTime(dateStr: string): string {
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 60)      return 'now';
  if (diff < 3600)    return `${Math.floor(diff / 60)}m`;
  if (diff < 86400)   return `${Math.floor(diff / 3600)}h`;
  if (diff < 604800)  return `${Math.floor(diff / 86400)}d`;
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

const FILTERS: { key: FilterType; label: string }[] = [
  { key: 'all',        label: 'All'           },
  { key: 'unread',     label: 'Unread'        },
  { key: 'favorites',  label: 'Favorites'     },
  { key: 'groups',     label: 'Groups'        },
  { key: 'department', label: 'My Department' },
  { key: 'section',    label: 'My Section'    },
];

const GroupAvatar: React.FC<{ T: any }> = ({ T }) => (
  <View style={[styles.groupAvatar, { backgroundColor: T.tealMuted, borderColor: T.teal }]}>
    <Ionicons name="people" size={20} color={T.teal} />
  </View>
);

// ─── Chat Row Component ───────────────────────────────────────────────────────
const ChatRow = React.memo(({ 
  chat, 
  T, 
  isSelected,
  selectionMode,
  isStoryMuted,
  onPress, 
  onLongPress,
  onAvatarPress,
  onAvatarLongPress
}: { 
  chat: ChatWithStory; 
  T: any; 
  isSelected: boolean;
  selectionMode: boolean;
  isStoryMuted: boolean;
  onPress: () => void; 
  onLongPress: () => void;
  onAvatarPress: () => void;
  onAvatarLongPress: () => void;
}) => {
  const isUnread = chat.unread > 0 && !chat.muted;
  
  // Determine story ring styling
  const hasActiveStory = chat.hasStory && !isStoryMuted;
  const ringColor = isStoryMuted ? T.borderStrong : T.accent;

  return (
    <TouchableOpacity
      style={[
        styles.chatRow, 
        { borderBottomColor: T.borderSubtle },
        isSelected && { backgroundColor: T.accentMuted } // Highlight if selected
      ]}
      onPress={onPress}
      onLongPress={onLongPress}
      activeOpacity={0.7}
      delayLongPress={250}
    >
      <View style={styles.avatarWrap}>
        {/* Selection Checkbox */}
        {selectionMode && (
          <View style={[styles.selectionCheck, isSelected ? { backgroundColor: T.accent, borderColor: T.accent } : { borderColor: T.borderStrong }]}>
            {isSelected && <Ionicons name="checkmark" size={12} color="#fff" />}
          </View>
        )}

        {chat.type === 'group'
          ? (
            <TouchableOpacity 
              onPress={onAvatarPress}
              // Explicitly omitting onLongPress so hold does nothing
              activeOpacity={0.8}
              disabled={selectionMode}
            >
              <GroupAvatar T={T} />
            </TouchableOpacity>
          )
          : (
            <TouchableOpacity 
              onPress={onAvatarPress} 
              onLongPress={onAvatarLongPress}
              activeOpacity={0.8}
              disabled={selectionMode}
            >
              <View style={[chat.hasStory && styles.storyRing, chat.hasStory && { borderColor: ringColor }]}>
                <Avatar size="md" name={chat.name} uri={chat.avatar} showOnline={chat.online && !chat.hasStory} />
              </View>
            </TouchableOpacity>
          )
        }
      </View>

      <View style={styles.chatContent}>
        <View style={styles.chatTopRow}>
          <Text
            style={[styles.chatName, { color: isUnread ? T.text : T.text2, fontFamily: isUnread ? fonts.semibold : fonts.regular }]}
            numberOfLines={1}
          >
            {chat.name}
          </Text>
          <Text style={[styles.chatMeta, { color: isUnread ? T.accent : T.text3, fontFamily: isUnread ? fonts.semibold : fonts.regular }]}>
            {chatTime(chat.lastTime)}
          </Text>
        </View>

        <View style={styles.chatBottomRow}>
          <Text
            style={[styles.lastMsg, { color: isUnread ? T.text2 : T.text3, fontFamily: isUnread ? fonts.medium : fonts.regular }]}
            numberOfLines={1}
          >
            {chat.type === 'group' && chat.lastSender && (
              <Text style={{ color: T.text3, fontFamily: fonts.medium }}>{chat.lastSender}: </Text>
            )}
            {chat.lastMessage}
          </Text>

          {chat.muted ? (
            <Ionicons name="volume-mute" size={14} color={T.textMuted} />
          ) : chat.unread > 0 ? (
            <View style={[styles.unreadBadge, { backgroundColor: T.accent }]}>
              <Text style={[styles.unreadText, { fontFamily: fonts.bold }]}>
                {chat.unread > 99 ? '99+' : chat.unread}
              </Text>
            </View>
          ) : null}
        </View>
      </View>
    </TouchableOpacity>
  );
});

// ─── Main Screen ──────────────────────────────────────────────────────────────
export const ChatsScreen: React.FC<Props> = ({ navigation }) => {
  const T = getTheme(useColorScheme());
  const insets = useSafeAreaInsets();

  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<FilterType>('all');
  const [menuOpen, setMenuOpen] = useState(false);

  // Advanced Interaction States
  const [selectedChats, setSelectedChats] = useState<Set<string>>(new Set());
  const [mutedStories, setMutedStories] = useState<Set<string>>(new Set());
  const [avatarModalTarget, setAvatarModalTarget] = useState<ChatWithStory | null>(null);

  const selectionMode = selectedChats.size > 0;

  // Animation values
  const pillsVisible = useRef(new Animated.Value(0)).current;
  const lastScrollY = useRef(0);

  const handleScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const y = e.nativeEvent.contentOffset.y;
    
    if (y <= 0) {
      Animated.spring(pillsVisible, { toValue: 1, useNativeDriver: false, tension: 50, friction: 7 }).start();
    } else if (y > 60 && y > lastScrollY.current) {
      Animated.spring(pillsVisible, { toValue: 0, useNativeDriver: false, tension: 50, friction: 10 }).start();
    }
    
    lastScrollY.current = y;
  }, []);

  const pillsHeight = pillsVisible.interpolate({
    inputRange: [0, 1],
    outputRange: [0, PILL_HEIGHT],
    extrapolate: 'clamp'
  });

  const pillsOpacity = pillsVisible.interpolate({
    inputRange: [0, 0.8, 1],
    outputRange: [0, 0, 1],
  });

  const filtered = useMemo(() => {
    let list: ChatWithStory[] = MOCK_CHATS.map((chat, index) => ({
      ...chat,
      hasStory: index % 3 === 0 && chat.type !== 'group' 
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

  // ── Handlers ────────────────────────────────────────────────────────────────
  const handleRowPress = (chat: ChatWithStory) => {
    if (selectionMode) {
      toggleSelection(chat.id);
    } else {
      navigation.navigate('ChatRoom', { name: chat.name });
    }
  };

  const handleRowLongPress = (chatId: string) => {
    if (!selectionMode) toggleSelection(chatId);
  };

  const toggleSelection = (chatId: string) => {
    setSelectedChats(prev => {
      const next = new Set(prev);
      if (next.has(chatId)) next.delete(chatId);
      else next.add(chatId);
      return next;
    });
  };

  const handleAvatarPress = (chat: ChatWithStory) => {
    if (chat.type === 'group') {
      setAvatarModalTarget(chat);
      return;
    }

    const isMuted = mutedStories.has(chat.id);
    if (chat.hasStory && !isMuted) {
      // navigation.navigate('StoryViewer', { userId: chat.id });
      console.log('Opening story for', chat.name);
    } else {
      setAvatarModalTarget(chat);
    }
  };

  const handleAvatarLongPress = (chat: ChatWithStory) => {
    if (chat.type !== 'group') {
      setAvatarModalTarget(chat);
    }
  };

  const handleToggleMuteStory = () => {
    if (avatarModalTarget) {
      setMutedStories(prev => {
        const next = new Set(prev);
        if (next.has(avatarModalTarget.id)) next.delete(avatarModalTarget.id);
        else next.add(avatarModalTarget.id);
        return next;
      });
      setAvatarModalTarget(null);
    }
  };

  // ── Render Header ───────────────────────────────────────────────────────────
  const renderHeader = () => {
    if (selectionMode) {
      const selectedChatObjects = MOCK_CHATS.filter(c => selectedChats.has(c.id));
      const selectedGroupsCount = selectedChatObjects.filter(c => c.type === 'group').length;
      const selectedUsersCount = selectedChats.size - selectedGroupsCount;

      const showBlockAndRemove = selectedChats.size === 1 && selectedUsersCount === 1;
      const showDelete = selectedUsersCount > 0 && selectedGroupsCount === 0;
      const showExitGroup = selectedChats.size === 1 && selectedGroupsCount === 1;

      return (
        <View style={[styles.header, { borderBottomColor: T.border, backgroundColor: T.bgInput }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
            <TouchableOpacity onPress={() => setSelectedChats(new Set())} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close" size={24} color={T.text} />
            </TouchableOpacity>
            <Text style={[{ color: T.text, fontFamily: fonts.semibold, fontSize: fontSizes.lg }]}>
              {selectedChats.size}
            </Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.headerBtn}>
              <Ionicons name="archive-outline" size={22} color={T.text} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.headerBtn}>
              <Ionicons name="volume-mute-outline" size={22} color={T.text} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.headerBtn}>
              <Ionicons name="checkmark-done-outline" size={24} color={T.text} />
            </TouchableOpacity>

            {/* Contextual Actions */}
            {showBlockAndRemove && (
              <>
                <TouchableOpacity style={styles.headerBtn}>
                  <Ionicons name="person-remove-outline" size={22} color={T.text} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.headerBtn}>
                  <Ionicons name="ban-outline" size={22} color={T.text} />
                </TouchableOpacity>
              </>
            )}
            {showDelete && (
              <TouchableOpacity style={styles.headerBtn}>
                <Ionicons name="trash-outline" size={22} color={T.error} />
              </TouchableOpacity>
            )}
            {showExitGroup && (
              <TouchableOpacity style={styles.headerBtn}>
                <Ionicons name="log-out-outline" size={22} color={T.error} />
              </TouchableOpacity>
            )}
          </View>
        </View>
      );
    }

    return (
      <View style={[styles.header, { borderBottomColor: T.border }]}>
        <Text style={[styles.headerTitle, { color: T.text }]}>Chats</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.headerBtn}>
            <Ionicons name="camera-outline" size={24} color={T.text} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerBtn} onPress={() => setMenuOpen(true)}>
            <Ionicons name="ellipsis-vertical" size={22} color={T.text} />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: T.bg }]} edges={['top']}>
      
      {renderHeader()}

      {/* Search Bar - Sticky */}
      <View style={[styles.searchContainer, { backgroundColor: T.bg }]}>
        <View style={[styles.searchWrap, { backgroundColor: T.bgInput, borderRadius: radii.lg }]}>
          <Ionicons name="search-outline" size={18} color={T.text3} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search chats..."
            placeholderTextColor={T.textMuted}
            style={[styles.searchInput, { color: T.text, fontFamily: fonts.regular }]}
            clearButtonMode="while-editing"
          />
        </View>
      </View>

      {/* Animated Filter Pills Row */}
      <Animated.View style={[styles.pillsWrap, { height: pillsHeight, opacity: pillsOpacity }]}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false} 
          contentContainerStyle={styles.pillsScroll}
          keyboardShouldPersistTaps="handled"
        >
          {FILTERS.map(f => (
            <TouchableOpacity
              key={f.key}
              onPress={() => setFilter(f.key)}
              style={[
                styles.pill,
                { backgroundColor: filter === f.key ? T.accent : T.bgInput, borderColor: filter === f.key ? T.accent : T.border }
              ]}
            >
              <Text style={[styles.pillText, { color: filter === f.key ? '#fff' : T.text2 }]}>{f.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </Animated.View>

      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingBottom: 100 }}
        ListHeaderComponent={
          <TouchableOpacity 
            style={[styles.chatRow, { borderBottomColor: T.border }]}
            onPress={() => navigation.navigate('ChatRoom', { name: CURRENT_USER.username })}
            disabled={selectionMode}
          >
            {/* My Story Avatar Action */}
            <TouchableOpacity 
              activeOpacity={0.8} 
              onPress={() => {
                // Navigate to Story Creation screen
                // navigation.navigate('StoryCamera'); 
              }}
              disabled={selectionMode}
            >
              <View style={styles.avatarWrap}>
                <Avatar size="md" name={CURRENT_USER.username} />
                <View style={[styles.myStoryBadge, { backgroundColor: T.accent, borderColor: T.bg }]}>
                  <Ionicons name="add" size={14} color="#fff" />
                </View>
              </View>
            </TouchableOpacity>

            <View style={styles.chatContent}>
              <View style={styles.chatTopRow}>
                <Text style={[styles.chatName, { color: T.text, fontFamily: fonts.semibold }]}>
                  {CURRENT_USER.username} (You)
                </Text>
                <Ionicons name="bookmark" size={14} color={T.accent} />
              </View>
              <Text style={[styles.lastMsg, { color: T.text3 }]}>Saved messages / Notes</Text>
            </View>
          </TouchableOpacity>
        }
        renderItem={({ item }) => (
          <ChatRow 
            chat={item} 
            T={T} 
            isSelected={selectedChats.has(item.id)}
            selectionMode={selectionMode}
            isStoryMuted={mutedStories.has(item.id)}
            onPress={() => handleRowPress(item)} 
            onLongPress={() => handleRowLongPress(item.id)}
            onAvatarPress={() => handleAvatarPress(item)}
            onAvatarLongPress={() => handleAvatarLongPress(item)}
          />
        )}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="chatbubbles-outline" size={48} color={T.textMuted} />
            <Text style={[styles.emptyText, { color: T.text2 }]}>No conversations found</Text>
          </View>
        }
      />

      {/* Main Options Menu Modal */}
      <Modal visible={menuOpen} transparent animationType="fade" onRequestClose={() => setMenuOpen(false)}>
        <Pressable style={styles.dropScrim} onPress={() => setMenuOpen(false)}>
          <View style={[styles.dropMenu, { backgroundColor: T.bgCard, borderColor: T.border, top: insets.top + 55 }]}>
            {[
              { icon: 'person-add-outline',  label: 'Chat requests' },
              { icon: 'ban-outline',         label: 'Blocked chats' },
              { icon: 'checkmark-done',      label: 'Read all' },
              { icon: 'people-outline',      label: 'New group' },
            ].map((item, i, arr) => (
              <TouchableOpacity 
                key={item.label} 
                style={[styles.dropItem, i < arr.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: T.borderSubtle }]}
                onPress={() => setMenuOpen(false)}
              >
                <View style={[styles.dropIconWrap, { backgroundColor: T.bgInput }]}>
                  <Ionicons name={item.icon as any} size={18} color={T.text} />
                </View>
                <Text style={[styles.dropText, { color: T.text }]}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </Pressable>
      </Modal>

      {/* Universal Avatar Preview Context Modal */}
      <Modal visible={!!avatarModalTarget} transparent animationType="fade" onRequestClose={() => setAvatarModalTarget(null)}>
        <Pressable style={styles.dropScrim} onPress={() => setAvatarModalTarget(null)}>
          <View style={[styles.avatarModalCenter, { backgroundColor: T.bgCard, borderColor: T.border }]}>
            {avatarModalTarget && (
              <>
                <View style={styles.avatarModalHeader}>
                  <View style={{ transform: [{ scale: 1.2 }], marginBottom: spacing.sm }}>
                    {avatarModalTarget.type === 'group' ? (
                      <GroupAvatar T={T} />
                    ) : (
                      <Avatar size="md" name={avatarModalTarget.name} uri={avatarModalTarget.avatar} />
                    )}
                  </View>
                  <Text style={[{ color: T.text, fontFamily: fonts.bold, fontSize: fontSizes.lg, marginTop: spacing.md }]}>
                    {avatarModalTarget.name}
                  </Text>
                </View>

                {/* Message Action (Universal) */}
                <TouchableOpacity style={[styles.avatarModalAction, { borderTopColor: T.borderSubtle }]} onPress={() => {
                  setAvatarModalTarget(null);
                  navigation.navigate('ChatRoom', { name: avatarModalTarget.name });
                }}>
                  <Ionicons name="chatbubbles-outline" size={22} color={T.text} />
                  <Text style={[{ color: T.text, fontFamily: fonts.medium, fontSize: fontSizes.md }]}>Message</Text>
                </TouchableOpacity>

                {avatarModalTarget.type === 'group' ? (
                  /* Group Specific Actions */
                  <TouchableOpacity style={[styles.avatarModalAction, { borderTopColor: T.borderSubtle }]} onPress={() => {
                    setAvatarModalTarget(null);
                    // navigate to group info
                    navigation.navigate('Profile', { userId: avatarModalTarget.id });
                  }}>
                    <Ionicons name="people-circle-outline" size={22} color={T.text} />
                    <Text style={[{ color: T.text, fontFamily: fonts.medium, fontSize: fontSizes.md }]}>View Group</Text>
                  </TouchableOpacity>
                ) : (
                  /* User Specific Actions */
                  <>
                    <TouchableOpacity style={[styles.avatarModalAction, { borderTopColor: T.borderSubtle }]} onPress={() => {
                      setAvatarModalTarget(null);
                      navigation.navigate('Profile', { userId: avatarModalTarget.id });
                    }}>
                      <Ionicons name="person-circle-outline" size={22} color={T.text} />
                      <Text style={[{ color: T.text, fontFamily: fonts.medium, fontSize: fontSizes.md }]}>View Profile</Text>
                    </TouchableOpacity>

                    {/* Story Actions */}
                    {avatarModalTarget.hasStory && (
                      <>
                        <TouchableOpacity style={[styles.avatarModalAction, { borderTopColor: T.borderSubtle }]} onPress={() => {
                          setAvatarModalTarget(null);
                          // navigation.navigate('StoryViewer', { userId: avatarModalTarget.id });
                        }}>
                          <Ionicons name="play-circle-outline" size={22} color={T.text} />
                          <Text style={[{ color: T.text, fontFamily: fonts.medium, fontSize: fontSizes.md }]}>View Story</Text>
                        </TouchableOpacity>

                        {mutedStories.has(avatarModalTarget.id) ? (
                          <TouchableOpacity style={[styles.avatarModalAction, { borderTopColor: T.borderSubtle }]} onPress={handleToggleMuteStory}>
                            <Ionicons name="volume-high-outline" size={22} color={T.text} />
                            <Text style={[{ color: T.text, fontFamily: fonts.medium, fontSize: fontSizes.md }]}>Unmute Story</Text>
                          </TouchableOpacity>
                        ) : (
                          <TouchableOpacity style={[styles.avatarModalAction, { borderTopColor: T.borderSubtle }]} onPress={handleToggleMuteStory}>
                            <Ionicons name="volume-mute-outline" size={22} color={T.text3} />
                            <Text style={[{ color: T.text3, fontFamily: fonts.medium, fontSize: fontSizes.md }]}>Mute Story</Text>
                          </TouchableOpacity>
                        )}
                      </>
                    )}
                  </>
                )}
              </>
            )}
          </View>
        </Pressable>
      </Modal>

    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    minHeight: 60,
  },
  headerTitle: { fontSize: fontSizes.xl, fontFamily: fonts.bold },
  headerActions: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center' },
  headerBtn: { padding: spacing.xs },
  
  searchContainer: { paddingVertical: spacing.sm },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.base,
    paddingHorizontal: spacing.md,
    height: 44,
    gap: spacing.sm,
  },
  searchInput: { flex: 1, fontSize: fontSizes.md, includeFontPadding: false },
  
  pillsWrap: { overflow: 'hidden' },
  pillsScroll: { paddingHorizontal: spacing.base, gap: spacing.sm, alignItems: 'center' },
  pill: { paddingHorizontal: spacing.md, paddingVertical: 6, borderRadius: radii.pill, borderWidth: StyleSheet.hairlineWidth },
  pillText: { fontSize: fontSizes.xs, fontFamily: fonts.medium },

  chatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    gap: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  avatarWrap: { 
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectionCheck: {
    position: 'absolute',
    left: -8,
    bottom: 0,
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    backgroundColor: 'transparent'
  },
  
  // -- Story Specific Styles --
  storyRing: {
    padding: 2,
    borderRadius: 99,
    borderWidth: 2,
  },
  myStoryBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },

  chatContent: { flex: 1 },
  chatTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 },
  chatName: { fontSize: fontSizes.md, flex: 1, marginRight: spacing.sm },
  chatMeta: { fontSize: fontSizes.xs },
  chatBottomRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  lastMsg: { fontSize: fontSizes.sm, flex: 1, marginRight: spacing.sm },
  
  groupAvatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  unreadBadge: { minWidth: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  unreadText: { color: '#fff', fontSize: 10 },

  dropScrim: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
  dropMenu: {
    position: 'absolute',
    right: spacing.base,
    width: 220,
    borderRadius: radii.lg,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  dropItem: { flexDirection: 'row', alignItems: 'center', padding: spacing.md, gap: spacing.md },
  dropIconWrap: { width: 36, height: 36, borderRadius: radii.md, alignItems: 'center', justifyContent: 'center' },
  dropText: { fontSize: fontSizes.md, fontFamily: fonts.medium },

  avatarModalCenter: {
    width: 260,
    borderRadius: radii.xl,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
  },
  avatarModalHeader: {
    alignItems: 'center',
    padding: spacing.xl,
    paddingTop: spacing.xxl,
  },
  avatarModalAction: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },

  emptyState: { alignItems: 'center', marginTop: 100 },
  emptyText: { marginTop: spacing.md, fontSize: fontSizes.md, fontFamily: fonts.medium }
});