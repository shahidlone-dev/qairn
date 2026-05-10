// frontend/src/components/campus/CircleSearchModal.tsx

import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, Modal, TouchableOpacity, 
  TextInput, FlatList, ActivityIndicator, KeyboardAvoidingView, Platform, Image
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from 'react-native';
import { getTheme, fonts, fontSizes, spacing, radii } from '../../types/theme';
import api from '../../api/client';

interface User {
  id: string;
  username: string;
  avatar_url?: string | null;
  full_name?: string | null;
  // Legacy `name` kept so any stale callers still render something.
  name?: string;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  selectedUserIds: string[];
  onToggleUser: (userId: string) => void;
}

export const CircleSearchModal = ({ visible, onClose, selectedUserIds, onToggleUser }: Props) => {
  const T = getTheme(useColorScheme());
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch your circle when the modal opens
  useEffect(() => {
    if (visible) {
      fetchCircle();
      setSearchQuery('');
    }
  }, [visible]);

  const fetchCircle = async () => {
    setIsLoading(true);
    try {
      // GET /api/users/me/circle returns the people the viewer follows.
      // The project's `api` wrapper resolves to the parsed envelope already,
      // so `res.data` is the inner array directly — no `.data.data` chain.
      const res = await api.get<{ success: boolean; data: User[] }>(
        '/users/me/circle',
      );
      setUsers(Array.isArray(res?.data) ? res.data : []);
    } catch (err) {
      console.error('Failed to fetch circle', err);
      setUsers([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Filter users instantly on the client side based on username
  const filteredUsers = users.filter(u => 
    u.username?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSearchChange = (text: string) => {
    // Strip out '@' automatically if the user types it
    setSearchQuery(text.replace('@', ''));
  };

  const renderItem = ({ item }: { item: User }) => {
    const isSelected = selectedUserIds.includes(item.id);

    return (
      <TouchableOpacity 
        style={[styles.userRow, { borderBottomColor: T.borderSubtle }]}
        onPress={() => onToggleUser(item.id)}
        activeOpacity={0.7}
      >
        <View style={styles.userInfo}>
          {item.avatar_url ? (
            <Image source={{ uri: item.avatar_url }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatarPlaceholder, { backgroundColor: T.bgInput }]}>
              <Ionicons name="person" size={20} color={T.text3} />
            </View>
          )}
          <View>
            <Text style={[styles.username, { color: T.text }]}>{item.username}</Text>
            {(item.full_name || item.name) ? (
              <Text style={[styles.name, { color: T.text3 }]}>
                {item.full_name || item.name}
              </Text>
            ) : null}
          </View>
        </View>

        {/* Custom Checkbox */}
        <Ionicons 
          name={isSelected ? "checkbox" : "square-outline"} 
          size={24} 
          color={isSelected ? T.accent : T.text3} 
        />
      </TouchableOpacity>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined} 
        style={[styles.container, { backgroundColor: T.bgBase }]}
      >
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: T.borderSubtle }]}>
          <TouchableOpacity onPress={onClose}>
            <Text style={[styles.headerBtn, { color: T.text2 }]}>Cancel</Text>
          </TouchableOpacity>
          <Text style={[styles.title, { color: T.text }]}>Add Friends</Text>
          <TouchableOpacity onPress={onClose}>
            <Text style={[styles.headerBtn, { color: T.accent, fontFamily: fonts.bold }]}>Done</Text>
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <View style={[styles.searchBox, { backgroundColor: T.bgInput, borderColor: T.border }]}>
            <Ionicons name="search" size={20} color={T.text3} style={{ marginRight: 8 }} />
            <TextInput
              style={[styles.input, { color: T.text }]}
              placeholder="Search username"
              placeholderTextColor={T.text3}
              value={searchQuery}
              onChangeText={handleSearchChange}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
        </View>

        {/* List of Users */}
        {isLoading ? (
          <ActivityIndicator size="large" color={T.accent} style={{ marginTop: 40 }} />
        ) : (
          <FlatList
            data={filteredUsers}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <Text style={[styles.emptyText, { color: T.text3 }]}>
                {searchQuery ? "No users found." : "No friends in your circle yet."}
              </Text>
            }
          />
        )}
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.md, borderBottomWidth: StyleSheet.hairlineWidth },
  title: { fontFamily: fonts.bold, fontSize: fontSizes.lg },
  headerBtn: { fontFamily: fonts.medium, fontSize: fontSizes.md },
  
  searchContainer: { padding: spacing.md },
  searchBox: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: radii.pill, paddingHorizontal: spacing.md, height: 44 },
  input: { flex: 1, fontFamily: fonts.regular, fontSize: fontSizes.md },
  
  listContent: { paddingHorizontal: spacing.md, paddingBottom: spacing.xxl },
  userRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: spacing.md, borderBottomWidth: StyleSheet.hairlineWidth },
  userInfo: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 40, height: 40, borderRadius: 20, marginRight: spacing.md },
  avatarPlaceholder: { width: 40, height: 40, borderRadius: 20, marginRight: spacing.md, justifyContent: 'center', alignItems: 'center' },
  username: { fontFamily: fonts.semibold, fontSize: fontSizes.md, marginBottom: 2 },
  name: { fontFamily: fonts.regular, fontSize: fontSizes.sm },
  
  emptyText: { textAlign: 'center', marginTop: 40, fontFamily: fonts.medium, fontSize: fontSizes.md }
});