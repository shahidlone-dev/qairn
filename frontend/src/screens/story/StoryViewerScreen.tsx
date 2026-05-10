// src/screens/story/StoryViewerScreen.tsx
//
// Thin wrapper around <StoryModal/>. Kept as a Screen so that:
//   - Existing call sites (`navigation.navigate('StoryViewer', { userId })`)
//     keep working without changes
//   - Deep-linking and 3rd-party navigations land in a real screen rather
//     than relying on an in-tree modal portal
//
// The actual viewer logic — progress bars, gestures, video lifecycle, swipe
// to close, reply input — lives in components/story/StoryModal.tsx.

import React, { useState, useCallback, useEffect } from 'react';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { RootStackParamList } from '../../types/navigation';
import { StoryModal }         from '../../components/story/StoryModal';

type Props = NativeStackScreenProps<RootStackParamList, 'StoryViewer'>;

export const StoryViewerScreen: React.FC<Props> = ({ navigation, route }) => {
  // The viewer is keyed on the user-id we navigated in with.
  const targetUserId = route.params?.userId ?? null;
  const [visible, setVisible] = useState(true);

  const handleClose = useCallback(() => {
    setVisible(false);
    // Defer the goBack until the modal's exit animation has a chance to play.
    // Modal's own animation handles the visual fade; navigation pops the
    // route so the back-stack stays clean.
    requestAnimationFrame(() => navigation.goBack());
  }, [navigation]);

  // Re-open if we re-enter the screen with a fresh route param.
  useEffect(() => { setVisible(true); }, [targetUserId]);

  return (
    <StoryModal
      visible={visible}
      userId={targetUserId}
      onClose={handleClose}
    />
  );
};
