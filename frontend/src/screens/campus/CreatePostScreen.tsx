import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ActivityIndicator,
  Alert, Dimensions, Pressable, Keyboard,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import Animated, { 
  FadeInUp,
  FadeInDown, 
  FadeOutDown,
  Layout, 
  useAnimatedStyle, 
  useSharedValue, 
  withSpring, 
  withTiming,
  withRepeat,
  withSequence,
  Easing,
  interpolate,
  Extrapolation,
  useAnimatedScrollHandler,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

import { getTheme, fonts, fontSizes, spacing } from '../../types/theme';
import { Avatar } from '../../components/ui';
import { useAuth } from '../../hooks/useAuth';
import { useCreatePost } from '../../hooks/useCreatePost';
import { RootStackScreenProps } from '../../types/navigation';

type Props = RootStackScreenProps<'CreatePost'>;

type PickedMedia = {
  uri:      string;
  type:     'image' | 'video';
  mimeType: string;
  width:    number | null;
  height:   number | null;
};

const MAX_HEIGHT_RATIO = 4 / 3;
const SW = Dimensions.get('window').width;
const PREVIEW_W = SW - spacing.base * 2;

const SYS_SPRING = { damping: 24, stiffness: 200, mass: 1 };
const TENSION_SPRING = { damping: 14, stiffness: 350, mass: 0.4 };
const RELAX_SPRING = { damping: 18, stiffness: 220, mass: 0.8 };
const FLOAT_EASING = Easing.bezier(0.25, 0.1, 0.25, 1);

function previewHeight(w: number, width: number | null, height: number | null): number {
  if (!width || !height || height === 0) return w;
  const realRatio = width / height;
  const natural   = w / realRatio;
  const cap       = w * MAX_HEIGHT_RATIO;
  return Math.min(natural, cap);
}

const VideoPreview = ({ uri, h }: { uri: string; h: number }) => {
  const player = useVideoPlayer(uri, p => {
    p.loop  = true;
    p.muted = true;
    p.play();
  });

  return (
    <VideoView
      player={player}
      style={{ width: '100%', height: h }}
      contentFit="cover"
      nativeControls={false}
    />
  );
};

const PostButton = ({ onPress, disabled, loading, isSuccess, T }: any) => {
  const scale = useSharedValue(1);
  const breath = useSharedValue(1);

  useEffect(() => {
    if (!disabled && !loading && !isSuccess) {
      breath.value = withRepeat(
        withSequence(
          withTiming(1.015, { duration: 2500, easing: Easing.inOut(Easing.sin) }),
          withTiming(1, { duration: 2500, easing: Easing.inOut(Easing.sin) })
        ),
        -1,
        true
      );
    } else {
      breath.value = withTiming(1, { duration: 600, easing: Easing.out(Easing.quad) });
    }
  }, [disabled, loading, isSuccess]);

  const animatedStyle = useAnimatedStyle(() => {
    const activeScale = scale.value !== 1 ? scale.value : breath.value;
    const currentScale = isSuccess ? withSpring(1.04, SYS_SPRING) : activeScale;
    
    return {
      transform: [{ scale: currentScale }],
      opacity: withTiming(disabled ? 0.35 : (isSuccess ? 0 : 1), { duration: 400, easing: Easing.out(Easing.cubic) }),
    };
  });

  const glowStyle = useAnimatedStyle(() => ({
    opacity: withTiming(disabled ? 0 : (isSuccess ? 0 : 0.4), { duration: 600 }),
    transform: [{ scale: isSuccess ? withSpring(1.5, SYS_SPRING) : breath.value }],
  }));

  return (
    <Animated.View style={animatedStyle}>
      <Animated.View 
        style={[styles.postBtnGlow, glowStyle, { shadowColor: isSuccess ? '#34C759' : T.accent }]} 
        pointerEvents="none"
      />
      <Pressable
        onPress={() => {
          if (!disabled && !loading && !isSuccess) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
            onPress();
          }
        }}
        onPressIn={() => {
          if (!disabled && !isSuccess) scale.value = withSpring(0.92, TENSION_SPRING);
        }}
        onPressOut={() => {
          if (!isSuccess) scale.value = withSpring(1, RELAX_SPRING);
        }}
        disabled={disabled || loading || isSuccess}
      >
        <LinearGradient
          colors={disabled ? [T.bgInput, T.bgInput] : isSuccess ? ['#34C759', '#2DB84D'] : [T.accent, '#3B73E0']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.postBtn}
        >
          {loading && !isSuccess ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={[styles.postBtnText, { color: disabled ? T.text3 : '#ffffff' }]}>
              {isSuccess ? 'Sent' : 'Post'}
            </Text>
          )}
        </LinearGradient>
      </Pressable>
    </Animated.View>
  );
};

