// src/components/story/StoryGallery.tsx

import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  Image, 
  TouchableOpacity, 
  Dimensions, 
  ActivityIndicator,
  useColorScheme,
  Linking,
  AppState,
  AppStateStatus,
  Pressable
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as MediaLibrary from 'expo-media-library';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as Haptics from 'expo-haptics';

import { getTheme, spacing, radii } from '../../types/theme';
import { RootStackParamList } from '../../types/navigation';

const NUM_COLUMNS = 3;
const GAP = 2;
const SCREEN_WIDTH = Dimensions.get('window').width;
const ITEM_SIZE = (SCREEN_WIDTH - (GAP * (NUM_COLUMNS - 1))) / NUM_COLUMNS;

const CREATION_TOOLS = [
  { id: 'text', label: 'Text', icon: 'text' as const },
  { id: 'music', label: 'Music', icon: 'musical-notes' as const },
  { id: 'layout', label: 'Layout', icon: 'grid' as const },
  { id: 'voice', label: 'Voice', icon: 'mic' as const },
];

export const StoryGallery = () => {
  const colorScheme = useColorScheme();
  const T = getTheme(colorScheme);
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const [photos, setPhotos] = useState<MediaLibrary.Asset[]>([]);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAndFetchPhotos();
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') checkAndFetchPhotos(); 
    });
    return () => subscription.remove();
  }, []);

  const checkAndFetchPhotos = async () => {
    setLoading(true);
    try {
      let permission = await MediaLibrary.getPermissionsAsync();
      if (!permission.granted && permission.canAskAgain) {
        permission = await MediaLibrary.requestPermissionsAsync();
      }

      const isAllowed = permission.granted || permission.status === 'granted' || permission.accessPrivileges === 'limited';

      if (!isAllowed) {
        setHasPermission(false);
        setLoading(false);
        return;
      }

      setHasPermission(true);
      const media = await MediaLibrary.getAssetsAsync({
        first: 60,
        mediaType: ['photo', 'video'], // Added 'video' support
        sortBy: ['creationTime'],
      });
      setPhotos(media.assets);
    } catch (error) {
      setHasPermission(false);
    } finally {
      setLoading(false);
    }
  };

  const handleCameraPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    navigation.navigate('StoryCamera');
  };

  const handleMediaPress = (uri: string, assetType: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // Convert expo's 'photo' | 'video' to your app's 'image' | 'video'
    const type = assetType === 'video' ? 'video' : 'image';
    navigation.navigate('StoryPreview', { mediaUri: uri, mediaType: type });
  };

  const toolBoxBg = colorScheme === 'dark' ? '#2C2C2E' : '#F2F2F7';

  return (
    <View style={[styles.mainContainer, { backgroundColor: T.bg }]}>
      
      {/* ── 1/3 SOLID SPACE AT TOP (Tap to go back) ── */}
      <Pressable style={styles.topSpacer} onPress={() => navigation.goBack()}>
        <View style={styles.handle} />
      </Pressable>

      {/* ── CONTENT AREA (BOTTOM 2/3) ── */}
      <View style={[styles.content, { backgroundColor: T.bg }]}>
        
        {/* Creation Tools Row */}
        <View style={styles.toolsRow}>
          {CREATION_TOOLS.map((tool) => (
            <TouchableOpacity 
              key={tool.id}
              style={[styles.toolBox, { backgroundColor: toolBoxBg }]}
              onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
            >
              <View style={[styles.iconCircle, { backgroundColor: T.bg }]}>
                <Ionicons name={tool.icon} size={20} color={T.text} />
              </View>
              <Text style={[styles.toolText, { color: T.text }]}>{tool.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Gallery Grid */}
        {loading && photos.length === 0 ? (
          <View style={styles.center}><ActivityIndicator color={T.accent} /></View>
        ) : hasPermission === false ? (
          <View style={styles.center}>
            <Text style={{ color: T.text, marginBottom: 10 }}>Gallery access needed</Text>
            <TouchableOpacity onPress={() => Linking.openSettings()} style={styles.btn}>
              <Text style={{ color: '#fff', fontWeight: 'bold' }}>Open Settings</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={[{ id: 'camera-btn' }, ...photos]}
            keyExtractor={(item) => item.id}
            numColumns={NUM_COLUMNS}
            renderItem={({ item, index }) => {
              if (item.id === 'camera-btn') {
                return (
                  <TouchableOpacity 
                    style={[styles.gridItem, styles.cameraBtn, { backgroundColor: toolBoxBg }, (index + 1) % NUM_COLUMNS !== 0 && { marginRight: GAP }]}
                    onPress={handleCameraPress}
                  >
                    <Ionicons name="camera-outline" size={30} color={T.text} />
                    <Text style={{ color: T.text, fontSize: 12, marginTop: 4 }}>Camera</Text>
                  </TouchableOpacity>
                );
              }
              const photo = item as MediaLibrary.Asset;
              return (
                <TouchableOpacity 
                  style={[styles.gridItem, (index + 1) % NUM_COLUMNS !== 0 && { marginRight: GAP }]}
                  onPress={() => handleMediaPress(photo.uri, photo.mediaType)}
                >
                  <Image source={{ uri: photo.uri }} style={styles.image} />
                  
                  {/* Video Indicator Badge */}
                  {photo.mediaType === 'video' && (
                    <View style={styles.videoBadge}>
                      <Ionicons name="videocam" size={14} color="#fff" />
                    </View>
                  )}
                </TouchableOpacity>
              );
            }}
          />
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
  },
  topSpacer: {
    height: '10%',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: 10,
  },
  handle: {
    width: 40,
    height: 5,
    backgroundColor: '#ccc',
    borderRadius: 3,
  },
  content: {
    flex: 2, 
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 10,
  },
  toolsRow: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 16,
    justifyContent: 'space-between',
  },
  toolBox: {
    flex: 1,
    height: 80,
    marginHorizontal: 4,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  toolText: {
    fontSize: 12,
    fontWeight: '600',
  },
  gridItem: {
    width: ITEM_SIZE,
    height: ITEM_SIZE,
    marginBottom: GAP,
  },
  image: {
    flex: 1,
    backgroundColor: '#333',
  },
  cameraBtn: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btn: {
    backgroundColor: '#D85A30',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  videoBadge: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 2,
    flexDirection: 'row',
    alignItems: 'center',
  },
});