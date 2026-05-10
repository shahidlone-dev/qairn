// src/screens/shared/EditProfileScreen.tsx

import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  TextInput, ActivityIndicator, Alert,
  Modal, Pressable, Dimensions, StatusBar,
  Image as RNImage,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

import { getTheme, fonts, fontSizes, spacing, radii } from '../../types/theme';
import { Avatar } from '../../components/ui';
import { useAuth } from '../../hooks/useAuth';
import UsersApi from '../../api/users.api';
import { RootStackScreenProps } from '../../types/navigation';

type Props = RootStackScreenProps<'EditProfile'>;

// ─── Field Row Component ──────────────────────────────────────────────────────
const FieldRow: React.FC<{
  label: string;
  value: string;
  onPress: () => void;
  T: ReturnType<typeof getTheme>;
}> = ({ label, value, onPress, T }) => (
  <TouchableOpacity style={[styles.fieldRow, { borderBottomColor: T.border }]} onPress={onPress}>
    <Text style={[styles.fieldRowLabel, { color: T.text3 }]}>{label}</Text>
    <View style={styles.fieldRowRight}>
      <Text style={[styles.fieldRowValue, { color: T.text }]} numberOfLines={1}>
        {value || `Add ${label.toLowerCase()}`}
      </Text>
      <Ionicons name="chevron-forward" size={18} color={T.text3} />
    </View>
  </TouchableOpacity>
);