const MediaPreview = ({ media, h, onRemove }: any) => {
  const tapScale = useSharedValue(1);
  const tiltX = useSharedValue(0);
  const tiltY = useSharedValue(0);
  const burstScale = useSharedValue(0.8);
  const burstOpacity = useSharedValue(0);
  const idleBreath = useSharedValue(1);
  const lastTap = useRef(0);

  useEffect(() => {
    idleBreath.value = withRepeat(
      withSequence(
        withTiming(1.004, { duration: 3500, easing: Easing.inOut(Easing.sin) }),
        withTiming(1, { duration: 3500, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      true
    );
  }, []);

  const handlePressIn = (e: any) => {
    const { locationX, locationY } = e.nativeEvent;
    const midX = PREVIEW_W / 2;
    const midY = h / 2;
    tiltX.value = withSpring((locationY - midY) * 0.012, TENSION_SPRING);
    tiltY.value = withSpring((locationX - midX) * -0.012, TENSION_SPRING);
    tapScale.value = withSpring(0.97, TENSION_SPRING);
  };

  const handlePressOut = () => {
    tiltX.value = withSpring(0, RELAX_SPRING);
    tiltY.value = withSpring(0, RELAX_SPRING);
    tapScale.value = withSpring(1, RELAX_SPRING);
  };

  const handlePress = () => {
    const now = Date.now();
    if (now - lastTap.current < 300) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      burstScale.value = 0.8;
      burstOpacity.value = 0.4;
      burstScale.value = withSpring(3, { damping: 20, stiffness: 120 });
      burstOpacity.value = withTiming(0, { duration: 600, easing: Easing.out(Easing.quad) });
    } else {
      Haptics.selectionAsync();
    }
    lastTap.current = now;
  };

  const animatedPreviewStyle = useAnimatedStyle(() => {
    const currentScale = tapScale.value !== 1 ? tapScale.value : idleBreath.value;
    
    return {
      transform: [
        { perspective: 1000 },
        { rotateX: `${tiltX.value}deg` },
        { rotateY: `${tiltY.value}deg` },
        { scale: currentScale }
      ],
    };
  });

  const highlightStyle = useAnimatedStyle(() => {
    const intensity = Math.abs(tiltX.value) + Math.abs(tiltY.value);
    return {
      opacity: interpolate(intensity, [0, 4], [0, 0.12], Extrapolation.CLAMP),
    };
  });

  const burstStyle = useAnimatedStyle(() => ({
    opacity: burstOpacity.value,
    transform: [{ scale: burstScale.value }],
  }));

  return (
    <Animated.View 
      entering={FadeInDown.duration(400)} 
      layout={Layout.springify().damping(22)}
      style={styles.previewContainerLayout}
    >
      <View style={[styles.previewOuterWrap, { height: h }]}>
        <Pressable
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          onPress={handlePress}
          style={StyleSheet.absoluteFill}
        >
          <Animated.View style={[styles.previewWrap, animatedPreviewStyle]}>
            {media.type === 'image' ? (
              <Image
                source={{ uri: media.uri }}
                style={StyleSheet.absoluteFill}
                contentFit="cover"
                transition={500}
              />
            ) : (
              <VideoPreview uri={media.uri} h={h} />
            )}

            <LinearGradient
              colors={['rgba(0,0,0,0.3)', 'transparent', 'transparent', 'rgba(0,0,0,0.6)']}
              locations={[0, 0.3, 0.7, 1]}
              style={StyleSheet.absoluteFill}
              pointerEvents="none"
            />
            
            <Animated.View style={[StyleSheet.absoluteFill, highlightStyle]} pointerEvents="none">
              <LinearGradient
                colors={['rgba(255,255,255,0.8)', 'transparent']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
            </Animated.View>

            <View style={styles.previewInnerBorder} pointerEvents="none" />
            <Animated.View style={[styles.burstEffect, burstStyle]} pointerEvents="none" />

            <TouchableOpacity
              activeOpacity={0.7}
              style={styles.removeBtnContainer}
              onPress={() => {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Light);
                onRemove();
              }}
              hitSlop={{ top: 24, bottom: 24, left: 24, right: 24 }}
            >
              <View style={styles.glassBadge}>
                <LinearGradient
                  colors={['rgba(255,255,255,0.15)', 'rgba(255,255,255,0.02)']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 0, y: 1 }}
                  style={StyleSheet.absoluteFill}
                  pointerEvents="none"
                />
                <Ionicons name="close" size={18} color="#ffffff" style={{ opacity: 0.9 }} />
              </View>
            </TouchableOpacity>

            <View style={styles.dimBadge}>
              <LinearGradient
                colors={['rgba(255,255,255,0.1)', 'rgba(255,255,255,0.0)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={StyleSheet.absoluteFill}
                pointerEvents="none"
              />
              <Text style={styles.dimText}>{media.width} × {media.height}</Text>
            </View>
          </Animated.View>
        </Pressable>
      </View>
    </Animated.View>
  );
};

export const CreatePostScreen: React.FC<Props> = ({ route, navigation }) => {
  const T = getTheme(useColorScheme());
  const { user } = useAuth();
  const { submitPost, isSubmitting } = useCreatePost();
  
  const mode = route.params?.mode ?? 'text';

  const [content, setContent] = useState('');
  const [media, setMedia] = useState<PickedMedia | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const inputRef = useRef<TextInput>(null);

  const isPostValid = content.trim().length > 0 || media !== null;

  const scrollY = useSharedValue(0);
  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  const headerStyle = useAnimatedStyle(() => {
    const translateY = interpolate(scrollY.value, [0, 60], [0, -10], Extrapolation.CLAMP);
    const opacity = interpolate(scrollY.value, [0, 60], [1, 0.95], Extrapolation.CLAMP);
    return {
      transform: [{ translateY }],
      opacity,
    };
  });

  const inputScale = useSharedValue(1);
  const inputAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: inputScale.value }]
  }));

  const floatY = useSharedValue(0);
  useEffect(() => {
    floatY.value = withRepeat(
      withSequence(
        withTiming(-5, { duration: 3000, easing: FLOAT_EASING }),
        withTiming(0, { duration: 3000, easing: FLOAT_EASING })
      ),
      -1,
      true
    );
  }, []);
  
  const toolbarStyle = useAnimatedStyle(() => ({ 
    transform: [{ translateY: floatY.value }] 
  }));

  useEffect(() => {
    if (mode === 'image' || mode === 'video') pickMedia(mode);
  }, [mode]);

  const pickMedia = useCallback(async (type: 'image' | 'video') => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'We need access to your photos.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: type === 'image' ? ['images'] : ['videos'],
      allowsEditing: false,
      quality: 0.85,
    });

    if (!result.canceled && result.assets?.[0]) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      const asset = result.assets[0];
      setMedia({
        uri:      asset.uri,
        type,
        mimeType: asset.mimeType ?? (type === 'video' ? 'video/mp4' : 'image/jpeg'),
        width:    asset.width  ?? null,
        height:   asset.height ?? null,
      });
      setTimeout(() => inputRef.current?.focus(), 300);
    } else if (!media) {
      navigation.goBack();
    }
  }, [media, navigation]);

  const handlePost = () => {
    if (!isPostValid || isSubmitting || isSuccess) return;
    Keyboard.dismiss();
    
    // Using a single object to match SubmitPostParams
    submitPost({
      content,
      mediaUri: media?.uri,
      mediaType: media?.type,
      mimeType: media?.mimeType,
      pickerWidth: media?.width ?? null,
      pickerHeight: media?.height ?? null,
      onNavigated: () => {
        setIsSuccess(true);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setTimeout(() => {
          navigation.goBack();
        }, 900);
      },
    });
  };

  const cancelScale = useSharedValue(1);
  const cancelAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: cancelScale.value }]
  }));

  return (
    <View style={[styles.flex, { backgroundColor: T.bg }]}>
      <SafeAreaView style={styles.flex} edges={['top']}>
        <KeyboardAvoidingView 
          style={styles.flex} 
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
          
          <Animated.View entering={FadeInUp.duration(400)} style={styles.headerWrapperOuter}>
            <Animated.View style={[styles.headerWrapper, headerStyle]}>
              <View style={styles.header}>
                <Animated.View style={cancelAnimatedStyle}>
                  <Pressable
                    onPressIn={() => { cancelScale.value = withSpring(0.88, TENSION_SPRING); }}
                    onPressOut={() => { cancelScale.value = withSpring(1, RELAX_SPRING); }}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      navigation.goBack();
                    }}
                    hitSlop={24}
                  >
                    <Text style={[styles.cancelText, { color: T.text }]}>Cancel</Text>
                  </Pressable>
                </Animated.View>

                <Text style={[styles.headerTitle, { color: T.text }]}>
                  {media ? 'New Post' : 'Share something'}
                </Text>

                <PostButton 
                  onPress={handlePost} 
                  disabled={!isPostValid} 
                  loading={isSubmitting} 
                  isSuccess={isSuccess}
                  T={T} 
                />
              </View>
            </Animated.View>
          </Animated.View>

          <Animated.ScrollView
            style={styles.flex}
            contentContainerStyle={styles.editorContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            decelerationRate="fast"
            scrollEventThrottle={16}
            onScroll={scrollHandler}
            layout={Layout.springify().damping(24)}
          >
            <Animated.View layout={Layout.springify().damping(24)} style={styles.inputContainerLayout}>
              <Animated.View style={[styles.inputRow, inputAnimatedStyle]}>
                <Avatar size="md" uri={user?.avatar_url} name={user?.username} />
                <TextInput
                  ref={inputRef}
                  style={[styles.input, { color: T.text }]}
                  placeholder="What's the vibe?"
                  placeholderTextColor={T.text3}
                  multiline
                  autoFocus={mode === 'text'}
                  value={content}
                  onChangeText={(text) => {
                    setContent(text);
                    inputScale.value = withSequence(
                      withTiming(1.002, { duration: 30 }),
                      withTiming(1, { duration: 150 })
                    );
                  }}
                  editable={!isSubmitting && !isSuccess}
                  selectionColor={T.accent}
                  keyboardAppearance={T.isDark ? 'dark' : 'light'}
                />
              </Animated.View>
            </Animated.View>

            {media && (
              <MediaPreview 
                media={media} 
                h={previewHeight(PREVIEW_W, media.width, media.height)} 
                onRemove={() => setMedia(null)}
              />
            )}
          </Animated.ScrollView>

          {!media && !isSubmitting && !isSuccess && (
             <Animated.View 
               entering={FadeInDown.duration(400)} 
               exiting={FadeOutDown.duration(250)}
               style={styles.toolbarWrapper}
             >
               <Animated.View style={[styles.toolbar, toolbarStyle]}>
                 <View style={[styles.toolbarInner, { backgroundColor: T.isDark ? 'rgba(30,30,30,0.85)' : 'rgba(255,255,255,0.9)' }]}>
                    <LinearGradient
                      colors={T.isDark ? ['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.01)'] : ['rgba(255,255,255,0.6)', 'rgba(255,255,255,0.1)']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 0, y: 1 }}
                      style={StyleSheet.absoluteFill}
                      pointerEvents="none"
                    />
                    <ToolButton icon="image" onPress={() => pickMedia('image')} color={T.text} />
                    <View style={[styles.toolbarDivider, { backgroundColor: T.borderSubtle }]} />
                    <ToolButton icon="film" onPress={() => pickMedia('video')} color={T.text} />
                 </View>
               </Animated.View>
             </Animated.View>
          )}

        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
};

