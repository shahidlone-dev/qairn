// src/screens/story/StoryPreviewScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, Image, TouchableOpacity, ActivityIndicator, Alert,
  TextInput, KeyboardAvoidingView, Platform, Modal, TouchableWithoutFeedback, Keyboard
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useVideoPlayer, VideoView } from 'expo-video';
import * as Haptics from 'expo-haptics';

import { fonts, fontSizes, spacing, radii } from '../../types/theme';
import { RootStackParamList } from '../../types/navigation';
import StoriesApi from '../../api/stories.api';
import { useStoryStore } from '../../store/useStoryStore';

type Props = NativeStackScreenProps<RootStackParamList, 'StoryPreview'>;

function guessMimeType(uri: string, kind: 'image' | 'video' | 'text'): string {
  if (kind === 'video') {
    const lower = uri.toLowerCase();
    if (lower.endsWith('.mov')) return 'video/quicktime';
    if (lower.endsWith('.webm')) return 'video/webm';
    return 'video/mp4';
  }
  if (kind === 'image') {
    const lower = uri.toLowerCase();
    if (lower.endsWith('.png'))  return 'image/png';
    if (lower.endsWith('.webp')) return 'image/webp';
    if (lower.endsWith('.gif'))  return 'image/gif';
    return 'image/jpeg';
  }
  return 'text/plain';
}

