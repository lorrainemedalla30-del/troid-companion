import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import type { CompanionSession } from '@/utils/troid-api';

/**
 * Keeps the operator's session on the phone (SecureStore, the iOS Keychain /
 * Android Keystore; AsyncStorage on web) so the phone stays signed in across
 * restarts, even where there is no internet (e.g. on the bot's hotspot).
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
  try {
    if (Platform.OS === 'web') await AsyncStorage.setItem(KEY, raw);
    else await SecureStore.setItemAsync(KEY, raw);
  } catch {
    // Storage unavailable: the operator stays signed in until the app closes.
  }
}

export async function clearSession(): Promise<void> {
  try {
    if (Platform.OS === 'web') await AsyncStorage.removeItem(KEY);
    else await SecureStore.deleteItemAsync(KEY);
  } catch {
    // Nothing stored, or storage unavailable; the session is gone either way.
  }
}
