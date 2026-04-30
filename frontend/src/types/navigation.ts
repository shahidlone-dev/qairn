// src/types/navigation.ts
import { BottomTabScreenProps }  from '@react-navigation/bottom-tabs';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { CompositeScreenProps, NavigatorScreenParams } from '@react-navigation/native';

export type MainTabParamList = {
  Campus:    undefined;
  Academics: undefined;
  Chats:     undefined;
  Market:    undefined;
  Services:  undefined;
};

export type RootStackParamList = {
  // Auth
  Onboarding:     undefined;
  Auth:           undefined;
  SignupPhone:     undefined;
  OtpVerify:      { phone: string; mode: 'signup' | 'forgotPassword'; username?: string };
  SignupComplete:  { phone: string };
  ForgotPassword: { username?: string };
  ResetPassword:  { phone: string };

  // App
  MainTabs:       NavigatorScreenParams<MainTabParamList>;
  PostDetail:     { postId: string };
  ChatRoom:       { chatId: string; name: string };
  MarketListing:  { listingId: string };
  Notifications:  undefined;
  Settings:       undefined;
  Search:         undefined;
  Profile:        { userId: string };
};

export type RootStackScreenProps<T extends keyof RootStackParamList> =
  NativeStackScreenProps<RootStackParamList, T>;

export type MainTabScreenProps<T extends keyof MainTabParamList> =
  CompositeScreenProps<
    BottomTabScreenProps<MainTabParamList, T>,
    NativeStackScreenProps<RootStackParamList>
  >;

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}