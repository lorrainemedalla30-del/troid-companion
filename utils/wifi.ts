import { Linking, NativeModules, PermissionsAndroid, Platform } from 'react-native';
import WifiManager, { type WifiEntry } from 'react-native-wifi-reborn';

/**
 * Joins Wi-Fi routers and phone hotspots (open or password-protected) so the
 * phone gets internet, using react-native-wifi-reborn.
 *
 * How joining works differs by platform:
 * - iOS: NEHotspotConfiguration. iOS asks the user to confirm, then joins with internet.
 * - Android 9 and older: the app adds and enables the network directly.
 * - Android 10+: apps may no longer switch the phone's Wi-Fi. The library's
 *   direct join on 10+ creates an app-only link with internet removed, so we
 *   instead save the network as a "suggestion"; Android then connects to it
 *   (with internet) and asks the user once to allow suggestions from this app.
 *   `openWifiPanel` is the fallback to pick the network in Android's own panel.
 *
 * The library is native code, so it is missing in Expo Go and on web. Every
 * function checks `isWifiControlAvailable` so the UI can explain instead of crashing.
 */

export type ScannedNetwork = { ssid: string; level: number; secured: boolean };

export const isWifiControlAvailable = Platform.OS !== 'web' && NativeModules.WifiManager != null;

/** Android lets apps list nearby networks; iOS does not allow scanning at all. */
export const canScan = isWifiControlAvailable && Platform.OS === 'android';

const isAndroid10Plus = Platform.OS === 'android' && Number(Platform.Version) >= 29;

/** Android's quick Wi-Fi panel (Android 10+) works even in Expo Go. */
export const canOpenWifiPanel = Platform.OS === 'android';

// Android reports security in `capabilities`, e.g. "[WPA2-PSK-CCMP][ESS]".
// Open networks only advertise "[ESS]" (and sometimes "[WPS]").
const SECURED = /WPA|WEP|SAE|PSK|EAP|OWE/i;

async function ensureAndroidLocationPermission() {
  if (Platform.OS !== 'android') return;
  const result = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION, {
    title: 'Location permission needed',
    message: 'Android requires location access to scan for and join Wi-Fi networks.',
    buttonPositive: 'Allow',
  });
  if (result !== PermissionsAndroid.RESULTS.GRANTED) {
    throw new Error('locationPermissionMissing');
  }
}

/** Nearby networks, strongest first (Android only). */
export async function scanNetworks(): Promise<ScannedNetwork[]> {
  if (!canScan) return [];
  await ensureAndroidLocationPermission();
  const list: WifiEntry[] = await WifiManager.reScanAndLoadWifiList();

  const bySsid = new Map<string, ScannedNetwork>();
  for (const entry of list) {
    const ssid = entry.SSID?.trim();
    if (!ssid) continue;
    const existing = bySsid.get(ssid);
    if (!existing || entry.level > existing.level) {
      bySsid.set(ssid, { ssid, level: entry.level, secured: SECURED.test(entry.capabilities) });
    }
  }
  return [...bySsid.values()].sort((a, b) => b.level - a.level);
}

export type JoinResult =
  /** The phone is now on the network. */
  | 'joined'
  /** Android 10+: saved; Android will switch to it on its own (or via the Wi-Fi panel). */
  | 'suggested';

/** Joins a network. Pass `password` null (or empty) for open networks. */
export async function joinNetwork(ssid: string, password: string | null): Promise<JoinResult> {
  if (!isWifiControlAvailable) throw new Error('unavailable');
  const pass = password ? password : null;

  if (Platform.OS === 'ios') {
    // iOS shows its own "Join network?" confirmation. joinOnce=false keeps it saved.
    await WifiManager.connectToProtectedSSIDOnce(ssid, pass, false, false);
    return 'joined';
  }

  await ensureAndroidLocationPermission();

  if (isAndroid10Plus) {
    await WifiManager.suggestWifiNetwork([{ ssid, password: pass ?? undefined }]);
    return (await waitForSsid(ssid, 15000)) ? 'joined' : 'suggested';
  }

  await WifiManager.connectToProtectedWifiSSID({ ssid, password: pass, isHidden: false, timeout: 20 });
  return 'joined';
}

