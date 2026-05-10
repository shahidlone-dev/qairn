// src/components/chats/ActiveNowRow.tsx

import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from 'react-native';

import { getTheme, fonts, spacing } from '../../types/theme';
import { Avatar } from '../ui';
import { Chat } from '../../constants/mockChats';
import { CURRENT_USER } from '../../constants/mockFeed';
import { useStoryStore, userHasStory } from '../../store/useStoryStore';

type ChatWithStory = Chat & { hasStory?: boolean };

interface Props {
  chats: ChatWithStory[];
  onUserPress: (chat: ChatWithStory) => void;
  onMyStoryPress: () => void;
}

export const ActiveNowRow: React.FC<Props> = ({ chats, onUserPress, onMyStoryPress }) => {
  const T = getTheme(useColorScheme());

  // Subscribe to the viewed-stories set so the rail updates the moment a
  // story is viewed (the user's bubble disappears unless they're also online).
  const viewedStories = useStoryStore(s => s.viewedStories);

  // Resolved per-user "has unviewed story" flag (store-truth, not the prop).
  const hasUnviewedStory = (c: ChatWithStory) =>
    c.type !== 'group'
    && (c.hasStory ?? true) !== false
    && userHasStory(c.id)
    && !viewedStories.has(c.id);

  // Show users who are online OR have an unviewed story.
  const activeUsers = chats.filter(c =>
    c.type !== 'group' && (c.online || hasUnviewedStory(c)),
  );

  return (
    <View style={[styles.container, { borderBottomColor: T.borderSubtle, backgroundColor: T.bg }]}>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* 1. "Your Story" / Saved Messages Bubble */}
        <TouchableOpacity 
          style={styles.avatarItem} 
          onPress={onMyStoryPress}
          activeOpacity={0.8}
        >
          <View style={styles.avatarWrap}>
            <Avatar size="lg" name={CURRENT_USER.username} />
            <View style={[styles.addBadge, { backgroundColor: T.accent, borderColor: T.bg }]}>
              <Ionicons name="add" size={14} color="#fff" />
            </View>
          </View>
          <Text style={[styles.nameText, { color: T.text2 }]} numberOfLines={1}>
            Your Story
          </Text>
        </TouchableOpacity>

        {/* 2. Active Friends Bubbles */}
        {activeUsers.map(user => {
          const showRing = hasUnviewedStory(user);
          return (
            <TouchableOpacity
              key={user.id}
              style={styles.avatarItem}
              onPress={() => onUserPress(user)}
              activeOpacity={0.8}
            >
              <View style={[
                showRing && styles.storyRing,
                showRing && { borderColor: T.accent },
              ]}>
                <Avatar
                  size="lg"
                  name={user.name}
                  uri={user.avatar}
                  showOnline={user.online && !showRing}
                />
              </View>
              <Text style={[styles.nameText, { color: T.text }]} numberOfLines={1}>
                {user.name.split('.')[0]} {/* Just show first name */}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  scrollContent: {
    paddingHorizontal: spacing.base,
    gap: spacing.lg,
  },
  avatarItem: {
    alignItems: 'center',
    width: 70,
    gap: 6,
  },
  avatarWrap: {
    position: 'relative',
  },
  addBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  storyRing: {
    padding: 3,
    borderRadius: 99,
    borderWidth: 2.5,
  },
  nameText: {
    fontFamily: fonts.medium,
    fontSize: 11,
    textAlign: 'center',
  }
});