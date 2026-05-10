// src/components/chats/ChatRow.tsx

import React, { useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated as RNAnimated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Swipeable from 'react-native-gesture-handler/Swipeable';

import { fonts, fontSizes, spacing } from '../../types/theme';
import { Avatar } from '../ui';
import { Chat } from '../../constants/mockChats';
import { useStoryStore, selectShowStoryRing } from '../../store/useStoryStore';

// `hasStory` on the chat object is a transitional override: parents still
// pass it from mock data. When present it acts as a parent-supplied veto
// (e.g. "this user definitely doesn't have a story"). When omitted, the
// store decides based on the chat's user-id alone.
type ChatWithStory = Chat & { hasStory?: boolean };

function chatTime(dateStr: string): string {
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 60)      return 'now';
  if (diff < 3600)    return `${Math.floor(diff / 60)}m`;
  if (diff < 86400)   return `${Math.floor(diff / 3600)}h`;
  if (diff < 604800)  return `${Math.floor(diff / 86400)}d`;
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export const GroupAvatar: React.FC<{ T: any }> = ({ T }) => (
  <View style={[styles.groupAvatar, { backgroundColor: T.tealMuted, borderColor: T.teal }]}>
    <Ionicons name="people" size={20} color={T.teal} />
  </View>
);

export const ChatRow = React.memo(({ 
  chat, T, isSelected, selectionMode, isStoryMuted,
  onPress, onLongPress, onAvatarPress, onNamePress // 👈 Added onNamePress
}: { 
  chat: ChatWithStory; T: any; isSelected: boolean; selectionMode: boolean; isStoryMuted: boolean;
  onPress: () => void; onLongPress: () => void; onAvatarPress: () => void; onNamePress: () => void;
}) => {
  const isUnread = chat.unread > 0 && !chat.muted;

  // Story ring visibility derives from the global story store so it stays
  // in sync with PostCard / StoryRow / ActiveNowRow. The `chat.hasStory`
  // prop, when explicitly set to false, can still suppress the ring (e.g.
  // group chats, or a parent that knows this user has nothing to show).
  const showStory = useStoryStore(selectShowStoryRing(chat.id));
  const hasActiveStory =
    chat.type !== 'group'
    && (chat.hasStory ?? true) !== false
    && showStory
    && !isStoryMuted;
  const ringColor = isStoryMuted ? T.borderStrong : T.accent;
  
  const swipeableRef = useRef<Swipeable>(null);

  // ─── Swipe Action Builders ───
  const renderLeftActions = (progress: RNAnimated.AnimatedInterpolation<number>, dragX: RNAnimated.AnimatedInterpolation<number>) => {
    const scale = dragX.interpolate({ inputRange: [0, 80], outputRange: [0, 1], extrapolate: 'clamp' });
    return (
      <TouchableOpacity style={[styles.leftAction, { backgroundColor: T.accent }]} onPress={() => swipeableRef.current?.close()}>
        <RNAnimated.View style={{ transform: [{ scale }] }}>
          <Ionicons name={isUnread ? "mail-open" : "mail"} size={26} color="#fff" />
        </RNAnimated.View>
      </TouchableOpacity>
    );
  };

  const renderRightActions = (progress: RNAnimated.AnimatedInterpolation<number>, dragX: RNAnimated.AnimatedInterpolation<number>) => {
    const scaleArchive = dragX.interpolate({ inputRange: [-140, -70], outputRange: [1, 0], extrapolate: 'clamp' });
    const scaleDelete = dragX.interpolate({ inputRange: [-70, 0], outputRange: [1, 0], extrapolate: 'clamp' });
    return (
      <View style={styles.rightActionsWrap}>
        <TouchableOpacity style={[styles.rightActionBtn, { backgroundColor: T.text3 }]} onPress={() => swipeableRef.current?.close()}>
          <RNAnimated.View style={{ transform: [{ scale: scaleArchive }] }}><Ionicons name="archive" size={24} color="#fff" /></RNAnimated.View>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.rightActionBtn, { backgroundColor: T.error }]} onPress={() => swipeableRef.current?.close()}>
          <RNAnimated.View style={{ transform: [{ scale: scaleDelete }] }}><Ionicons name="trash" size={24} color="#fff" /></RNAnimated.View>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <Swipeable
      ref={swipeableRef}
      renderLeftActions={renderLeftActions}
      renderRightActions={renderRightActions}
      enabled={!selectionMode} 
      friction={2} rightThreshold={40} leftThreshold={40}
    >
      <TouchableOpacity
        style={[
          styles.chatRow, 
          { backgroundColor: T.bg, borderBottomColor: T.borderSubtle },
          isSelected && { backgroundColor: T.accentMuted }
        ]}
        onPress={onPress}
        onLongPress={onLongPress}
        activeOpacity={1}
        delayLongPress={250}
      >
        {/* ── Avatar Tap Target ── */}
        <View style={styles.avatarWrap}>
          {selectionMode && (
            <View style={[styles.selectionCheck, isSelected ? { backgroundColor: T.accent, borderColor: T.accent } : { borderColor: T.borderStrong }]}>
              {isSelected && <Ionicons name="checkmark" size={12} color="#fff" />}
            </View>
          )}

          {chat.type === 'group' ? (
              <TouchableOpacity onPress={onAvatarPress} activeOpacity={0.8} disabled={selectionMode}>
                <GroupAvatar T={T} />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity onPress={onAvatarPress} activeOpacity={0.8} disabled={selectionMode}>
                <View style={[hasActiveStory && styles.storyRing, hasActiveStory && { borderColor: ringColor }]}>
                  <Avatar size="md" name={chat.name} uri={chat.avatar} showOnline={chat.online && !hasActiveStory} />
                </View>
              </TouchableOpacity>
            )
          }
        </View>

        <View style={styles.chatContent}>
          <View style={styles.chatTopRow}>
            {/* ── Name Tap Target ── */}
            <TouchableOpacity onPress={onNamePress} disabled={selectionMode} style={styles.nameHitbox}>
              <Text style={[styles.chatName, { color: isUnread ? T.text : T.text2, fontFamily: isUnread ? fonts.bold : fonts.semibold }]} numberOfLines={1}>
                {chat.name}
              </Text>
            </TouchableOpacity>
            <Text style={[styles.chatMeta, { color: isUnread ? T.accent : T.text3, fontFamily: isUnread ? fonts.bold : fonts.medium }]}>
              {chatTime(chat.lastTime)}
            </Text>
          </View>

          <View style={styles.chatBottomRow}>
            <Text style={[styles.lastMsg, { color: isUnread ? T.text2 : T.text3, fontFamily: isUnread ? fonts.semibold : fonts.medium }]} numberOfLines={1}>
              {chat.type === 'group' && chat.lastSender && <Text style={{ color: T.text3, fontFamily: fonts.medium }}>{chat.lastSender}: </Text>}
              {chat.lastMessage}
            </Text>

            {chat.muted ? (
              <Ionicons name="volume-mute" size={14} color={T.textMuted} />
            ) : chat.unread > 0 ? (
              <View style={[styles.unreadBadge, { backgroundColor: T.accent }]}>
                <Text style={[styles.unreadText, { fontFamily: fonts.bold }]}>{chat.unread > 99 ? '99+' : chat.unread}</Text>
              </View>
            ) : null}
          </View>
        </View>
      </TouchableOpacity>
    </Swipeable>
  );
});

