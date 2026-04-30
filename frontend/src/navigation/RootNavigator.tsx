// src/navigation/RootNavigator.tsx
import React from 'react';
import { useColorScheme, ActivityIndicator, View } from 'react-native';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { getTheme } from '../theme/theme';
import { RootStackParamList } from '../types/navigation';
import { useAuth } from '../hooks/useAuth';

// Auth
import { OnboardingScreen }      from '../screens/auth/OnboardingScreen';
import { AuthScreen }            from '../screens/auth/AuthScreen';
import { SignupPhoneScreen }     from '../screens/auth/SignupPhoneScreen';
import { OtpScreen }             from '../screens/auth/OtpScreen';
import { SignupCompleteScreen }  from '../screens/auth/SignupCompleteScreen';
import { ForgotPasswordScreen }  from '../screens/auth/ForgotPasswordScreen';
import { ResetPasswordScreen }   from '../screens/auth/ResetPasswordScreen';

// App
import { MainTabNavigator }  from './MainTabNavigator';
import { CommentsScreen }    from '../screens/campus/CommentsScreen';
import { ChatRoomScreen }    from '../screens/chats/ChatRoomScreen';
import { SearchScreen }      from '../screens/search/SearchScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

export const RootNavigator: React.FC = () => {
  const scheme             = useColorScheme();
  const T                  = getTheme(scheme);
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
      <Stack.Navigator
        screenOptions={{ headerShown: false, contentStyle: { backgroundColor: T.bg } }}
        initialRouteName={isLoggedIn ? 'MainTabs' : 'Onboarding'}
      >
        {/* Auth flow */}
        <Stack.Screen name="Onboarding"    component={OnboardingScreen}     options={{ animation: 'fade' }} />
        <Stack.Screen name="Auth"          component={AuthScreen}           options={{ animation: 'fade' }} />
        <Stack.Screen name="SignupPhone"   component={SignupPhoneScreen} />
        <Stack.Screen name="OtpVerify"     component={OtpScreen} />
        <Stack.Screen name="SignupComplete"component={SignupCompleteScreen} />
        <Stack.Screen name="ForgotPassword"component={ForgotPasswordScreen} />
        <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />

        {/* Main app */}
        <Stack.Screen name="MainTabs"   component={MainTabNavigator} />
        <Stack.Screen name="PostDetail" component={CommentsScreen} />
        <Stack.Screen name="ChatRoom"   component={ChatRoomScreen} />
        <Stack.Screen name="Search"     component={SearchScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};