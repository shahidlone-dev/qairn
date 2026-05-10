// src/App.tsx
import React from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { ThemeProvider } from './theme/src/ThemeProvider';
import { AuthProvider } from './context/AuthContext';
import { RootNavigator } from './navigation/RootNavigator';

export default function App() {
  return (
    <ThemeProvider storage={AsyncStorage} defaultPreference="system">
      <AuthProvider>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <RootNavigator />
        </GestureHandlerRootView>
      </AuthProvider>
    </ThemeProvider>
  );
}