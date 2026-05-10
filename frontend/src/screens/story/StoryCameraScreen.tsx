// src/screens/story/StoryCameraScreen.tsx

import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  KeyboardAvoidingView, Platform, Dimensions, Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions, useMicrophonePermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { fonts, fontSizes, spacing } from '../../types/theme';
import { RootStackParamList } from '../../types/navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'StoryCamera'>;
type CreationMode = 'camera' | 'text';

const { width } = Dimensions.get('window');

export const StoryCameraScreen: React.FC<Props> = ({ navigation }) => {
  const [camPermission, requestCamPermission] = useCameraPermissions();
  const [micPermission, requestMicPermission] = useMicrophonePermissions();

  const [mode,          setMode]          = useState<CreationMode>('camera');
  // FIX: Added dynamic mode switching for Android
  const [cameraMode,    setCameraMode]    = useState<'picture' | 'video'>('picture');
  const [cameraFacing,  setCameraFacing]  = useState<'front' | 'back'>('back');
  const [flash,         setFlash]         = useState<'off' | 'on'>('off');
  const [isRecording,   setIsRecording]   = useState(false);
  const [textContent,   setTextContent]   = useState('');
  const [selectedAudio, setSelectedAudio] = useState<{ id: string; title: string } | null>(null);

  const cameraRef = useRef<CameraView>(null);

  if (!camPermission || !micPermission) return <View style={styles.container} />;

  if (!camPermission.granted || !micPermission.granted) {
    return (
      <View style={styles.permissionContainer}>
        <Text style={styles.permissionText}>We need camera and microphone access to create stories.</Text>
        <TouchableOpacity 
          style={styles.permissionBtn} 
          onPress={async () => {
            await requestCamPermission();
            await requestMicPermission();
          }}
        >
          <Text style={styles.permissionBtnText}>Grant Permissions</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const toggleCameraFacing = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCameraFacing(prev => prev === 'back' ? 'front' : 'back');
  };

  const handlePickGallery = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images', 'videos'],
      allowsEditing: true,
      quality: 1,
    });

    if (!result.canceled && result.assets?.[0]) {
      const asset = result.assets[0];
      navigation.navigate('StoryPreview', {
        mediaUri:  asset.uri,
        mediaType: asset.type === 'video' ? 'video' : 'image',
      });
    }
  };

  const takePicture = async () => {
    if (!cameraRef.current || isRecording) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    try {
      // Because cameraMode is 'picture', Android won't crash here.
      const photo = await cameraRef.current.takePictureAsync();
      
      if (photo) {
        navigation.navigate('StoryPreview', { mediaUri: photo.uri, mediaType: 'image' });
      }
    } catch (error) {
      console.log('Capture error:', error);
      Alert.alert('Error', 'Failed to take photo. Please try again.');
    }
  };

  const startRecording = async () => {
    if (!cameraRef.current) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    
    // FIX: Switch to video mode
    setCameraMode('video');
    
    // Give Android 150ms to natively reconfigure the camera pipeline before recording
    setTimeout(async () => {
      setIsRecording(true);
      try {
        const video = await cameraRef.current?.recordAsync({
          maxDuration: 60,
        });
        
        if (video) {
          navigation.navigate('StoryPreview', { mediaUri: video.uri, mediaType: 'video' });
        }
      } catch (error) {
        console.log('Video error:', error);
        setIsRecording(false);
        setCameraMode('picture'); // Reset if it fails
      }
    }, 150);
  };

  const stopRecording = () => {
    if (!cameraRef.current || !isRecording) return;
    setIsRecording(false);
    cameraRef.current.stopRecording();
    
    // FIX: Reset back to picture mode so the next tap works instantly
    setCameraMode('picture');
  };

  const openAudioLibrary = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>

      {mode === 'camera' ? (
        <CameraView
          ref={cameraRef}
          style={StyleSheet.absoluteFillObject}
          facing={cameraFacing}
          enableTorch={flash === 'on'}
          mode={cameraMode} // Dynamic mode applied here
        />
      ) : (
        <View style={[StyleSheet.absoluteFillObject, styles.textCanvas]}>
          <TextInput
            style={styles.textInput}
            placeholder="Tap to type..."
            placeholderTextColor="rgba(255,255,255,0.5)"
            multiline
            autoFocus
            value={textContent}
            onChangeText={setTextContent}
          />
        </View>
      )}

      <View style={styles.topGradient}>
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={20}>
            <Ionicons name="close" size={32} color="#fff" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.audioPill} onPress={openAudioLibrary}>
            <Ionicons name="musical-notes" size={16} color="#fff" />
            <Text style={styles.audioPillText}>
              {selectedAudio ? selectedAudio.title : 'Add Audio'}
            </Text>
          </TouchableOpacity>

          {mode === 'camera' ? (
            <TouchableOpacity onPress={() => setFlash(f => f === 'on' ? 'off' : 'on')} hitSlop={20}>
              <Ionicons name={flash === 'on' ? 'flash' : 'flash-off'} size={28} color="#fff" />
            </TouchableOpacity>
          ) : <View style={{ width: 28 }} />}
        </View>
      </View>

      <KeyboardAvoidingView
        style={styles.bottomControlsArea}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.modeSwitcher}>
          <TouchableOpacity onPress={() => setMode('camera')}>
            <Text style={[styles.modeText, mode === 'camera' && styles.modeTextActive]}>Camera</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setMode('text')}>
            <Text style={[styles.modeText, mode === 'text' && styles.modeTextActive]}>Text</Text>
          </TouchableOpacity>
        </View>

        {mode === 'camera' ? (
          <View style={styles.cameraControls}>
            <TouchableOpacity style={styles.galleryBtn} onPress={handlePickGallery}>
              <Ionicons name="images" size={24} color="#fff" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.shutterRing}
              activeOpacity={1}
              onPress={takePicture}
              onLongPress={startRecording}
              onPressOut={stopRecording}
              delayLongPress={250}
            >
              <View style={[styles.shutterButton, isRecording && styles.shutterRecording]} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.flipBtn} onPress={toggleCameraFacing}>
              <Ionicons name="camera-reverse" size={28} color="#fff" />
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.textControls}>
            <TouchableOpacity
              style={[styles.postButton, !textContent.trim() && { opacity: 0.5 }]}
              disabled={!textContent.trim()}
              onPress={() => navigation.navigate('StoryPreview', { mediaUri: textContent, mediaType: 'text' })}
            >
              <Text style={styles.postButtonText}>Next</Text>
              <Ionicons name="chevron-forward" size={20} color="#000" />
            </TouchableOpacity>
          </View>
        )}
      </KeyboardAvoidingView>

    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container:          { flex: 1, backgroundColor: '#000' },
  permissionContainer:{ flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center', padding: spacing.xl },
  permissionText:     { color: '#fff', fontSize: fontSizes.lg, textAlign: 'center', marginBottom: spacing.lg },
  permissionBtn:      { backgroundColor: '#fff', paddingHorizontal: spacing.xl, paddingVertical: spacing.md, borderRadius: 100 },
  permissionBtnText:  { color: '#000', fontFamily: fonts.bold, fontSize: fontSizes.md },
  textCanvas:         { backgroundColor: '#FF5733', justifyContent: 'center', alignItems: 'center', padding: spacing.xl },
  textInput:          { color: '#fff', fontSize: 36, fontFamily: fonts.bold, textAlign: 'center', width: '100%' },
  topGradient:        { position: 'absolute', top: 0, left: 0, right: 0, height: 120, paddingTop: 50, paddingHorizontal: spacing.base },
  topBar:             { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  audioPill:          { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.4)', paddingHorizontal: spacing.md, paddingVertical: 8, borderRadius: 100, gap: 6 },
  audioPillText:      { color: '#fff', fontFamily: fonts.semibold, fontSize: fontSizes.sm },
  bottomControlsArea: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingBottom: 40 },
  modeSwitcher:       { flexDirection: 'row', justifyContent: 'center', gap: spacing.xl, marginBottom: spacing.xl },
  modeText:           { color: 'rgba(255,255,255,0.5)', fontFamily: fonts.bold, fontSize: fontSizes.md },
  modeTextActive:     { color: '#fff', textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4 },
  cameraControls:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 40 },
  galleryBtn:         { width: 50, height: 50, borderRadius: 25, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  flipBtn:            { width: 50, height: 50, borderRadius: 25, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  shutterRing:        { width: 80, height: 80, borderRadius: 40, borderWidth: 4, borderColor: '#fff', justifyContent: 'center', alignItems: 'center' },
  shutterButton:      { width: 64, height: 64, borderRadius: 32, backgroundColor: '#fff' },
  shutterRecording:   { backgroundColor: '#FF3B30', transform: [{ scale: 0.6 }], borderRadius: 8 },
  textControls:       { alignItems: 'center' },
  postButton:         { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', paddingHorizontal: spacing.xl, paddingVertical: spacing.md, borderRadius: 100, gap: 4 },
  postButtonText:     { color: '#000', fontFamily: fonts.bold, fontSize: fontSizes.md },
});