/** Polls until the phone reports being on `ssid`, or the timeout passes. */
async function waitForSsid(ssid: string, timeoutMs: number) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if ((await getCurrentSsid()) === ssid) return true;
    await new Promise(resolve => setTimeout(resolve, 1500));
  }
  return false;
}

/**
 * Leaves the current network. Android 10+ does not let apps disconnect the
 * phone's Wi-Fi, so there this opens the Wi-Fi panel instead and returns false.
 */
export async function leaveNetwork(ssid: string | null): Promise<boolean> {
  if (Platform.OS === 'ios') {
    if (!isWifiControlAvailable) return false;
    // Only works for networks this app joined.
    if (ssid) await WifiManager.disconnectFromSSID(ssid);
    return true;
  }
  if (isAndroid10Plus || !isWifiControlAvailable) {
    await openWifiPanel();
    return false;
  }
  await WifiManager.disconnect();
  return true;
}

/** Opens Android's Wi-Fi picker (a panel over the app on Android 10+, full settings before). */
export async function openWifiPanel() {
  if (Platform.OS !== 'android') return;
  try {
    await Linking.sendIntent(
      isAndroid10Plus ? 'android.settings.panel.action.WIFI' : 'android.settings.WIFI_SETTINGS'
    );
  } catch {
    await Linking.sendIntent('android.settings.WIFI_SETTINGS');
  }
}

/** Name of the Wi-Fi network the phone is on, or null if none/unknown. */
export async function getCurrentSsid(): Promise<string | null> {
  if (!isWifiControlAvailable) return null;
  try {
    const ssid = await WifiManager.getCurrentWifiSSID();
    // Android returns "<unknown ssid>" when it can't (or isn't allowed to) read it.
    return ssid && ssid !== '<unknown ssid>' ? ssid : null;
  } catch {
    return null;
  }
}

/**
 * Wi-Fi signal strength (RSSI, in dBm) of the current network, or null where
 * it can't be read: iOS does not expose it, and Expo Go/web lack the native module.
 */
export async function getWifiSignalStrength(): Promise<number | null> {
  if (!isWifiControlAvailable || Platform.OS !== 'android') return null;
  try {
    const rssi = await WifiManager.getCurrentSignalStrength();
    // Android reports -127 when the value is unknown.
    return typeof rssi === 'number' && rssi > -127 ? rssi : null;
  } catch {
    return null;
  }
}

/** Turns library error codes into something the user can act on. */
export function describeWifiError(error: unknown): string {
  // Native rejections carry the library's code on `code`; our own throws use `message`.
  const code =
    (error as { code?: string } | null)?.code ?? (error instanceof Error ? error.message : String(error));
  const messages: Record<string, string> = {
    unavailable: 'Joining Wi-Fi from the app needs the installed app build. It does not work in Expo Go or on the web.',
    userDenied: 'The join request was cancelled.',
    locationPermissionMissing: 'Location permission is required to scan and join Wi-Fi. Allow it in Settings.',
    locationPermissionDenied: 'Location permission is required to join Wi-Fi. Allow it in Settings.',
    locationPermissionRestricted: 'Location access is restricted on this device.',
    locationServicesOff: 'Turn on Location services to scan and join Wi-Fi.',
    couldNotEnableWifi: 'Turn on Wi-Fi in your phone settings, then try again.',
    couldNotScan: 'Android limits how often apps can scan. Wait a minute and try again.',
    didNotFindNetwork: 'That network is not in range.',
    timeoutOccurred: 'Timed out joining the network. Move closer and try again.',
    invalidSSID: 'Enter the network name.',
    invalidPassphrase: 'That password is not valid. Wi-Fi passwords are 8 to 63 characters.',
    authenticationErrorOccurred: 'Wrong password. Check it and try again.',
    unableToConnect: 'Could not join the network. Check the password and that the network is in range.',
  };
  return messages[code] ?? `Could not complete the Wi-Fi request (${code}).`;
}
