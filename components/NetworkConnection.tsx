import * as Network from 'expo-network';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { fontScale, scaleSize } from '@/utils/scale';
import {
  canOpenWifiPanel,
  canScan,
  describeWifiError,
  getCurrentSsid,
  isWifiControlAvailable,
  joinNetwork,
  leaveNetwork,
  openWifiPanel,
  scanNetworks,
  type ScannedNetwork,
} from '@/utils/wifi';

const COLORS = {
  teal: '#1D7A8C',
  tealDark: '#155E6D',
  tealBg: '#E3F1F4',
  green: '#1FA971',
  amber: '#E7A825',
  amberBg: '#FDF3DD',
  red: '#EF4444',
  textDark: '#101B2D',
  textMuted: '#5B6B7C',
  white: '#FFFFFF',
  border: '#DCE4EA',
};

const s = scaleSize;
const f = fontScale;

type Busy = 'scan' | 'join' | 'leave' | null;

export default function NetworkConnection({ isLandscape }: { isLandscape: boolean }) {
  const networkState = Network.useNetworkState();
  const [currentSsid, setCurrentSsid] = useState<string | null>(null);
  const [ipAddress, setIpAddress] = useState<string | null>(null);
  const [networks, setNetworks] = useState<ScannedNetwork[]>([]);
  // The scanned secured network whose password field is open.
  const [expandedSsid, setExpandedSsid] = useState<string | null>(null);
  const [listPassword, setListPassword] = useState('');
  const [manualSsid, setManualSsid] = useState('');
  const [manualPassword, setManualPassword] = useState('');
  const [busy, setBusy] = useState<Busy>(null);
  const [message, setMessage] = useState<{ text: string; tone: 'info' | 'error' } | null>(null);

  const onWifi = networkState.type === Network.NetworkStateType.WIFI;
  const internet = networkState.isInternetReachable;

  const refreshStatus = useCallback(async () => {
    const status = await readStatus();
    setCurrentSsid(status.ssid);
    setIpAddress(status.ip);
  }, []);

  // Re-read the SSID/IP whenever the OS reports a network change.
  useEffect(() => {
    let cancelled = false;
    readStatus().then(status => {
      if (cancelled) return;
      setCurrentSsid(status.ssid);
      setIpAddress(status.ip);
    });
    return () => {
      cancelled = true;
    };
  }, [networkState.type, networkState.isConnected]);

  const run = async (kind: Exclude<Busy, null>, action: () => Promise<void>) => {
    setBusy(kind);
    setMessage(null);
    try {
      await action();
    } catch (error) {
      setMessage({ text: describeWifiError(error), tone: 'error' });
    } finally {
      setBusy(null);
    }
  };

  const handleScan = () =>
    run('scan', async () => {
      const found = await scanNetworks();
      setNetworks(found);
      setExpandedSsid(null);
      if (found.length === 0) setMessage({ text: 'No Wi-Fi networks found nearby.', tone: 'info' });
    });

  const handleJoin = (ssid: string, password: string | null) =>
    run('join', async () => {
      const name = ssid.trim();
      if (!name) throw new Error('invalidSSID');
      const result = await joinNetwork(name, password);
      await refreshStatus();
      setExpandedSsid(null);
      setListPassword('');
      setManualPassword('');
      setMessage(
        result === 'joined'
          ? { text: `Connected to "${name}".`, tone: 'info' }
          : {
              text: `"${name}" was saved. Android will switch to it shortly. If asked, allow this app to suggest networks, or pick it in the Wi-Fi panel.`,
              tone: 'info',
            }
      );
    });

  const handleLeave = () =>
    run('leave', async () => {
      const left = await leaveNetwork(currentSsid);
      await refreshStatus();
      if (left) setMessage({ text: 'Disconnected from Wi-Fi.', tone: 'info' });
    });

  const handleNetworkPress = (network: ScannedNetwork) => {
    if (!network.secured) {
      handleJoin(network.ssid, null);
      return;
    }
    setListPassword('');
    setExpandedSsid(current => (current === network.ssid ? null : network.ssid));
  };

  const statusColor = !networkState.isConnected ? COLORS.red : internet === false ? COLORS.amber : COLORS.green;
  const internetLabel = !networkState.isConnected
    ? 'Offline'
    : internet === true
      ? 'Online'
      : internet === false
        ? 'Connected, but no internet'
        : 'Checking internet…';

  return (
    <View style={styles.card}>
      <Text style={styles.title}>WI-FI</Text>
      <Text style={styles.help}>Join a Wi-Fi router or a phone hotspot to get the app online.</Text>

      <View style={styles.statusRow}>
        <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
        <View style={styles.statusText}>
          <Text style={styles.statusTitle}>
            {onWifi ? `Wi-Fi: ${currentSsid ?? 'Connected'}` : networkState.isConnected ? 'Using mobile data' : 'No network'}
          </Text>
          <Text style={styles.statusSub}>
            {internetLabel}
            {ipAddress ? ` · IP ${ipAddress}` : ''}
          </Text>
        </View>
        {canOpenWifiPanel && (
          <TouchableOpacity style={styles.outlineButton} onPress={openWifiPanel} activeOpacity={0.85}>
            <Text style={styles.outlineButtonText}>WI-FI PANEL</Text>
          </TouchableOpacity>
        )}
        {isWifiControlAvailable && onWifi && (
          <TouchableOpacity style={[styles.outlineButton, styles.leaveButton]} onPress={handleLeave} disabled={busy !== null} activeOpacity={0.85}>
            {busy === 'leave' ? <ActivityIndicator color={COLORS.red} size="small" /> : <Text style={styles.leaveButtonText}>LEAVE</Text>}
          </TouchableOpacity>
        )}
      </View>

      {!isWifiControlAvailable ? (
        <View style={styles.notice}>
          <Text style={styles.noticeText}>
            Joining Wi-Fi from inside the app needs the installed app build (it does not work in Expo Go or on the web).
            {canOpenWifiPanel
              ? ' For now, tap WI-FI PANEL to choose a network.'
              : " For now, join the network from your phone's Wi-Fi settings."}
          </Text>
        </View>
      ) : (
        <View style={[styles.body, isLandscape && styles.bodyLandscape]}>
          {canScan && (
            <View style={[styles.column, isLandscape && styles.columnLandscape]}>
              <TouchableOpacity style={styles.primaryButton} onPress={handleScan} disabled={busy !== null} activeOpacity={0.85}>
                {busy === 'scan' ? (
                  <ActivityIndicator color={COLORS.white} size="small" />
                ) : (
                  <Text style={styles.primaryButtonText}>SCAN FOR NETWORKS</Text>
                )}
              </TouchableOpacity>

              {networks.map(network => {
                const isCurrent = currentSsid === network.ssid;
                const expanded = expandedSsid === network.ssid;
                return (
                  <View key={network.ssid} style={styles.networkItem}>
                    <View style={styles.networkRow}>
                      <View style={styles.networkInfo}>
                        <Text style={styles.networkName} numberOfLines={1}>{network.ssid}</Text>
                        <Text style={styles.networkMeta}>
                          {signalLabel(network.level)} signal · {network.secured ? 'Password' : 'Open'}
                        </Text>
                      </View>
                      {isCurrent ? (
                        <Text style={styles.joinedTag}>CONNECTED</Text>
                      ) : (
                        <TouchableOpacity style={styles.joinSmall} onPress={() => handleNetworkPress(network)} disabled={busy !== null} activeOpacity={0.85}>
                          <Text style={styles.joinSmallText}>{expanded ? 'CANCEL' : 'JOIN'}</Text>
                        </TouchableOpacity>
                      )}
                    </View>

                    {expanded && (
                      <View style={styles.passwordRow}>
                        <TextInput
                          style={[styles.input, styles.inputInRow]}
                          placeholder="Password"
                          placeholderTextColor="#9AA7B4"
                          value={listPassword}
                          onChangeText={setListPassword}
                          secureTextEntry
                          autoCapitalize="none"
                          autoCorrect={false}
                          autoFocus
                          editable={busy === null}
                          onSubmitEditing={() => handleJoin(network.ssid, listPassword)}
                        />
                        <TouchableOpacity style={styles.joinButton} onPress={() => handleJoin(network.ssid, listPassword)} disabled={busy !== null} activeOpacity={0.85}>
                          {busy === 'join' ? <ActivityIndicator color={COLORS.white} size="small" /> : <Text style={styles.primaryButtonText}>JOIN</Text>}
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          )}

          <View style={[styles.column, isLandscape && styles.columnLandscape]}>
            <Text style={styles.label}>{canScan ? 'Or enter the network details' : 'Network details'}</Text>
            <TextInput
              style={styles.input}
              placeholder="Network name (SSID)"
              placeholderTextColor="#9AA7B4"
              value={manualSsid}
              onChangeText={setManualSsid}
              autoCapitalize="none"
              autoCorrect={false}
              editable={busy === null}
            />
            <TextInput
              style={styles.input}
              placeholder="Password (leave empty for open networks)"
              placeholderTextColor="#9AA7B4"
              value={manualPassword}
              onChangeText={setManualPassword}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              editable={busy === null}
              onSubmitEditing={() => handleJoin(manualSsid, manualPassword)}
            />
            <TouchableOpacity style={styles.primaryButton} onPress={() => handleJoin(manualSsid, manualPassword)} disabled={busy !== null} activeOpacity={0.85}>
              {busy === 'join' && expandedSsid === null ? (
                <ActivityIndicator color={COLORS.white} size="small" />
              ) : (
                <Text style={styles.primaryButtonText}>JOIN NETWORK</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}

      {message && (
        <Text style={[styles.message, { color: message.tone === 'error' ? COLORS.red : COLORS.tealDark }]}>{message.text}</Text>
      )}
    </View>
  );
}

async function readStatus(): Promise<{ ssid: string | null; ip: string | null }> {
  const ssid = await getCurrentSsid();
  try {
    const ip = await Network.getIpAddressAsync();
    return { ssid, ip: ip && ip !== '0.0.0.0' ? ip : null };
  } catch {
    return { ssid, ip: null };
  }
}

// Android reports RSSI in dBm: around -50 is excellent, below -80 is poor.
function signalLabel(level: number) {
  if (level >= -60) return 'Strong';
  if (level >= -75) return 'Fair';
  return 'Weak';
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.white,
    borderRadius: s(16),
    padding: s(16),
    marginBottom: s(16),
  },
  title: {
    fontSize: f(16),
    fontWeight: '800',
    color: COLORS.textDark,
    marginBottom: s(4),
  },
  help: {
    fontSize: f(12),
    lineHeight: f(17),
    color: COLORS.textMuted,
    marginBottom: s(12),
  },
  statusRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: s(8),
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: s(10),
    padding: s(10),
    marginBottom: s(12),
  },
  statusDot: {
    width: s(10),
    height: s(10),
    borderRadius: s(5),
    marginRight: s(2),
  },
  statusText: {
    flex: 1,
    minWidth: s(140),
  },
  statusTitle: {
    fontSize: f(13),
    fontWeight: '700',
    color: COLORS.textDark,
  },
  statusSub: {
    fontSize: f(11),
    color: COLORS.textMuted,
    marginTop: s(2),
  },
  outlineButton: {
    borderWidth: 1,
    borderColor: COLORS.tealDark,
    borderRadius: s(8),
    paddingHorizontal: s(12),
    paddingVertical: s(6),
    minWidth: s(64),
    alignItems: 'center',
  },
  outlineButtonText: {
    color: COLORS.tealDark,
    fontSize: f(11),
    fontWeight: '800',
  },
  leaveButton: {
    borderColor: COLORS.red,
  },
  leaveButtonText: {
    color: COLORS.red,
    fontSize: f(11),
    fontWeight: '800',
  },
  notice: {
    backgroundColor: COLORS.amberBg,
    borderRadius: s(10),
    padding: s(12),
  },
  noticeText: {
    fontSize: f(12),
    lineHeight: f(17),
    color: COLORS.textDark,
  },
  body: {
    gap: s(14),
  },
  bodyLandscape: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  column: {
    gap: s(8),
  },
  columnLandscape: {
    flex: 1,
  },
  primaryButton: {
    backgroundColor: COLORS.tealDark,
    borderRadius: s(10),
    paddingVertical: s(12),
    alignItems: 'center',
  },
  primaryButtonText: {
    color: COLORS.white,
    fontWeight: '800',
    fontSize: f(12),
    letterSpacing: 0.5,
  },
  networkItem: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingVertical: s(8),
  },
  networkRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  networkInfo: {
    flex: 1,
    marginRight: s(8),
  },
  networkName: {
    fontSize: f(13),
    fontWeight: '700',
    color: COLORS.textDark,
  },
  networkMeta: {
    fontSize: f(11),
    color: COLORS.textMuted,
  },
  joinSmall: {
    backgroundColor: COLORS.tealBg,
    borderRadius: s(8),
    paddingHorizontal: s(14),
    paddingVertical: s(6),
  },
  joinSmallText: {
    color: COLORS.tealDark,
    fontWeight: '800',
    fontSize: f(11),
  },
  joinedTag: {
    color: COLORS.green,
    fontWeight: '800',
    fontSize: f(11),
  },
  passwordRow: {
    flexDirection: 'row',
    gap: s(8),
    marginTop: s(8),
  },
  label: {
    fontSize: f(12),
    fontWeight: '700',
    color: COLORS.textDark,
  },
  inputInRow: {
    flex: 1,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: s(10),
    paddingHorizontal: s(12),
    paddingVertical: s(10),
    fontSize: f(13),
    color: COLORS.textDark,
  },
  joinButton: {
    backgroundColor: COLORS.tealDark,
    borderRadius: s(10),
    paddingHorizontal: s(18),
    justifyContent: 'center',
    minWidth: s(72),
    alignItems: 'center',
  },
  message: {
    fontSize: f(12),
    fontWeight: '600',
    marginTop: s(10),
  },
});
