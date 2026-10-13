import { SplashScreen, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { TaskSyncProvider } from '@/contexts/TaskSyncContext';

// Keeps the splash screen up until the saved session has been checked.
SplashScreen.preventAutoHideAsync();

function RootLayoutNav() {
  const { isRestoring, isAuthenticated, mustChangePassword } = useAuth();

  useEffect(() => {
    if (!isRestoring) SplashScreen.hide();
  }, [isRestoring]);

  // Only the screens whose guard passes exist, so the controllers can never show
  // before sign-in: signed out (and while the saved session loads), the login page
  // is the only screen. Signing in or out switches screens automatically.
  return (
    <Stack>
      <Stack.Protected guard={!isAuthenticated}>
        <Stack.Screen name="loginpage" options={{ headerShown: false }} />
      </Stack.Protected>

      <Stack.Protected guard={isAuthenticated && mustChangePassword}>
        <Stack.Screen name="change-password" options={{ headerShown: false }} />
      </Stack.Protected>

      <Stack.Protected guard={isAuthenticated && !mustChangePassword}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
      </Stack.Protected>
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
