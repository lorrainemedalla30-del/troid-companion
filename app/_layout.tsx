import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { useEffect, useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { TaskSyncProvider } from '@/contexts/TaskSyncContext';

export const unstable_settings = {
  anchor: 'loginpage',
};

function RootLayoutNav() {
  const [isMounted, setIsMounted] = useState(false);
  const segments = useSegments();
  const router = useRouter();
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isMounted) return;

    const inAuthGroup = segments[0] === 'loginpage';

    if (!isAuthenticated && !inAuthGroup) {
      router.replace('/loginpage');
    } else if (isAuthenticated && inAuthGroup) {
      router.replace('/(tabs)');
    }
  }, [isMounted, segments, isAuthenticated, router]);

  return (
    <Stack initialRouteName="loginpage">
      <Stack.Screen name="loginpage" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
    </Stack>
  );
}

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    // Needed for gesture-handler, which the drive pads use for multi-touch.
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <TaskSyncProvider>
          <RootLayoutNav />
        </TaskSyncProvider>
        <StatusBar style="light" />
      </AuthProvider>
    </GestureHandlerRootView>
  );
}
