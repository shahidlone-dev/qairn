// frontend/src/components/campus/SaveToCollectionSheet.tsx

import React, { useEffect, useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Modal,
  ActivityIndicator, TextInput, KeyboardAvoidingView, Platform, 
  TouchableWithoutFeedback, Animated, Dimensions, ScrollView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from 'react-native';
import { getTheme, fonts, fontSizes, spacing, radii } from '../../types/theme';
import { useCollectionStore } from '../../store/useCollectionStore';
import CollectionsApi from '../../api/collections.api';
import { usePostStore } from '../../store/usePostStore';

// 👉 IMPORT THE NEW SEARCH MODAL
import { CircleSearchModal } from './CircleSearchModal'; 

interface Props {
  visible: boolean;
  onClose: () => void;
  postId: string;
  onSaveSuccess?: (isSaved: boolean) => void;
}

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export const SaveToCollectionSheet = ({ visible, onClose, postId, onSaveSuccess }: Props) => {
  const T = getTheme(useColorScheme());
  const { collections, fetchCollections, createNewCollection, isLoading } = useCollectionStore();
  const updatePost = usePostStore(s => s.updatePost);

  const [isCreating, setIsCreating] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState('');
  const [savingId, setSavingId] = useState<string | null>(null);

  // 👉 NEW STATE: Array of selected user IDs and Modal visibility
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
  const [isSearchModalVisible, setIsSearchModalVisible] = useState(false);

  // --- Premium Animation State ---
  const [renderModal, setRenderModal] = useState(false);
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setRenderModal(true);
      fetchCollections();
      setIsCreating(false);
      setNewCollectionName('');
      setSelectedFriends([]); // Reset friends array

      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.spring(slideAnim, { toValue: 0, damping: 22, stiffness: 90, useNativeDriver: true })
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 0, duration: 250, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: SCREEN_HEIGHT, duration: 250, useNativeDriver: true })
      ]).start(() => setRenderModal(false));
    }
  }, [visible]);

  const handleSaveToCollection = async (collectionId: string) => {
    if (savingId) return;
    setSavingId(collectionId);

    try {
      // Server now returns BOTH the per-collection state AND the global
      // `is_saved` flag, so the bookmark icon stays solid as long as the
      // post is in any of the user's collections.
      const res = await CollectionsApi.toggleSaveInCollection(collectionId, postId);
      updatePost(postId, { is_saved: res.is_saved });
      if (onSaveSuccess) onSaveSuccess(res.is_saved);

      setTimeout(() => {
        setSavingId(null);
        onClose();
      }, 300);
    } catch (error) {
      console.error('Failed to save post', error);
      setSavingId(null);
    }
  };

  const handleCreateCollection = async () => {
    if (!newCollectionName.trim()) return;
    setSavingId('new');
    try {
      // 👉 Pass the array of selected user IDs directly to the API
      const newCol = await createNewCollection(newCollectionName.trim(), selectedFriends);
      
      if (newCol && newCol.id) {
        await handleSaveToCollection(newCol.id);
      } else {
        fetchCollections();
        setSavingId(null);
        setIsCreating(false);
      }
    } catch (error) {
      console.error('Failed to create collection', error);
      setSavingId(null);
    }
  };

  const toggleFriendSelection = (userId: string) => {
    setSelectedFriends(prev => 
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  if (!renderModal) return null;

  return (
    <>
      <Modal visible={renderModal} transparent animationType="none" onRequestClose={onClose}>
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
          style={styles.overlay}
        >
          <TouchableWithoutFeedback onPress={onClose}>
            <Animated.View style={[styles.backdrop, { opacity: fadeAnim }]} />
          </TouchableWithoutFeedback>

          <Animated.View 
            style={[
              styles.sheet, 
              { backgroundColor: T.bgBase || '#FFFFFF', transform: [{ translateY: slideAnim }] }
            ]}
          >
            <View style={styles.dragHandleContainer}>
              <View style={[styles.dragHandle, { backgroundColor: T.border }]} />
            </View>

            <View style={[styles.header, { borderBottomColor: T.borderSubtle }]}>
              {isCreating && (
                 <TouchableOpacity onPress={() => setIsCreating(false)} style={styles.backBtn}>
                   <Ionicons name="chevron-back" size={24} color={T.text} />
                 </TouchableOpacity>
              )}
              <Text style={[styles.title, { color: T.text }]}>
                {isCreating ? 'New Collection' : 'Save to Collection'}
              </Text>
              <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                <Ionicons name="close" size={24} color={T.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.content}>
              {isLoading && (!collections || collections.length === 0) ? (
                <ActivityIndicator size="large" color={T.accent} style={{ marginVertical: 40 }} />
              ) : isCreating ? (
                // --- CREATE NEW MODE ---
                <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                  <View style={styles.createView}>
                    <Text style={[styles.label, { color: T.text2 }]}>Collection Name</Text>
                    <TextInput
                      style={[styles.input, { color: T.text, backgroundColor: T.bgInput, borderColor: T.border }]}
                      placeholder="E.g., Design Inspiration"
                      placeholderTextColor={T.text3}
                      value={newCollectionName}
                      onChangeText={setNewCollectionName}
                      autoFocus
                    />

                    {/* 👉 NEW UI: Add Friends Button */}
                    <Text style={[styles.label, { color: T.text2, marginTop: spacing.md }]}>Shared With</Text>
                    <TouchableOpacity 
                      style={[styles.addFriendsBtn, { borderColor: T.border, backgroundColor: T.bgInput }]}
                      onPress={() => setIsSearchModalVisible(true)}
                    >
                      <Ionicons name="people-outline" size={20} color={T.text} />
                      <Text style={[styles.addFriendsText, { color: T.text }]}>
                        {selectedFriends.length > 0 
                          ? `${selectedFriends.length} friend${selectedFriends.length > 1 ? 's' : ''} selected` 
                          : 'Add friends to collection'}
                      </Text>
                      <Ionicons name="chevron-forward" size={20} color={T.text3} />
                    </TouchableOpacity>

                    <TouchableOpacity 
                      style={[styles.actionBtn, { backgroundColor: T.accent, opacity: newCollectionName.trim() ? 1 : 0.5 }]}
                      disabled={!newCollectionName.trim() || savingId === 'new'}
                      onPress={handleCreateCollection}
                    >
                      {savingId === 'new' ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <Text style={styles.actionBtnText}>Create & Save</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </ScrollView>
              ) : (
                // --- LIST MODE ---
                <ScrollView style={{ maxHeight: SCREEN_HEIGHT * 0.6 }} showsVerticalScrollIndicator={false}>
                  <TouchableOpacity 
                    style={[styles.row, { borderBottomColor: T.borderSubtle }]} 
                    onPress={() => setIsCreating(true)}
                  >
                    <View style={[styles.iconBox, { backgroundColor: T.bgInput }]}>
                      <Ionicons name="add" size={24} color={T.text} />
                    </View>
                    <Text style={[styles.rowText, { color: T.text }]}>New Collection</Text>
                  </TouchableOpacity>

                  {collections?.filter(Boolean).map((col) => (
                    <TouchableOpacity 
                      key={col.id} 
                      style={[styles.row, { borderBottomColor: T.borderSubtle }]}
                      onPress={() => handleSaveToCollection(col.id)}
                      disabled={!!savingId}
                    >
                      <View style={[styles.iconBox, { backgroundColor: T.bgInput }]}>
                        <Ionicons name={col.is_default ? "bookmark" : "folder"} size={20} color={T.text2} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.rowText, { color: T.text }]}>{col.name}</Text>
                        {!col.is_default && col.collection_members && col.collection_members.length > 0 && (
                          <Text style={{ color: T.text3, fontSize: 12, marginTop: 2 }}>Shared with friends</Text>
                        )}
                      </View>
                      {savingId === col.id && <ActivityIndicator size="small" color={T.accent} />}
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}
            </View>
          </Animated.View>
        </KeyboardAvoidingView>
      </Modal>

      {/* 👉 MOUNT THE NEW SEARCH MODAL HERE */}
      <CircleSearchModal
        visible={isSearchModalVisible}
        onClose={() => setIsSearchModalVisible(false)}
        selectedUserIds={selectedFriends}
        onToggleUser={toggleFriendSelection}
      />
    </>
  );
};

const styles = StyleSheet.create({
  // ... existing styles remain unchanged ...
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: { width: '100%', borderTopLeftRadius: radii.xl, borderTopRightRadius: radii.xl, overflow: 'hidden', paddingBottom: Platform.OS === 'ios' ? 40 : spacing.xl, elevation: 10, shadowColor: '#000', shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.1, shadowRadius: 8 },
  dragHandleContainer: { alignItems: 'center', paddingTop: spacing.sm, paddingBottom: spacing.xs },
  dragHandle: { width: 40, height: 4, borderRadius: 2, opacity: 0.5 },
  header: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', padding: spacing.md, borderBottomWidth: StyleSheet.hairlineWidth },
  title: { fontFamily: fonts.bold, fontSize: fontSizes.lg },
  closeBtn: { position: 'absolute', right: spacing.md },
  backBtn: { position: 'absolute', left: spacing.md },
  content: { padding: spacing.md, minHeight: 250 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.md, borderBottomWidth: StyleSheet.hairlineWidth },
  iconBox: { width: 44, height: 44, borderRadius: radii.md, justifyContent: 'center', alignItems: 'center', marginRight: spacing.md },
  rowText: { fontFamily: fonts.semibold, fontSize: fontSizes.md },
  createView: { paddingTop: spacing.sm },
  label: { fontFamily: fonts.medium, marginBottom: 8 },
  input: { borderWidth: 1, borderRadius: radii.md, padding: spacing.md, fontFamily: fonts.regular, fontSize: fontSizes.md, marginBottom: spacing.lg },
  actionBtn: { borderRadius: radii.pill, padding: spacing.md, alignItems: 'center', justifyContent: 'center', marginTop: spacing.sm },
  actionBtnText: { color: '#fff', fontFamily: fonts.bold, fontSize: fontSizes.md },

  // 👉 NEW STYLES FOR THE FRIENDS BUTTON
  addFriendsBtn: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: radii.md, padding: spacing.md, marginBottom: spacing.lg },
  addFriendsText: { flex: 1, marginLeft: spacing.sm, fontFamily: fonts.medium, fontSize: fontSizes.md },
});