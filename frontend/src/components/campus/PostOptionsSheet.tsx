// src/components/campus/PostOptionsSheet.tsx

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Pressable,
  Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from 'react-native';
import { getTheme, fonts, fontSizes, spacing, radii } from '../../types/theme';
import { usePostActions } from '../../hooks/usePostActions';

type SheetOption = {
  icon:     keyof typeof Ionicons.glyphMap;
  label:    string;
  color?:   string;
  onPress?: () => void;
};

interface Props {
  visible:   boolean;
  onClose:   () => void;
  postId:    string;           // ✅ needed to call deletePost
  isOwner:   boolean;          // ✅ replaces `inCircle` — caller knows this
  inCircle:  boolean;
  username:  string;
}

export const PostOptionsSheet: React.FC<Props> = ({
  visible,
  onClose,
  postId,
  isOwner,
  inCircle,
  username,
}) => {
  const T      = getTheme(useColorScheme());
  const insets = useSafeAreaInsets();
  const { deletePost } = usePostActions();

  const slideY  = useRef(new Animated.Value(400)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(slideY, {
          toValue: 0, useNativeDriver: true, damping: 26, stiffness: 260,
        }),
        Animated.timing(opacity, {
          toValue: 1, duration: 200, useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideY, {
          toValue: 400, duration: 220, useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0, duration: 180, useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  // ✅ FIX: Two distinct option sets — owner sees Edit/Delete, strangers see report/block
  const ownerOptions: SheetOption[] = [
    {
      icon:    'trash-outline',
      label:   'Delete post',
      color:   T.error,
      onPress: () => {
        onClose();
        // Small delay so sheet closes before Alert appears
        setTimeout(() => deletePost(postId), 300);
      },
    },
  ];

  const strangerOptions: SheetOption[] = [
    { icon: 'eye-off-outline',    label: 'Not interested',              onPress: onClose },
    ...(!inCircle
      ? [{
          icon:    'person-add-outline' as keyof typeof Ionicons.glyphMap,
          label:   `Add @${username} to circle`,
          color:   T.accent,
          onPress: onClose, // TODO: wire add-to-circle API
        }]
      : []),
    { icon: 'volume-mute-outline', label: `Mute @${username}`,          onPress: onClose },
    { icon: 'flag-outline',        label: 'Report post', color: T.warning, onPress: onClose },
    { icon: 'ban-outline',         label: `Block @${username}`, color: T.error, onPress: onClose },
  ];

  const options = isOwner ? ownerOptions : strangerOptions;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      {/* Scrim */}
      <Animated.View style={[styles.scrim, { opacity }]}>
        <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
      </Animated.View>

      {/* Sheet */}
      <Animated.View
        style={[
          styles.sheet,
          {
            backgroundColor: T.bgCard,
            paddingBottom:   insets.bottom + spacing.sm,
            transform:       [{ translateY: slideY }],
          },
        ]}
      >
        {/* Handle bar */}
        <View style={[styles.handle, { backgroundColor: T.border }]} />

        {/* Options */}
        {options.map((opt, i) => (
          <TouchableOpacity
            key={i}
            style={[
              styles.option,
              { borderBottomColor: T.borderSubtle },
              i === options.length - 1 && { borderBottomWidth: 0 },
            ]}
            activeOpacity={0.7}
            onPress={opt.onPress ?? onClose}
          >
            <View style={[
              styles.optionIcon,
              { backgroundColor: opt.color ? opt.color + '15' : T.bgInput },
            ]}>
              <Ionicons name={opt.icon} size={20} color={opt.color ?? T.text2} />
            </View>
            <Text style={[
              styles.optionLabel,
              { color: opt.color ?? T.text, fontFamily: fonts.medium, fontSize: fontSizes.md },
            ]}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        ))}

        {/* Cancel */}
        <TouchableOpacity
          style={[styles.cancel, { backgroundColor: T.bgInput, marginTop: spacing.sm }]}
          onPress={onClose}
          activeOpacity={0.8}
        >
          <Text style={[{ color: T.text, fontFamily: fonts.semibold, fontSize: fontSizes.md }]}>
            Cancel
          </Text>
        </TouchableOpacity>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
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
    marginBottom: spacing.md,
  },
  option: {
    flexDirection:     'row',
    alignItems:        'center',
    gap:               spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical:   spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  optionIcon: {
    width:          40,
    height:         40,
    borderRadius:   radii.md,
    alignItems:     'center',
    justifyContent: 'center',
  },
  optionLabel: {},
  cancel: {
    marginHorizontal: spacing.lg,
    paddingVertical:  spacing.md,
    borderRadius:     radii.lg,
    alignItems:       'center',
  },
});