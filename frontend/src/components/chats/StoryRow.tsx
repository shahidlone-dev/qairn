// src/components/chats/StoryRow.tsx

import React, { useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Avatar } from '../ui';
import { fonts, fontSizes, spacing } from '../../types/theme';
import { Chat } from '../../constants/mockChats';
import { CURRENT_USER } from '../../constants/mockFeed';
import { useStoryStore, userHasStory } from '../../store/useStoryStore';

type ChatWithStory = Chat & { hasStory?: boolean };

interface Props {
  T: any;
  chats: ChatWithStory[];
  onStoryPress: (chat: ChatWithStory) => void;
  onAddStory: () => void;
}

export const StoryRow: React.FC<Props> = ({ T, chats, onStoryPress, onAddStory }) => {
  // Drives ring/visibility from the global story store. The rail filters out
  // viewed stories so a user disappears once their stories have been seen
  // (unless they're also currently online — which is the OG criterion).
  const viewedStories = useStoryStore(s => s.viewedStories);

  const hasUnviewedStory = (c: ChatWithStory) =>
    c.type !== 'group'
    && (c.hasStory ?? true) !== false
    && userHasStory(c.id)
    && !viewedStories.has(c.id);

  const activeUsers = useMemo(() => {
    return chats.filter(c => c.type !== 'group' && (c.online || hasUnviewedStory(c)));
  }, [chats, viewedStories]);

  const renderItem = ({ item }: { item: ChatWithStory }) => {
    // Format names like "zara.malik" to just "zara" for a cleaner UI
    const shortName = item.name.split('.')[0];
    const ringColor = T.accent;
    const showRing  = hasUnviewedStory(item);

    return (
      <TouchableOpacity
        style={styles.itemContainer}
        onPress={() => onStoryPress(item)}
        activeOpacity={0.8}
      >
        <View style={[showRing && styles.storyRing, showRing && { borderColor: ringColor }]}>
          <Avatar
            size="lg" // Larger avatar for the top row
            name={item.name}
            uri={item.avatar}
            showOnline={item.online && !showRing}
          />
        </View>
        <Text style={[styles.nameText, { color: T.text }]} numberOfLines={1}>
          {shortName}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: T.bg, borderBottomColor: T.borderSubtle }]}>
      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        data={activeUsers}
        keyExtractor={item => item.id}
        ListHeaderComponent={
          <TouchableOpacity style={styles.itemContainer} onPress={onAddStory} activeOpacity={0.8}>
            <View style={styles.myStoryWrap}>
              <Avatar size="lg" name={CURRENT_USER.username} />
              <View style={[styles.addBadge, { backgroundColor: T.accent, borderColor: T.bg }]}>
                <Ionicons name="add" size={14} color="#fff" />
              </View>
            </View>
            <Text style={[styles.nameText, { color: T.text3 }]} numberOfLines={1}>
              Your Story
            </Text>
          </TouchableOpacity>
        }
        renderItem={renderItem}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingVertical: spacing.md,
  },
  scrollContent: {
    paddingHorizontal: spacing.base,
    gap: spacing.md, // Space between avatars
  },
  itemContainer: {
    alignItems: 'center',
    width: 68, // Fixed width to prevent text from pushing avatars around
    gap: spacing.xs,
  },
  myStoryWrap: {
    position: 'relative',
    padding: 2, // Matches the story ring padding to keep sizes perfectly aligned
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
    padding: 2,
    borderRadius: 99,
    borderWidth: 2,
  },
  nameText: {
    fontSize: fontSizes.xs,
    fontFamily: fonts.medium,
    textAlign: 'center',
    width: '100%',
    textTransform: 'capitalize',
  }
});