export const StoryPreviewScreen: React.FC<Props> = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();
  const { mediaUri, mediaType } = route.params;

  const [isUploading, setIsUploading] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  
  // New State for bottom bar
  const [caption, setCaption] = useState('');
  const [audience, setAudience] = useState('My Circle');
  const [isModalVisible, setModalVisible] = useState(false);

  const player = useVideoPlayer(mediaType === 'video' ? mediaUri : null, p => {
    p.loop = true;
    p.muted = isMuted;
    p.play();
  });

  useEffect(() => {
    return () => {
      try { player?.release(); } catch {}
    };
  }, [player]);

  useEffect(() => {
    if (player) player.muted = isMuted;
  }, [isMuted, player]);

  const handleDiscard = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.goBack();
  };

  const refreshFeed = useStoryStore(s => s.refreshFeed);

  const handleUpload = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsUploading(true);

    try {
      // Pass caption and audience to your backend API here
      const payloadMeta = { caption, audience }; 

      if (mediaType === 'text') {
        await StoriesApi.createText({ text: mediaUri, ...payloadMeta });
      } else {
        const mime = guessMimeType(mediaUri, mediaType);
        await StoriesApi.upload(mediaUri, mime, payloadMeta);
      }

      refreshFeed().catch(() => {});
      setIsUploading(false);
      navigation.navigate('MainTabs', { screen: 'Campus' });
    } catch (err: any) {
      setIsUploading(false);
      Alert.alert(
        'Could not post your story',
        err?.message ?? 'Please check your connection and try again.',
      );
    }
  };

  const selectAudience = (selected: string) => {
    setAudience(selected);
    setModalVisible(false);
    Haptics.selectionAsync();
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View style={styles.container}>

        {/* ── Media layer ── */}
        {mediaType === 'video' ? (
          <VideoView player={player} style={StyleSheet.absoluteFillObject} contentFit="contain" nativeControls={false} />
        ) : mediaType === 'image' ? (
          <Image source={{ uri: mediaUri }} style={StyleSheet.absoluteFillObject} resizeMode="contain" />
        ) : (
          <View style={[StyleSheet.absoluteFillObject, styles.textCanvas]}>
            <Text style={styles.textContent}>{mediaUri}</Text>
          </View>
        )}

        {/* Scrims */}
        <View style={styles.topGradient} pointerEvents="none" />
        <View style={styles.bottomGradient} pointerEvents="none" />

        <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>

          {/* ── Top bar ── */}
          <View style={styles.topBar}>
            <TouchableOpacity onPress={handleDiscard} style={styles.iconBtn}>
              <Ionicons name="close" size={28} color="#fff" />
            </TouchableOpacity>

            <View style={styles.topRightActions}>
              {/* Common Top Icons */}
              <TouchableOpacity style={styles.actionIcon}><Ionicons name="musical-notes" size={24} color="#fff" /></TouchableOpacity>
              <TouchableOpacity style={styles.actionIcon}><Text style={styles.textIconLabel}>Aa</Text></TouchableOpacity>
              <TouchableOpacity style={styles.actionIcon}><Ionicons name="color-wand" size={24} color="#fff" /></TouchableOpacity>

              {/* Image Specific Icons */}
              {mediaType === 'image' && (
                <TouchableOpacity style={styles.actionIcon}><Ionicons name="crop" size={24} color="#fff" /></TouchableOpacity>
              )}

              {/* Video Specific Icons */}
              {mediaType === 'video' && (
                <>
                  <TouchableOpacity style={styles.actionIcon} onPress={() => setIsMuted(m => !m)}>
                    <Ionicons name={isMuted ? 'volume-mute' : 'volume-high'} size={24} color="#fff" />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.actionIcon}><Ionicons name="cut" size={24} color="#fff" /></TouchableOpacity>
                </>
              )}
            </View>
          </View>

          <View style={{ flex: 1 }} />

          {/* ── Bottom bar (Caption & Controls) ── */}
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            
            {/* Caption Input Row */}
            <View style={styles.captionContainer}>
              <TextInput
                style={styles.captionInput}
                placeholder="Add a caption..."
                placeholderTextColor="rgba(255,255,255,0.7)"
                value={caption}
                onChangeText={setCaption}
                multiline
                maxLength={150}
              />
              <TouchableOpacity style={styles.mentionBtn}>
                <Ionicons name="at" size={24} color="#fff" />
              </TouchableOpacity>
            </View>

            {/* Bottom Actions Row */}
            <View style={styles.bottomActionsRow}>
              <TouchableOpacity style={styles.audienceSelector} onPress={() => setModalVisible(true)}>
                <View style={styles.audienceIconContainer}>
                  <Ionicons name={audience === 'All' ? 'earth' : audience === 'Close Ones' ? 'star' : 'people'} size={14} color="#000" />
                </View>
                <Text style={styles.audienceText}>{audience}</Text>
                <Ionicons name="chevron-down" size={16} color="#fff" />
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.sendBtn, isUploading && { opacity: 0.8 }]}
                onPress={handleUpload}
                disabled={isUploading}
              >
                {isUploading ? (
                  <ActivityIndicator color="#000" size="small" />
                ) : (
                  <Ionicons name="send" size={20} color="#000" style={{ marginLeft: 4 }} />
                )}
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>

        </SafeAreaView>

        {/* ── Audience Modal ── */}
        <Modal visible={isModalVisible} transparent animationType="slide" onRequestClose={() => setModalVisible(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHandle} />
              <Text style={styles.modalTitle}>Who can see this?</Text>
              
              {['My Circle', 'Close Ones', 'All'].map((option) => (
                <TouchableOpacity key={option} style={styles.modalOption} onPress={() => selectAudience(option)}>
                  <Text style={[styles.modalOptionText, audience === option && styles.modalOptionActive]}>{option}</Text>
                  {audience === option && <Ionicons name="checkmark-circle" size={24} color="#007AFF" />}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </Modal>

      </View>
    </TouchableWithoutFeedback>
  );
};

const styles = StyleSheet.create({
  container:      { flex: 1, backgroundColor: '#000' },
  textCanvas:     { backgroundColor: '#FF5733', justifyContent: 'center', alignItems: 'center', padding: spacing.xl },
  textContent:    { color: '#fff', fontSize: 36, fontFamily: fonts.bold, textAlign: 'center' },
  topGradient:    { position: 'absolute', top: 0, left: 0, right: 0, height: 180, backgroundColor: 'rgba(0,0,0,0.4)' },
  bottomGradient: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 250, backgroundColor: 'rgba(0,0,0,0.6)' },
  safeArea:       { flex: 1 },
  
  // Top Bar
  topBar:         { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingHorizontal: spacing.base, paddingTop: spacing.sm },
  topRightActions:{ alignItems: 'center', gap: spacing.md },
  iconBtn:        { width: 44, height: 44, justifyContent: 'center', alignItems: 'flex-start' },
  actionIcon:     { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center' },
  textIconLabel:  { color: '#fff', fontFamily: fonts.bold, fontSize: 18 },
  
  // Bottom Bar (Caption & Actions)
  captionContainer:{ flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: spacing.base, marginBottom: spacing.md },
  captionInput:   { flex: 1, color: '#fff', fontSize: fontSizes.md, backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: radii.lg, paddingHorizontal: spacing.md, paddingVertical: 12, paddingTop: 12, minHeight: 45, maxHeight: 100 },
  mentionBtn:     { width: 45, height: 45, justifyContent: 'center', alignItems: 'center', marginLeft: spacing.sm },
  bottomActionsRow:{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.base, paddingBottom: spacing.lg },
  
  // Audience Selector
  audienceSelector:{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 12, paddingVertical: 8, borderRadius: radii.pill, gap: 6, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  audienceIconContainer: { backgroundColor: '#fff', borderRadius: 10, width: 20, height: 20, justifyContent: 'center', alignItems: 'center' },
  audienceText:   { color: '#fff', fontFamily: fonts.medium, fontSize: fontSizes.sm },
  
  // Send Button
  sendBtn:        { width: 48, height: 48, borderRadius: 24, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center' },
  
  // Modal Styles
  modalOverlay:   { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent:   { backgroundColor: '#1A1A1A', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: spacing.xl, paddingBottom: 40 },
  modalHandle:    { width: 40, height: 4, backgroundColor: '#333', borderRadius: 2, alignSelf: 'center', marginBottom: spacing.lg },
  modalTitle:     { color: '#fff', fontSize: fontSizes.lg, fontFamily: fonts.bold, marginBottom: spacing.lg, textAlign: 'center' },
  modalOption:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: '#333' },
  modalOptionText:{ color: '#fff', fontSize: fontSizes.md, fontFamily: fonts.medium },
  modalOptionActive:{ color: '#007AFF', fontFamily: fonts.bold },
});