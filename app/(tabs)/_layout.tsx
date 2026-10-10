import { Tabs } from 'expo-router';
import React from 'react';
import { Platform, Text, View, ColorValue } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const TabIcon = ({ name, color }: { name: string; color: ColorValue }) => {
  const iconMap: Record<string, any> = {
    'house.fill': 'home',
    'paperplane.fill': 'paper-plane',
  };
  return <Ionicons name={iconMap[name] || 'home'} size={22} color={color} />;
};

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#38bdf8',
        tabBarInactiveTintColor: 'rgba(255,255,255,0.5)',
        // Landscape: keep the bar short and put labels next to icons to save height.
        tabBarLabelPosition: 'beside-icon',
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
  );
}
