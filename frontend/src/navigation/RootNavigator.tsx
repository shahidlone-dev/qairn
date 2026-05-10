// src/navigation/RootNavigator.tsx

import React from 'react';
import { useColorScheme, ActivityIndicator, View } from 'react-native';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { getTheme } from '../types/theme';
import { RootStackParamList } from '../types/navigation';
import { useAuth } from '../hooks/useAuth';

// Provider
import { ScrollProvider } from '../context/ScrollContext';

// Auth
import { OnboardingScreen } from '../screens/auth/OnboardingScreen';
import { AuthScreen } from '../screens/auth/AuthScreen';
import { SignupPhoneScreen } from '../screens/auth/SignupPhoneScreen';
import { OtpScreen } from '../screens/auth/OtpScreen';
import { SignupCompleteScreen } from '../screens/auth/SignupCompleteScreen';
import { ForgotPasswordScreen } from '../screens/auth/ForgotPasswordScreen';
import { ResetPasswordScreen } from '../screens/auth/ResetPasswordScreen';

// App
import { MainTabNavigator } from './MainTabNavigator';
import { CommentsScreen } from '../screens/campus/CommentsScreen';
import { ChatRoomScreen } from '../screens/chats/ChatRoomScreen';
import { ChatRequestsScreen } from '../components/chats/ChatRequestsScreen';
import { BlockedChatsScreen } from '../components/chats/BlockedChatsScreen';
import { NewGroupScreen } from '../components/chats/NewGroupScreen';
import { SearchScreen } from '../screens/search/SearchScreen';
import { ProfileScreen } from '../screens/shared/ProfileScreen';
import { EditProfileScreen } from '../screens/shared/EditProfileScreen';
import { CreatePostScreen } from '../screens/campus/CreatePostScreen';
import { PostImageViewerScreen } from '../screens/campus/PostImageViewerScreen';
import { ProfileOptionsScreen } from '../components/profile/ProfileOptionsScreen';

// STORY SCREENS
import { StoryViewerScreen } from '../screens/story/StoryViewerScreen'; 
import { StoryCameraScreen } from '../screens/story/StoryCameraScreen';
import { StoryPreviewScreen } from '../screens/story/StoryPreviewScreen';
import { StoryGallery } from '../components/story/StoryGallery'; 

const Stack = createNativeStackNavigator<RootStackParamList>();

export const RootNavigator: React.FC = () => {
  const scheme = useColorScheme();
  const T = getTheme(scheme);
  const { isLoggedIn, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: T.bg }}>
        <ActivityIndicator size="large" color={T.accent} />
      </View>
    );
  }

  const navTheme = {
    ...(scheme === 'dark' ? DarkTheme : DefaultTheme),
    colors: {
      ...(scheme === 'dark' ? DarkTheme.colors : DefaultTheme.colors),
      background: T.bg, card: T.bgCard, text: T.text,
      border: T.border, primary: T.accent, notification: T.accent,
    },
  };

  return (
    <NavigationContainer theme={navTheme}>
      <ScrollProvider>
        <Stack.Navigator
          screenOptions={{ headerShown: false, contentStyle: { backgroundColor: T.bg } }}
          initialRouteName={isLoggedIn ? 'MainTabs' : 'Onboarding'}
        >
          {/* Auth flow */}
          <Stack.Screen name="Onboarding" component={OnboardingScreen} options={{ animation: 'fade' }} />
          <Stack.Screen name="Auth" component={AuthScreen} options={{ animation: 'fade' }} />
          <Stack.Screen name="SignupPhone" component={SignupPhoneScreen} />
          <Stack.Screen name="OtpVerify" component={OtpScreen} />
          <Stack.Screen name="SignupComplete" component={SignupCompleteScreen} />
          <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
          <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />

          {/* Main app */}
          <Stack.Screen name="MainTabs" component={MainTabNavigator} />
          <Stack.Screen name="PostDetail" component={CommentsScreen} />
          <Stack.Screen name="ChatRoom" component={ChatRoomScreen} />
          <Stack.Screen name="ChatRequests" component={ChatRequestsScreen} />
          <Stack.Screen name="BlockedChats" component={BlockedChatsScreen} />
          <Stack.Screen name="NewGroup" component={NewGroupScreen} options={{ animation: 'slide_from_bottom' }}/>
          <Stack.Screen name="Search" component={SearchScreen} />
          <Stack.Screen name="Profile" component={ProfileScreen} />
          <Stack.Screen name="ProfileOptions" component={ProfileOptionsScreen} />
          <Stack.Screen name="EditProfile" component={EditProfileScreen} />
          <Stack.Screen name="CreatePost" component={CreatePostScreen} options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom' }} />
          <Stack.Screen
            name="PostImageViewer"
            component={PostImageViewerScreen}
            options={{ animation: 'slide_from_right' }}
          />
          
          {/* STORY SCREENS */}
          <Stack.Screen
            name="StoryViewer"
            component={StoryViewerScreen}
            options={{ presentation: 'transparentModal', animation: 'fade' }}
          />
          
          <Stack.Screen 
            name="StoryGallery" 
            component={StoryGallery} 
            options={{ 
              headerShown: false,
              animation: 'slide_from_bottom',
            }} 
          />
          
          <Stack.Screen 
            name="StoryCamera" 
            component={StoryCameraScreen} 
            options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom' }} 
          />
          
          <Stack.Screen 
            name="StoryPreview" 
            component={StoryPreviewScreen} 
          />

        </Stack.Navigator>
      </ScrollProvider>
    </NavigationContainer>
  );
};