import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import type { CompanionSession } from '@/utils/troid-api';

/**
 * Keeps the operator signed in across app restarts. On phones the session is in
 * SecureStore (the iOS Keychain / Android Keystore). SecureStore has no web
 * version, so the web build (development only) uses AsyncStorage.
 */

const KEY = 'operatorSession.v1';

export async function loadSession(): Promise<CompanionSession | null> {
  try {
    const raw = Platform.OS === 'web' ? await AsyncStorage.getItem(KEY) : await SecureStore.getItemAsync(KEY);
    return raw ? (JSON.parse(raw) as CompanionSession) : null;
  } catch {
    return null;
  }
}

export async function saveSession(session: CompanionSession): Promise<void> {
  const raw = JSON.stringify(session);
  if (Platform.OS === 'web') await AsyncStorage.setItem(KEY, raw);
  else await SecureStore.setItemAsync(KEY, raw);
}

export async function clearSession(): Promise<void> {
  try {
    if (Platform.OS === 'web') await AsyncStorage.removeItem(KEY);
    else await SecureStore.deleteItemAsync(KEY);
  } catch {
    // Nothing stored, or storage unavailable; the session is gone either way.
  }
}
