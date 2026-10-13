import ScreenToggle from '@/components/ScreenToggle';
import { useIsLandscape } from '@/hooks/use-is-landscape';
import { Tabs } from 'expo-router';
import React from 'react';
import { View, ColorValue } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const TabIcon = ({ name, color }: { name: string; color: ColorValue }) => {
  const iconMap: Record<string, any> = {
    'house.fill': 'home',
    'paperplane.fill': 'paper-plane',
  };
  return <Ionicons name={iconMap[name] || 'home'} size={22} color={color} />;
};

export default function TabLayout() {
  const isLandscape = useIsLandscape();

  return (
    <View style={{ flex: 1 }}>
      <Tabs
        // Landscape: no bottom bar, the round toggle at the top switches screens.
        // Portrait: the usual bottom tab bar.
        tabBar={isLandscape ? () => null : undefined}
        screenOptions={{
          tabBarActiveTintColor: '#38bdf8',
          tabBarInactiveTintColor: 'rgba(255,255,255,0.5)',
          tabBarLabelPosition: 'beside-icon',
          // Otherwise Android lifts the bar above the keyboard and the screen jumps.
          tabBarHideOnKeyboard: true,
          tabBarStyle: {
            backgroundColor: '#0B1220',
            borderTopColor: 'rgba(255,255,255,0.08)',
          },
          headerShown: false,
        }}>
        <Tabs.Screen
          name="index"
          options={{
            title: 'Home',
            tabBarIcon: ({ color }) => <TabIcon name="house.fill" color={color} />,
          }}
        />
        <Tabs.Screen
          name="explore"
          options={{
            title: 'Explore',
            tabBarIcon: ({ color }) => <TabIcon name="paperplane.fill" color={color} />,
          }}
        />
      </Tabs>
      {isLandscape && <ScreenToggle />}
    </View>
  );
}
