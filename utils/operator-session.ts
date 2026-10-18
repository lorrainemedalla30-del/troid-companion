import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import type { CompanionSession } from '@/utils/troid-api';

/**
 * Earlier versions kept the operator's session on the phone (SecureStore, the
 * iOS Keychain / Android Keystore; AsyncStorage on web) so they stayed signed in
 * across restarts. The app now signs in every time it opens; these helpers find
 * and remove such a leftover session at startup.
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

export async function clearSession(): Promise<void> {
  try {
    if (Platform.OS === 'web') await AsyncStorage.removeItem(KEY);
    else await SecureStore.deleteItemAsync(KEY);
  } catch {
    // Nothing stored, or storage unavailable; the session is gone either way.
  }
}
