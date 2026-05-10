import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MainTabParamList } from '../types/navigation';
import { CustomTabBar } from '../components/navigation/CustomTabBar';

import { CampusScreen }    from '../screens/campus/CampusScreen';
import { AcademicsScreen } from '../screens/academics/AcademicsScreen';
import { ChatsScreen }     from '../screens/chats/ChatsScreen';
import { MarketScreen }    from '../screens/market/MarketScreen';
import { ServicesScreen }  from '../screens/services/ServicesScreen';

const Tab = createBottomTabNavigator<MainTabParamList>();

export const MainTabNavigator: React.FC = () => {
  return (
    /* 
      REMOVED <ScrollProvider> from here. 
      It is now in RootNavigator.tsx to ensure 100% synchronization.
    */
    <Tab.Navigator
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{ headerShown: false }}
      initialRouteName="Campus"
    >
      <Tab.Screen name="Campus"    component={CampusScreen}    />
      <Tab.Screen name="Academics" component={AcademicsScreen} />
      <Tab.Screen name="Chats"     component={ChatsScreen}     />
      <Tab.Screen name="Market"    component={MarketScreen}    />
      <Tab.Screen name="Services"  component={ServicesScreen}  />
    </Tab.Navigator>
  );
};