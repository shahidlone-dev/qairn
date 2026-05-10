// src/screens/chats/ChatRoomScreen.tsx

import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Animated,
  PanResponder,
  Modal,
  Pressable,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from 'react-native';
import { getTheme, fonts, fontSizes, spacing, radii } from '../../types/theme';
import { Avatar } from '../../components/ui';
import { MOCK_MESSAGES, Message, MessageStatus } from '../../constants/mockMessages';
import { RootStackScreenProps } from '../../types/navigation';

type Props = RootStackScreenProps<'ChatRoom'>;

const ME               = 'bilal.dev';
const EMOJI_REACTIONS  = ['❤️', '😂', '😮', '😢', '👍', '🔥'];
const SWIPE_THRESHOLD  = 60;

// ─── Helpers ──────────────────────────────────────────────────────────────────
function msgTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString('en-US', {
    hour: '2-digit', minute: '2-digit', hour12: true,
  });
}

function fmtDuration(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function isSameDay(d1: string, d2: string): boolean {
  return new Date(d1).toDateString() === new Date(d2).toDateString();
}

function formatDateHeader(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) return 'Today';
  
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

// ─── Status ticks ─────────────────────────────────────────────────────────────
const StatusTick: React.FC<{
  status: MessageStatus;
  T:       ReturnType<typeof getTheme>;
}> = ({ status, T }) => {
  if (status === 'sent')      return <Ionicons name="checkmark"      size={13} color={T.text3} />;
  if (status === 'delivered') return <Ionicons name="checkmark-done" size={13} color={T.text3} />;
  return                             <Ionicons name="checkmark-done" size={13} color={T.blue}  />;
};

// ─── Attachment Sheet ─────────────────────────────────────────────────────────
const AttachmentSheet: React.FC<{
  visible: boolean;
  T: ReturnType<typeof getTheme>;
  onClose: () => void;
}> = ({ visible, T, onClose }) => {
  const insets = useSafeAreaInsets();
  const slideY = useRef(new Animated.Value(400)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const [modalVisible, setModalVisible] = useState(false);

  React.useEffect(() => {
    if (visible) {
      setModalVisible(true);
      requestAnimationFrame(() => {
        Animated.parallel([
          Animated.spring(slideY, { toValue: 0, useNativeDriver: true, damping: 22, stiffness: 240 }),
          Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
        ]).start();
      });
    } else {
      Animated.parallel([
        Animated.timing(slideY, { toValue: 400, duration: 240, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start(() => {
        setModalVisible(false);
        slideY.setValue(400);
      });
    }
  }, [visible]);

  const attachments = [
    { icon: 'image-outline',    label: 'Gallery' },
    { icon: 'camera-outline',   label: 'Camera' },
    { icon: 'document-outline', label: 'Document' },
    { icon: 'location-outline', label: 'Location' },
  ];

  return (
    <Modal visible={modalVisible} transparent animationType="none" statusBarTranslucent onRequestClose={onClose}>
      <Animated.View style={[styles.scrim, { opacity }]}>
        <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
      </Animated.View>
      <Animated.View
        style={[
          styles.sheet,
          { backgroundColor: T.bgCard, paddingBottom: Math.max(insets.bottom, spacing.xl), transform: [{ translateY: slideY }] },
        ]}
      >
        <View style={[styles.sheetHandle, { backgroundColor: T.border }]} />
        <View style={styles.attachGrid}>
          {attachments.map((a) => (
            <TouchableOpacity key={a.label} style={styles.attachItem} onPress={onClose} activeOpacity={0.7}>
              <View style={[styles.attachIconWrap, { backgroundColor: T.bgInput }]}>
                <Ionicons name={a.icon as any} size={24} color={T.text} />
              </View>
              <Text style={[{ color: T.text, fontFamily: fonts.medium, fontSize: fontSizes.xs }]}>{a.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </Animated.View>
    </Modal>
  );
};

// ─── Message Action Sheet ─────────────────────────────────────────────────────
const MessageSheet: React.FC<{
  visible:  boolean;
  message:  Message | null;
  T:        ReturnType<typeof getTheme>;
  onClose:  () => void;
  onReact:  (emoji: string) => void;
  onDelete: () => void;
  onCopy:   () => void;
  onInfo:   () => void;
}> = ({ visible, message, T, onClose, onReact, onDelete, onCopy, onInfo }) => {
  const insets   = useSafeAreaInsets();
  const isMe     = message?.senderId === ME;

  const slideY   = useRef(new Animated.Value(400)).current;
  const opacity  = useRef(new Animated.Value(0)).current;

  const [modalVisible, setModalVisible] = useState(false);

  React.useEffect(() => {
    if (visible) {
      setModalVisible(true);
      requestAnimationFrame(() => {
        Animated.parallel([
          Animated.spring(slideY, {
            toValue: 0, useNativeDriver: true, damping: 22, stiffness: 240,
          }),
          Animated.timing(opacity, {
            toValue: 1, duration: 200, useNativeDriver: true,
          }),
        ]).start();
      });
    } else {
      Animated.parallel([
        Animated.timing(slideY, {
          toValue: 400, duration: 240, useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0, duration: 200, useNativeDriver: true,
        }),
      ]).start(() => {
        setModalVisible(false);
        slideY.setValue(400);
      });
    }
  }, [visible]);

  const actions = [
    ...(isMe ? [{ icon: 'trash-outline' as const, label: 'Delete for me', onPress: onDelete, color: T.text }] : []),
    { icon: 'copy-outline' as const, label: 'Copy', onPress: onCopy, color: T.text },
    { icon: 'information-circle-outline' as const, label: 'Info', onPress: onInfo, color: T.text },
  ];

  return (
    <Modal visible={modalVisible} transparent animationType="none" statusBarTranslucent onRequestClose={onClose}>
      <Animated.View style={[styles.scrim, { opacity }]}>
        <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
      </Animated.View>

      <Animated.View
        style={[
          styles.sheet,
          { backgroundColor: T.bgCard, paddingBottom: Math.max(insets.bottom, spacing.sm), transform: [{ translateY: slideY }] },
        ]}
      >
        <View style={[styles.sheetHandle, { backgroundColor: T.border }]} />

        <View style={[styles.emojiRow, { borderBottomColor: T.borderSubtle }]}>
          {EMOJI_REACTIONS.map(e => (
            <TouchableOpacity key={e} style={styles.emojiBtnAction} onPress={() => { onReact(e); onClose(); }} activeOpacity={0.75}>
              <Text style={styles.emojiText}>{e}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {actions.map((a, i) => (
          <TouchableOpacity
            key={a.label}
            style={[styles.actionRow, { borderBottomColor: T.borderSubtle }, i === actions.length - 1 && { borderBottomWidth: 0 }]}
            onPress={() => { a.onPress(); onClose(); }}
            activeOpacity={0.75}
          >
            <View style={[styles.actionIcon, { backgroundColor: T.bgInput }]}>
              <Ionicons name={a.icon} size={20} color={a.color} />
            </View>
            <Text style={[{ color: a.color, fontFamily: fonts.medium, fontSize: fontSizes.md }]}>{a.label}</Text>
          </TouchableOpacity>
        ))}
      </Animated.View>
    </Modal>
  );
};

// ─── Message bubble ───────────────────────────────────────────────────────────
const MessageBubble: React.FC<{
  message:       Message;
  showDate:      boolean;
  isConsecutive: boolean;
  T:             ReturnType<typeof getTheme>;
  onHold:        (msg: Message) => void;
  onSwipe:       (msg: Message) => void;
  onDoubleTap:   (msg: Message) => void;
}> = ({ message, showDate, isConsecutive, T, onHold, onSwipe, onDoubleTap }) => {
  const isMe      = message.senderId === ME;
  const bubbleBg  = isMe ? T.accentMuted : T.bgCard;
  const textColor = isMe ? T.text        : T.text2;

  const swipeX         = useRef(new Animated.Value(0)).current;
  const replyTriggered = useRef(false);

  const lastTap    = useRef(0);
  const heartScale = useRef(new Animated.Value(0)).current;
  const heartOpacity = useRef(new Animated.Value(0)).current;

  const handleTap = () => {
    const now = Date.now();
    if (now - lastTap.current < 300) {
      onDoubleTap(message);
      heartScale.setValue(0);
      heartOpacity.setValue(1);
      Animated.parallel([
        Animated.spring(heartScale, { toValue: 1, useNativeDriver: true, damping: 10, stiffness: 200 }),
        Animated.sequence([
          Animated.delay(400),
          Animated.timing(heartOpacity, { toValue: 0, duration: 300, useNativeDriver: true }),
        ]),
      ]).start();
    }
    lastTap.current = now;
  };

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 8 && g.dx > 0 && Math.abs(g.dx) > Math.abs(g.dy),
      onPanResponderMove: (_, g) => {
        if (g.dx > 0 && g.dx < SWIPE_THRESHOLD + 20) {
          swipeX.setValue(g.dx);
          if (g.dx >= SWIPE_THRESHOLD && !replyTriggered.current) {
            replyTriggered.current = true;
            onSwipe(message);
          }
        }
      },
      onPanResponderRelease: () => {
        replyTriggered.current = false;
        Animated.spring(swipeX, { toValue: 0, useNativeDriver: true, damping: 20, stiffness: 200 }).start();
      },
    })
  ).current;

  const replyOpacity = swipeX.interpolate({
    inputRange: [0, SWIPE_THRESHOLD], outputRange: [0, 1], extrapolate: 'clamp',
  });

  return (
    <View>
      {/* 
        Because it's an inverted list, the View renders normally inside.
        So Date Header sits nicely above the message bubble visually! 
      */}
      {showDate && (
        <View style={styles.dateHeaderWrap}>
          <View style={[styles.dateHeader, { backgroundColor: T.bgInput }]}>
            <Text style={[{ color: T.text3, fontFamily: fonts.medium, fontSize: fontSizes.xs }]}>
              {formatDateHeader(message.timestamp)}
            </Text>
          </View>
        </View>
      )}

      <View style={[
        styles.bubbleWrap, 
        isMe ? styles.wrapRight : styles.wrapLeft,
        isConsecutive && { paddingTop: 2 } 
      ]}>
        
        <Animated.View style={[styles.swipeHint, { opacity: replyOpacity }]}>
          <View style={[styles.swipeCircle, { backgroundColor: T.bgInput }]}>
            <Ionicons name="return-down-forward-outline" size={15} color={T.text3} />
          </View>
        </Animated.View>

        {!isMe && (
          isConsecutive ? (
            <View style={{ width: 28 }} />
          ) : (
            <Avatar size="xs" name={message.username} style={{ marginTop: 2 }} />
          )
        )}

        <Animated.View
          style={[styles.bubbleCol, isMe && { alignItems: 'flex-end' }, { transform: [{ translateX: swipeX }] }]}
          {...panResponder.panHandlers}
        >
          <Pressable
            onPress={handleTap}
            onLongPress={() => onHold(message)}
            delayLongPress={280}
            style={[
              styles.bubble,
              { backgroundColor: bubbleBg },
              isMe ? styles.bubbleMe : styles.bubbleThem,
              isConsecutive && isMe && { borderTopRightRadius: radii.xs },
              isConsecutive && !isMe && { borderTopLeftRadius: radii.xs }
            ]}
          >
            {message.replyTo && (
              <View style={[
                styles.replyQuoteInside,
                { backgroundColor: isMe ? 'rgba(0,0,0,0.06)' : T.bgInput, borderLeftColor: isMe ? T.accent : T.accent },
              ]}>
                <Text style={[{ color: isMe ? T.accent : T.accent, fontFamily: fonts.semibold, fontSize: fontSizes.xs }]}>
                  {message.replyTo.username === ME ? 'You' : message.replyTo.username}
                </Text>
                <Text style={[{ color: isMe ? T.text : T.text2, fontFamily: fonts.regular, fontSize: fontSizes.xs }]} numberOfLines={2}>
                  {message.replyTo.text}
                </Text>
              </View>
            )}

            {message.type === 'text' && (
              <Text style={[{ color: textColor, fontFamily: fonts.regular, fontSize: fontSizes.md, lineHeight: 22 }]}>
                {message.text}
              </Text>
            )}

            {message.type === 'file' && (
              <View style={[
                styles.fileRow, 
                { backgroundColor: isMe ? 'rgba(0,0,0,0.06)' : T.bgInput }
              ]}>
                <View style={[styles.fileIcon, { backgroundColor: isMe ? 'rgba(255,255,255,0.4)' : T.accentMuted }]}>
                  <Ionicons name="document-attach" size={20} color={isMe ? T.accent : T.accent} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[{ color: textColor, fontFamily: fonts.semibold, fontSize: fontSizes.sm }]} numberOfLines={1}>
                    {message.fileName}
                  </Text>
                  <Text style={[{ color: T.text3, fontFamily: fonts.regular, fontSize: fontSizes.xs }]}>
                    {message.fileSize}
                  </Text>
                </View>
                <Ionicons name="download-outline" size={20} color={isMe ? T.accent : T.accent} />
              </View>
            )}

            {message.type === 'voice' && (
              <View style={styles.voiceRow}>
                <TouchableOpacity style={[styles.voicePlay, { backgroundColor: T.bgInput }]}>
                  <Ionicons name="play" size={16} color={T.accent} />
                </TouchableOpacity>
                <View style={styles.waveform}>
                  {Array.from({ length: 20 }).map((_, i) => (
                    <View key={i} style={[styles.waveBar, {
                      backgroundColor: T.text3,
                      height: 4 + Math.abs(Math.sin(i * 0.9)) * 10,
                    }]} />
                  ))}
                </View>
                <Text style={[{ color: T.text3, fontFamily: fonts.regular, fontSize: fontSizes.xxs }]}>
                  {fmtDuration(message.duration ?? 0)}
                </Text>
              </View>
            )}

            <View style={[styles.bubbleMeta, { justifyContent: isMe ? 'flex-end' : 'flex-start' }]}>
              <Text style={[{ color: T.text3, fontFamily: fonts.medium, fontSize: fontSizes.xxs }]}>
                {msgTime(message.timestamp)}
              </Text>
              {isMe && <StatusTick status={message.status} T={T} />}
            </View>
          </Pressable>

          <Animated.View
            pointerEvents="none"
            style={[
              styles.floatingHeart,
              isMe ? { right: 8 } : { left: 8 },
              { opacity: heartOpacity, transform: [{ scale: heartScale }] },
            ]}
          >
            <Text style={{ fontSize: 32 }}>❤️</Text>
          </Animated.View>

          {message.reactions.length > 0 && (
            <View style={[styles.reactRow, isMe && { justifyContent: 'flex-end' }]}>
              <View style={[styles.reactBubble, { backgroundColor: T.bgCard, borderColor: T.border }]}>
                {message.reactions.map((r, i) => (
                  <Text key={i} style={{ fontSize: 12 }}>{r.emoji}</Text>
                ))}
              </View>
            </View>
          )}
        </Animated.View>
      </View>
    </View>
  );
};

// ─── Screen ───────────────────────────────────────────────────────────────────
export const ChatRoomScreen: React.FC<Props> = ({ route, navigation }) => {
  const T = getTheme(useColorScheme());
  const insets = useSafeAreaInsets();
  const { name } = route.params;

  // 1. REVERSE INITIAL DATA: Index 0 is now the newest message!
  const [messages,   setMessages]   = useState<Message[]>([...MOCK_MESSAGES].reverse());
  const [inputText,  setInputText]  = useState('');
  const [replyTo,    setReplyTo]    = useState<Message | null>(null);
  
  const [sheetMsg,        setSheetMsg]        = useState<Message | null>(null);
  const [sheetOpen,       setSheetOpen]       = useState(false);
  const [attachSheetOpen, setAttachSheetOpen] = useState(false);
  const [headerMenuOpen,  setHeaderMenuOpen]  = useState(false);

  const inputRef = useRef<TextInput>(null);
  const listRef  = useRef<FlatList>(null);

  const handleDoubleTap = useCallback((msg: Message) => {
    setMessages(prev => prev.map(m => {
      if (m.id !== msg.id) return m;
      const idx = m.reactions.findIndex(r => r.username === ME);
      const updated = [...m.reactions];
      if (idx >= 0) return m; 
      updated.push({ emoji: '❤️', username: ME });
      return { ...m, reactions: updated };
    }));
  }, []);

  const handleHold = useCallback((msg: Message) => {
    setSheetMsg(msg);
    setSheetOpen(true);
  }, []);

  const handleSwipe = useCallback((msg: Message) => {
    setReplyTo(msg);
    inputRef.current?.focus();
  }, []);

  const handleReact = useCallback((emoji: string) => {
    if (!sheetMsg) return;
    setMessages(prev => prev.map(m => {
      if (m.id !== sheetMsg.id) return m;
      const idx = m.reactions.findIndex(r => r.username === ME);
      const updated = [...m.reactions];
      if (idx >= 0) updated[idx] = { emoji, username: ME };
      else updated.push({ emoji, username: ME });
      return { ...m, reactions: updated };
    }));
  }, [sheetMsg]);

  const handleDelete = useCallback(() => {
    if (!sheetMsg) return;
    setMessages(prev => prev.filter(m => m.id !== sheetMsg.id));
  }, [sheetMsg]);

  const handleSend = () => {
    if (!inputText.trim()) return;
    const msg: Message = {
      id:        `m${Date.now()}`,
      senderId:  ME,
      username:  ME,
      type:      'text',
      text:      inputText.trim(),
      timestamp: new Date().toISOString(),
      status:    'sent',
      reactions: [],
      replyTo:   replyTo ? {
        id:       replyTo.id,
        username: replyTo.username,
        text:     replyTo.text ?? replyTo.fileName ?? 'Voice message',
      } : undefined,
    };
    
    // 2. PREPEND DATA: Add the new message to index 0
    setMessages(prev => [msg, ...prev]);
    setInputText('');
    setReplyTo(null);
    
    // 3. SCROLL FIX: In an inverted list, the bottom is offset: 0
    setTimeout(() => listRef.current?.scrollToOffset({ offset: 0, animated: true }), 80);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: T.bg }} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0} 
      >
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: T.border, backgroundColor: T.bg }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="arrow-back" size={22} color={T.text} />
          </TouchableOpacity>

          <View style={styles.headerCenter}>
            <TouchableOpacity
              style={styles.headerTargetTap}
              activeOpacity={0.8}
              onPress={() => navigation.navigate('Profile', { userId: name })}
            >
              <Avatar size="sm" name={name} />
              <View>
                <Text style={[{ color: T.text, fontFamily: fonts.semibold, fontSize: fontSizes.md }]}>{name}</Text>
                <Text style={[{ color: T.green, fontFamily: fonts.regular, fontSize: fontSizes.xs }]}>online</Text>
              </View>
            </TouchableOpacity>
          </View>

          <View style={styles.headerRight}>
            <TouchableOpacity onPress={() => setHeaderMenuOpen(true)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="ellipsis-vertical" size={20} color={T.text} />
            </TouchableOpacity>
          </View>
        </View>

        {/* 4. THE MAGIC FIX: Inverted FlatList */}
        <FlatList
          ref={listRef}
          data={messages}
          inverted // <-- THIS FLIPS EVERYTHING
          keyExtractor={item => item.id}
          renderItem={({ item, index }) => {
            // Because it's inverted, the message "above" it visually is actually older (index + 1)
            const olderMsg = messages[index + 1];
            
            // Show Date Header above this message if it's the oldest of the day
            const showDate = !olderMsg || !isSameDay(olderMsg.timestamp, item.timestamp);
            
            // Group bubbles tighter if the older message is from the same sender on the same day
            const isConsecutive = olderMsg && olderMsg.senderId === item.senderId && !showDate;

            return (
              <MessageBubble
                message={item}
                showDate={showDate}
                isConsecutive={!!isConsecutive}
                T={T}
                onHold={handleHold}
                onSwipe={handleSwipe}
                onDoubleTap={handleDoubleTap}
              />
            );
          }}
          contentContainerStyle={styles.messageList}
          showsVerticalScrollIndicator={false}
          // Removed onContentSizeChange because inverted lists anchor to bottom automatically!
        />

        {/* Reply Context Bar */}
        {replyTo && (
          <View style={[styles.replyBar, { backgroundColor: T.bgCard, borderTopColor: T.border, borderLeftColor: T.accent }]}>
            <View style={{ flex: 1 }}>
              <Text style={[{ color: T.accent, fontFamily: fonts.semibold, fontSize: fontSizes.xs }]}>
                {replyTo.username === ME ? 'You' : replyTo.username}
              </Text>
              <Text style={[{ color: T.text3, fontFamily: fonts.regular, fontSize: fontSizes.xs }]} numberOfLines={1}>
                {replyTo.text ?? replyTo.fileName ?? 'Voice message'}
              </Text>
            </View>
            <TouchableOpacity onPress={() => setReplyTo(null)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close" size={16} color={T.text3} />
            </TouchableOpacity>
          </View>
        )}

        {/* Input Bar */}
        <View style={[
          styles.inputBar, 
          { 
            borderTopColor: T.border, 
            backgroundColor: T.bg,
            paddingBottom: Math.max(insets.bottom, spacing.sm) 
          }
        ]}>
          <TouchableOpacity 
            style={styles.inputAction} 
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            onPress={() => setAttachSheetOpen(true)}
          >
            <Ionicons name="add" size={28} color={T.text3} />
          </TouchableOpacity>

          <View style={[styles.inputWrap, { backgroundColor: T.bgInput }]}>
            <TextInput
              ref={inputRef}
              value={inputText}
              onChangeText={setInputText}
              placeholder="Message..."
              placeholderTextColor={T.textMuted}
              style={[styles.input, { color: T.text, fontFamily: fonts.regular }]}
              multiline
              textAlignVertical="center"
            />
          </View>

          <TouchableOpacity
            style={[styles.sendBtn, { backgroundColor: T.accent }]}
            onPress={inputText.trim() ? handleSend : undefined}
            activeOpacity={0.85}
          >
            <Ionicons name={inputText.trim() ? 'send' : 'mic'} size={inputText.trim() ? 16 : 18} color="#fff" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      <MessageSheet
        visible={sheetOpen}
        message={sheetMsg}
        T={T}
        onClose={() => setSheetOpen(false)}
        onReact={handleReact}
        onDelete={handleDelete}
        onCopy={() => {}}
        onInfo={() => {}}
      />

      <AttachmentSheet 
        visible={attachSheetOpen}
        T={T}
        onClose={() => setAttachSheetOpen(false)}
      />

      {/* Header Dropdown Menu */}
      <Modal visible={headerMenuOpen} transparent animationType="fade" onRequestClose={() => setHeaderMenuOpen(false)}>
        <Pressable style={styles.dropScrim} onPress={() => setHeaderMenuOpen(false)}>
          <View style={[styles.dropMenu, { backgroundColor: T.bgCard, borderColor: T.border, top: Platform.OS === 'ios' ? 95 : 55 }]}>
            {[
              { icon: 'search-outline',            label: 'Search' },
              { icon: 'notifications-off-outline', label: 'Mute Notifications' },
              { icon: 'ban-outline',               label: 'Block User' },
            ].map((item, i, arr) => (
              <TouchableOpacity 
                key={item.label} 
                style={[styles.dropItem, i < arr.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: T.borderSubtle }]}
                onPress={() => setHeaderMenuOpen(false)}
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

    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection:     'row',
    alignItems:        'center',
    paddingHorizontal: spacing.base,
    paddingVertical:   spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap:               spacing.sm,
  },
  headerCenter: {
    flex:          1,
    justifyContent: 'center',
  },
  headerTargetTap: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           spacing.sm,
    alignSelf:     'flex-start',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.base,
  },
  
  messageList: { paddingVertical: spacing.sm, paddingBottom: spacing.xl },
  
  dateHeaderWrap: {
    alignItems: 'center',
    marginVertical: spacing.sm,
  },
  dateHeader: {
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: radii.pill,
  },

  bubbleWrap: {
    flexDirection: 'row',
    alignItems:    'flex-end',
    gap:           spacing.xs,
    paddingVertical:   3,
    paddingHorizontal: spacing.sm,
  },
  wrapLeft:  { justifyContent: 'flex-start' },
  wrapRight: { justifyContent: 'flex-end'   },
  bubbleCol: { maxWidth: '78%' },
  swipeHint: {
    position:       'absolute',
    left:           spacing.xs,
    bottom:         spacing.sm,
    zIndex:         10,
  },
  swipeCircle: {
    width:          28,
    height:         28,
    borderRadius:   radii.pill,
    alignItems:     'center',
    justifyContent: 'center',
  },
  bubble: {
    borderRadius:      radii.lg, 
    paddingHorizontal: 12,       
    paddingVertical:   8,        
    gap:               2,
  },
  bubbleMe:   { borderBottomRightRadius: radii.xs },
  bubbleThem: { borderBottomLeftRadius:  radii.xs },
  bubbleMeta: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           3,
    marginTop:     1,
  },
  replyQuoteInside: {
    borderLeftWidth:   3,
    paddingHorizontal: spacing.sm,
    paddingVertical:   spacing.xs,
    borderRadius:      radii.sm,
    marginBottom:      spacing.sm, 
    marginTop:         spacing.xs,
  },
  fileRow: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           spacing.sm,
    padding:       spacing.sm,
    borderRadius:  radii.md,
    minWidth:      180,
    maxWidth:      240,
  },
  fileIcon: {
    width:          36,
    height:         36,
    borderRadius:   radii.sm,
    alignItems:     'center',
    justifyContent: 'center',
  },
  voiceRow: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           spacing.sm,
    minWidth:      200,
  },
  voicePlay: {
    width:          34,
    height:         34,
    borderRadius:   radii.pill,
    alignItems:     'center',
    justifyContent: 'center',
  },
  waveform: {
    flex:          1,
    flexDirection: 'row',
    alignItems:    'center',
    gap:           2,
    height:        28,
  },
  waveBar: { width: 2.5, borderRadius: 99 },
  floatingHeart: {
    position:       'absolute',
    bottom:         8,
    zIndex:         20,
  },
  reactRow:    { flexDirection: 'row', marginTop: 2 },
  reactBubble: {
    flexDirection:     'row',
    gap:               2,
    paddingHorizontal: spacing.sm,
    paddingVertical:   3,
    borderRadius:      radii.pill,
    borderWidth:       StyleSheet.hairlineWidth,
  },
  replyBar: {
    flexDirection:     'row',
    alignItems:        'center',
    paddingHorizontal: spacing.base,
    paddingVertical:   spacing.sm,
    borderTopWidth:    StyleSheet.hairlineWidth,
    borderLeftWidth:   3,
    gap:               spacing.sm,
  },

  inputBar: {
    flexDirection:     'row',
    alignItems:        'flex-end',
    paddingHorizontal: spacing.sm,
    paddingTop:        spacing.sm,
    borderTopWidth:    StyleSheet.hairlineWidth,
    gap:               spacing.sm,
  },
  inputAction: { 
    paddingBottom: Platform.OS === 'ios' ? 4 : 6,
  },
  inputWrap: {
    flex:               1,
    flexDirection:      'row',
    alignItems:         'flex-end',
    paddingHorizontal:  spacing.md,
    borderRadius:       20,
    minHeight:          40,
  },
  input: {
    flex:               1,
    fontSize:           fontSizes.md,
    minHeight:          40,
    maxHeight:          120,
    paddingTop:         Platform.OS === 'ios' ? 10 : 8,
    paddingBottom:      Platform.OS === 'ios' ? 10 : 8,
  },
  sendBtn: {
    width:          38,
    height:         38,
    borderRadius:   radii.pill,
    alignItems:     'center',
    justifyContent: 'center',
    shadowColor:    '#D85A30',
    shadowOffset:   { width: 0, height: 2 },
    shadowOpacity:  0.3,
    shadowRadius:   4,
    elevation:      4,
    marginBottom:   Platform.OS === 'ios' ? 1 : 2,
  },

  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheet: {
    position:             'absolute',
    bottom:               0,
    left:                 0,
    right:                0,
    borderTopLeftRadius:  radii.xl,
    borderTopRightRadius: radii.xl,
    paddingTop:           spacing.sm,
    shadowColor:          '#000',
    shadowOffset:         { width: 0, height: -3 },
    shadowOpacity:        0.1,
    shadowRadius:         12,
    elevation:            16,
  },
  sheetHandle: {
    width:        40,
    height:       4,
    borderRadius: 99,
    alignSelf:    'center',
    marginBottom: spacing.md,
  },
  emojiRow: {
    flexDirection:     'row',
    justifyContent:    'space-around',
    paddingVertical:   spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  emojiBtnAction: { paddingBottom: spacing.sm },
  emojiText: { fontSize: 28 },
  actionRow: {
    flexDirection:     'row',
    alignItems:        'center',
    gap:               spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical:   spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  actionIcon: {
    width:          38,
    height:         38,
    borderRadius:   radii.md,
    alignItems:     'center',
    justifyContent: 'center',
  },

  attachGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    gap: spacing.lg,
  },
  attachItem: {
    alignItems: 'center',
    gap: spacing.sm,
    width: 60,
  },
  attachIconWrap: {
    width: 52,
    height: 52,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },

  dropScrim: { flex: 1, backgroundColor: 'rgba(0,0,0,0.05)' },
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
});