const ToolButton = ({ icon, onPress, color }: any) => {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }]
  }));

  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        onPressIn={() => { 
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          scale.value = withSpring(0.8, TENSION_SPRING); 
        }}
        onPressOut={() => { scale.value = withSpring(1, RELAX_SPRING); }}
        onPress={onPress}
        style={styles.toolBtn}
        hitSlop={24}
      >
        <Ionicons name={icon} size={25} color={color} style={styles.toolIcon} />
      </Pressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  headerWrapperOuter: {
    zIndex: 10,
  },
  headerWrapper: {
    backgroundColor: 'transparent',
    paddingBottom: 4,
  },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  headerTitle: {
    fontFamily: fonts.bold,
    fontSize: 17,
    letterSpacing: -0.4,
    textAlign: 'center',
  },
  cancelText: {
    fontFamily: fonts.regular,
    fontSize: 17,
    letterSpacing: -0.3,
    opacity: 0.85,
  },
  postBtnGlow: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 24,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 14,
    elevation: 8,
  },
  postBtn: {
    paddingHorizontal: 22,
    paddingVertical: 10,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  postBtnText: {
    fontFamily: fonts.bold,
    fontSize: 15,
    letterSpacing: -0.2,
  },
  editorContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 180, 
  },
  inputContainerLayout: {
    width: '100%',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
    marginBottom: 24,
  },
  input: {
    flex: 1,
    fontFamily: fonts.medium,
    fontSize: 22,
    lineHeight: 30,
    letterSpacing: -0.6,
    paddingTop: 6, 
    minHeight: 140,
    textAlignVertical: 'top',
  },
  previewContainerLayout: {
    width: '100%',
  },
  previewOuterWrap: {
    width: '100%',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 24 },
    shadowOpacity: 0.35,
    shadowRadius: 40,
    elevation: 24,
  },
  previewWrap: {
    flex: 1,
    borderRadius: 36, 
    overflow: 'hidden',
    backgroundColor: '#050505',
  },
  previewInnerBorder: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 36,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)', 
  },
  burstEffect: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.8)',
    borderRadius: 1000,
  },
  removeBtnContainer: {
    position: 'absolute',
    top: 20,
    right: 20,
    zIndex: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
  },
  glassBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    backgroundColor: 'rgba(15,15,15,0.65)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  dimBadge: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
    backgroundColor: 'rgba(15,15,15,0.65)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.25)',
    overflow: 'hidden',
  },
  dimText: {
    color: '#ffffff',
    fontSize: 12,
    fontFamily: fonts.bold,
    letterSpacing: 0.5,
    opacity: 0.95,
  },
  toolbarWrapper: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 44 : 36,
    alignSelf: 'center',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 24 },
    shadowOpacity: 0.25,
    shadowRadius: 36,
    elevation: 16,
  },
  toolbar: {
    alignSelf: 'center',
  },
  toolbarInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 48,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  toolbarDivider: {
    width: 1,
    height: 28,
    marginHorizontal: 14,
    opacity: 0.4,
    borderRadius: 1,
  },
  toolBtn: {
    width: 58,
    height: 58,
    borderRadius: 29,
    justifyContent: 'center',
    alignItems: 'center',
  },
  toolIcon: {
    opacity: 0.9,
  }
});