const styles = StyleSheet.create({
  chatRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.base, paddingVertical: spacing.md, gap: spacing.md, borderBottomWidth: StyleSheet.hairlineWidth },
  avatarWrap: { position: 'relative', alignItems: 'center', justifyContent: 'center' },
  selectionCheck: { position: 'absolute', left: -8, bottom: 0, width: 18, height: 18, borderRadius: 9, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', zIndex: 10, backgroundColor: 'transparent' },
  storyRing: { padding: 2, borderRadius: 99, borderWidth: 2 },
  chatContent: { flex: 1 },
  chatTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 },
  nameHitbox: { flex: 1, marginRight: spacing.sm }, // Added to make the tap area generous
  chatName: { fontSize: fontSizes.md },
  chatMeta: { fontSize: fontSizes.xs },
  chatBottomRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  lastMsg: { fontSize: fontSizes.sm, flex: 1, marginRight: spacing.sm },
  groupAvatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  unreadBadge: { minWidth: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  unreadText: { color: '#fff', fontSize: 10 },
  leftAction: { flex: 1, justifyContent: 'center', paddingLeft: spacing.xl },
  rightActionsWrap: { flexDirection: 'row', width: 140 },
  rightActionBtn: { flex: 1, alignItems: 'center', justifyContent: 'center' }
});