// ─── Screen ───────────────────────────────────────────────────────────────────
export const EditProfileScreen: React.FC<Props> = ({ navigation }) => {
  const T = getTheme(useColorScheme());
  const { user, setUser } = useAuth();

  // ── Avatar UX state ───────────────────────────────────────────────────────
  // The avatar surface supports three discrete modes:
  //   - `viewer` :  full-screen photo of the existing avatar (tap to dismiss).
  //   - `sheet`  :  bottom action sheet with View / Take Picture / Choose
  //                 from Library / Remove / Cancel.
  //   - upload   :  inline progress overlay while the file is in flight.
  // The `viewer` mode is suppressed entirely when no avatar is set — we open
  // the `sheet` instead so a single tap on the placeholder lets the user
  // upload without an extra step.
  const [avatarMenuOpen,   setAvatarMenuOpen]   = useState(false);
  const [avatarViewerOpen, setAvatarViewerOpen] = useState(false);
  const [uploadingAvatar,  setUploadingAvatar]  = useState(false);

  // Field Edit Modal State
  const [editConfig, setEditConfig] = useState<{
    key: 'full_name' | 'username' | 'bio';
    title: string;
    value: string;
    maxLength: number;
    multiline: boolean;
  } | null>(null);
  
  const [editValue, setEditValue] = useState('');
  const [savingField, setSavingField] = useState(false);

  // ─── Username Logic ───────────────────────────────────────────────────────
  const checkCanChangeUsername = () => {
    // Assuming backend tracks 'last_username_change' or 'created_at'
    // If you don't have this in your DB yet, you'll need to add it.
    const lastChange = user?.last_username_change || user?.created_at;
    if (!lastChange) return true;

    const lastDate = new Date(lastChange);
    const now = new Date();
    const diffDays = (now.getTime() - lastDate.getTime()) / (1000 * 3600 * 24);
    
    return diffDays >= 30;
  };

  const openEditor = (key: 'full_name' | 'username' | 'bio', title: string, maxLength: number, multiline = false) => {
    if (key === 'username' && !checkCanChangeUsername()) {
      Alert.alert('Restricted', 'You can only change your username once every 30 days.');
      return;
    }

    let initialValue = '';
    if (key === 'full_name') initialValue = user?.full_name ?? '';
    if (key === 'username') initialValue = user?.username ?? '';
    if (key === 'bio') initialValue = user?.bio ?? '';

    setEditValue(initialValue);
    setEditConfig({ key, title, value: initialValue, maxLength, multiline });
  };

  const handleSaveField = async () => {
    if (!editConfig || editValue.trim() === editConfig.value) {
      setEditConfig(null);
      return;
    }

    setSavingField(true);
    try {
      const res = await UsersApi.updateMe({
        [editConfig.key]: editValue.trim() || undefined,
      }) as any;

      const updated = res.data ?? res;
      setUser?.(updated);
      setEditConfig(null);
    } catch (err: any) {
      Alert.alert('Error', err.message ?? `Failed to update ${editConfig.title}`);
    } finally {
      setSavingField(false);
    }
  };

  // ─── Avatar pipeline ──────────────────────────────────────────────────────
  //
  // High-level flow:
  //   pickFromLibrary / pickFromCamera → ImagePicker → uploadAvatar(uri)
  //   uploadAvatar → UsersApi.uploadAndSetAvatar (multipart + persist)
  //                → setUser(refreshedUser)
  //
  // The previous version did the multipart leg through the JSON `api` client,
  // which silently truncated the body to "{}" and then read the wrong field
  // off the response — every "successful" upload actually wiped the avatar.
  // Now the upload + persist live in users.api.ts using FileSystem.uploadAsync,
  // and we only worry about the picker UX here.

  // Mime type best-effort inference. Backend re-validates so a wrong guess
  // costs at most one round-trip; never corrupts data.
  const guessMime = (uri: string): string => {
    const u = uri.toLowerCase();
    if (u.endsWith('.png'))  return 'image/png';
    if (u.endsWith('.webp')) return 'image/webp';
    if (u.endsWith('.gif'))  return 'image/gif';
    return 'image/jpeg';
  };

  const uploadAvatar = async (uri: string) => {
    setUploadingAvatar(true);
    try {
      const refreshedUser = await UsersApi.uploadAndSetAvatar(uri, guessMime(uri));
      setUser?.(refreshedUser);
    } catch (err: any) {
      Alert.alert('Upload Failed', err?.message ?? 'Could not upload avatar.');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const pickFromLibrary = async () => {
    setAvatarMenuOpen(false);

    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert(
        'Permission needed',
        'We need photo library access to upload a profile photo.',
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes:    ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect:        [1, 1],
      quality:       0.85,
    });

    if (!result.canceled && result.assets?.[0]) {
      uploadAvatar(result.assets[0].uri);
    }
  };

  const pickFromCamera = async () => {
    setAvatarMenuOpen(false);

    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert(
        'Permission needed',
        'We need camera access to take a profile photo.',
      );
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes:    ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect:        [1, 1],
      quality:       0.85,
      cameraType:    ImagePicker.CameraType.front,
    });

    if (!result.canceled && result.assets?.[0]) {
      uploadAvatar(result.assets[0].uri);
    }
  };

  const handleRemoveAvatar = async () => {
    setAvatarMenuOpen(false);

    Alert.alert(
      'Remove profile photo?',
      'You can upload a new one any time.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            setUploadingAvatar(true);
            try {
              const res = await UsersApi.updateAvatar(null);
              setUser?.(res.data);
            } catch (err: any) {
              Alert.alert('Error', err?.message ?? 'Could not remove avatar.');
            } finally {
              setUploadingAvatar(false);
            }
          },
        },
      ],
    );
  };

  // ─── Tap / long-press dispatch on the avatar surface ──────────────────────
  // - Single tap with no avatar → open the sheet (jump straight into upload).
  // - Single tap with an avatar → full-screen viewer.
  // - Long-press always → action sheet.
  const handleAvatarPress = () => {
    if (uploadingAvatar) return;
    if (user?.avatar_url) {
      setAvatarViewerOpen(true);
    } else {
      setAvatarMenuOpen(true);
    }
  };

  const handleAvatarLongPress = () => {
    if (uploadingAvatar) return;
    setAvatarMenuOpen(true);
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: T.bg }]} edges={['top']}>
      
      {/* ── Main Screen Header (No Save Button) ────────────────────────── */}
      <View style={[styles.header, { borderBottomColor: T.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="arrow-back" size={24} color={T.text} />
        </TouchableOpacity>
        <Text style={[{ color: T.text, fontFamily: fonts.semibold, fontSize: fontSizes.lg }]}>
          Edit Profile
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.body}>
        {/* ── Avatar surface ────────────────────────────────────────────────
            - Tap   : view full-screen if an avatar exists, else open sheet
            - Hold  : always open the sheet
            A small camera badge sits on top so the affordance is obvious
            even when there's no photo yet. */}
        <TouchableOpacity
          style={styles.avatarWrap}
          activeOpacity={0.85}
          onPress={handleAvatarPress}
          onLongPress={handleAvatarLongPress}
          delayLongPress={280}
        >
          <Avatar size="xl" uri={user?.avatar_url} name={user?.username} />

          {/* Camera badge — clickable through the parent (pointerEvents='none')
              so we keep one source of touch handling. */}
          <View
            style={[styles.avatarBadge, { backgroundColor: T.accent, borderColor: T.bg }]}
            pointerEvents="none"
          >
            <Ionicons name="camera" size={14} color="#fff" />
          </View>

          {uploadingAvatar && (
            <View style={styles.avatarLoadingOverlay}>
              <ActivityIndicator color="#fff" size="small" />
            </View>
          )}
        </TouchableOpacity>

        <Text style={[styles.avatarHelper, { color: T.text3 }]}>
          {user?.avatar_url
            ? 'Tap to view · Hold for options'
            : 'Tap to add a profile photo'}
        </Text>

        {/* ── Fields ───────────────────────────────────────────────────── */}
        <FieldRow 
          label="Name" 
          value={user?.full_name ?? ''} 
          T={T} 
          onPress={() => openEditor('full_name', 'Name', 50)} 
        />
        <FieldRow 
          label="Username" 
          value={user?.username ?? ''} 
          T={T} 
          onPress={() => openEditor('username', 'Username', 30)} 
        />
        <FieldRow 
          label="Bio" 
          value={user?.bio ?? ''} 
          T={T} 
          onPress={() => openEditor('bio', 'Bio', 150, true)} 
        />
      </View>

      {/* ── Avatar action sheet ─────────────────────────────────────────────
          The full set of options is intentionally explicit (no nested menus):
          View, Take Picture, Choose from Library, Remove. The "View" entry
          is suppressed when there's nothing to view. The destructive
          "Remove" sits at the bottom in red so it's hard to hit by accident. */}
      <Modal
        visible={avatarMenuOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setAvatarMenuOpen(false)}
      >
        <Pressable style={styles.modalScrim} onPress={() => setAvatarMenuOpen(false)}>
          <Pressable
            style={[styles.bottomSheet, { backgroundColor: T.bgCard }]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.sheetHandle} />

            <Text style={[styles.sheetTitle, { color: T.text2 }]}>
              {user?.avatar_url ? 'Profile Photo' : 'Add Profile Photo'}
            </Text>

            {!!user?.avatar_url && (
              <TouchableOpacity
                style={styles.sheetRow}
                onPress={() => {
                  setAvatarMenuOpen(false);
                  setAvatarViewerOpen(true);
                }}
              >
                <Ionicons name="eye-outline" size={20} color={T.text} />
                <Text style={[styles.sheetRowText, { color: T.text }]}>View Photo</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity style={styles.sheetRow} onPress={pickFromCamera}>
              <Ionicons name="camera-outline" size={20} color={T.text} />
              <Text style={[styles.sheetRowText, { color: T.text }]}>Take Picture</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.sheetRow} onPress={pickFromLibrary}>
              <Ionicons name="images-outline" size={20} color={T.text} />
              <Text style={[styles.sheetRowText, { color: T.text }]}>
                Choose from Library
              </Text>
            </TouchableOpacity>

            {!!user?.avatar_url && (
              <TouchableOpacity style={styles.sheetRow} onPress={handleRemoveAvatar}>
                <Ionicons name="trash-outline" size={20} color={T.red} />
                <Text style={[styles.sheetRowText, { color: T.red }]}>
                  Remove Photo
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[styles.sheetCancel, { borderTopColor: T.border }]}
              onPress={() => setAvatarMenuOpen(false)}
            >
              <Text style={[styles.sheetCancelText, { color: T.text2 }]}>Cancel</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ── Full-screen avatar viewer ───────────────────────────────────────
          Black backdrop, RN Image zoomed to full width with contain so a
          rectangular avatar isn't cropped. Tap anywhere to dismiss; an
          explicit close X sits in the corner for users who don't expect
          tap-to-dismiss. A "Change" CTA at the bottom lets them jump from
          viewing into the action sheet without re-opening. */}
      <Modal
        visible={avatarViewerOpen && !!user?.avatar_url}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setAvatarViewerOpen(false)}
      >
        <StatusBar hidden />
        <View style={styles.viewerRoot}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setAvatarViewerOpen(false)}
          />

          {!!user?.avatar_url && (
            <RNImage
              source={{ uri: user.avatar_url }}
              style={styles.viewerImage}
              resizeMode="contain"
            />
          )}

          <TouchableOpacity
            style={styles.viewerClose}
            hitSlop={12}
            onPress={() => setAvatarViewerOpen(false)}
          >
            <Ionicons name="close" size={26} color="#fff" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.viewerChange}
            onPress={() => {
              setAvatarViewerOpen(false);
              setAvatarMenuOpen(true);
            }}
          >
            <Ionicons name="camera-outline" size={18} color="#fff" />
            <Text style={styles.viewerChangeText}>Change</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* ── Field Edit Full Screen Modal ───────────────────────────────── */}
      <Modal visible={!!editConfig} animationType="slide" onRequestClose={() => setEditConfig(null)}>
        <SafeAreaView style={[styles.safe, { backgroundColor: T.bg }]} edges={['top']}>
          
          <View style={[styles.header, { borderBottomColor: T.border }]}>
            <TouchableOpacity onPress={() => setEditConfig(null)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close" size={28} color={T.text} />
            </TouchableOpacity>

            <Text style={[{ color: T.text, fontFamily: fonts.semibold, fontSize: fontSizes.lg }]}>
              {editConfig?.title}
            </Text>

            <TouchableOpacity onPress={handleSaveField} disabled={savingField} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              {savingField ? (
                <ActivityIndicator size="small" color={T.accent} />
              ) : (
                <Ionicons name="checkmark" size={28} color={T.accent} />
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.editorBody}>
            <TextInput
              value={editValue}
              onChangeText={setEditValue}
              multiline={editConfig?.multiline}
              maxLength={editConfig?.maxLength}
              autoFocus
              style={[
                styles.editorInput,
                editConfig?.multiline && styles.editorMultiline,
                { color: T.text, borderBottomColor: T.accent }
              ]}
              selectionColor={T.accent}
              autoCapitalize={editConfig?.key === 'username' ? 'none' : 'sentences'}
              autoCorrect={editConfig?.key !== 'username'}
            />
            {editConfig?.maxLength && (
              <Text style={[styles.charCount, { color: T.text3 }]}>
                {editValue.length} / {editConfig.maxLength}
              </Text>
            )}
            {editConfig?.key === 'username' && (
              <Text style={[styles.helperText, { color: T.text3 }]}>
                You will only be able to change your username again after 30 days.
              </Text>
            )}
          </View>
        </SafeAreaView>
      </Modal>

    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1 },
  body: { flex: 1 },
  
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },

  // Avatar
  avatarWrap: {
    alignSelf: 'center',
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
    position: 'relative',
  },
  avatarLoadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: 999,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarBadge: {
    position: 'absolute',
    right: 2,
    bottom: 2,
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarHelper: {
    alignSelf: 'center',
    fontFamily: fonts.regular,
    fontSize: fontSizes.xs,
    marginBottom: spacing.lg,
  },

  // List Rows
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.base,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  fieldRowLabel: {
    fontFamily: fonts.medium,
    fontSize: fontSizes.md,
    width: 100,
  },
  fieldRowRight: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: spacing.sm,
  },
  fieldRowValue: {
    fontFamily: fonts.regular,
    fontSize: fontSizes.md,
    flex: 1,
    textAlign: 'right',
  },

  // Editor Modal
  editorBody: {
    padding: spacing.base,
    marginTop: spacing.lg,
  },
  editorInput: {
    fontFamily: fonts.regular,
    fontSize: fontSizes.lg,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
  },
  editorMultiline: {
    minHeight: 120,
    textAlignVertical: 'top',
  },
  charCount: {
    fontFamily: fonts.regular,
    fontSize: fontSizes.xs,
    textAlign: 'right',
    marginTop: spacing.sm,
  },
  helperText: {
    fontFamily: fonts.regular,
    fontSize: fontSizes.xs,
    marginTop: spacing.md,
    lineHeight: 18,
  },

  // Bottom Sheet
  modalScrim: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  bottomSheet: {
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    paddingBottom: spacing.xl,
    paddingTop: spacing.sm,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#888',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: spacing.md,
    opacity: 0.5,
  },
  sheetTitle: {
    fontFamily: fonts.semibold,
    fontSize: fontSizes.sm,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  sheetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md + 2,
    paddingHorizontal: spacing.lg,
  },
  sheetRowText: {
    fontFamily: fonts.medium,
    fontSize: fontSizes.md,
  },
  sheetCancel: {
    marginTop: spacing.sm,
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  sheetCancelText: {
    fontFamily: fonts.semibold,
    fontSize: fontSizes.md,
  },

  // Full-screen viewer
  viewerRoot: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  viewerImage: {
    width:  Dimensions.get('window').width,
    height: Dimensions.get('window').width, // 1:1 box; contain prevents crop
  },
  viewerClose: {
    position: 'absolute',
    top: 50,
    right: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewerChange: {
    position: 'absolute',
    bottom: 50,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  viewerChangeText: {
    color: '#fff',
    fontFamily: fonts.semibold,
    fontSize: fontSizes.sm,
  },
});