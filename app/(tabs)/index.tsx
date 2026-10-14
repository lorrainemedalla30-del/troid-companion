import NetworkConnectionModal from '@/components/NetworkConnectionModal';
import VideoFeed from '@/components/VideoFeed';
import { useAssignedBot } from '@/hooks/use-assigned-bot';
import { useConnectionQuality, type SignalBars } from '@/hooks/use-connection-quality';
import { useDriveLink, type DriveDirection } from '@/hooks/use-drive-link';
import { fontScale, scaleSize } from '@/utils/scale';
import * as Network from 'expo-network';
import { LinearGradient } from 'expo-linear-gradient';
import { Battery, ChevronsDown, ChevronsUp, Radio, Settings, Wifi, WifiHigh, WifiLow, WifiOff, WifiZero } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { LayoutChangeEvent, Platform, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const COLORS = {
  slate950: '#0f172a',
  sky900: '#0c4a6e',
  cyan950: '#164e63',
  cyan400: '#22d3ee',
  emerald400: '#34d399',
  amber400: '#fbbf24',
  amber300: '#fcd34d',
  red500: '#ef4444',
  red600: '#dc2626',
  sky400: '#38bdf8',
  white: '#ffffff',
  slate900: '#0f172a',
  slate800: '#1e293b',
};

const ABSOLUTE_FILL = { position: 'absolute' as const, top: 0, left: 0, right: 0, bottom: 0 };

const s = scaleSize;
const f = fontScale;

const DRIVE_PAD_GAP = s(8);

/** Formats a telemetry value, or "--" if there is no reading. */
const fmt = (value: number | null, digits: number) => (value == null ? '--' : value.toFixed(digits));

export default function ROVControlUI() {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;
  const [bodyHeight, setBodyHeight] = useState(Math.min(width, height) * 0.6);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  // Tank-style drive: each side's pad controls its own thruster/track.
  const [leftDrive, setLeftDrive] = useState<DriveDirection>('stop');
  const [rightDrive, setRightDrive] = useState<DriveDirection>('stop');
  // Sends both sides to the Pi, which drives the motors.
  useDriveLink(leftDrive, rightDrive);
  const [wifiPanelOpen, setWifiPanelOpen] = useState(false);
  // "Connected" means the phone (and so the app) is online, through Wi-Fi or mobile data.
  const networkState = Network.useNetworkState();
  const isConnected = networkState.isConnected === true && networkState.isInternetReachable !== false;
  const quality = useConnectionQuality(isConnected, networkState.type === Network.NetworkStateType.WIFI);
  // The operator's robot, as the TROID system last heard from it (its heartbeats).
  const bot = useAssignedBot();
  const battery = bot?.battery ?? null;
  const botLabel = bot === undefined ? '…' : bot === null ? 'NO ROBOT' : bot.label;
  const botColor = bot ? (bot.isOnline ? COLORS.emerald400 : COLORS.red500) : 'rgba(255,255,255,0.5)';

  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedSeconds(s => s + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleDrive = (side: 'left' | 'right', direction: DriveDirection) => {
    (side === 'left' ? setLeftDrive : setRightDrive)(direction);
  };


  const openWifiPanel = () => setWifiPanelOpen(true);

  // Green = online. Red = offline, or on a network that has no internet.
  const statusLabel = isConnected
    ? 'CONNECTED'
    : networkState.isConnected
      ? 'NO INTERNET'
      : 'DISCONNECTED';
  const statusColor = isConnected ? COLORS.emerald400 : COLORS.red500;

  const formatTime = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  // Connection quality colour for the signal bars and the timer dot.
  const getSignalColor = () => {
    if (!isConnected) return COLORS.red500;
    if (quality.label === 'CHECKING') return 'rgba(255,255,255,0.6)';
    if (quality.label === 'GOOD') return COLORS.emerald400;
    if (quality.label === 'FAIR') return COLORS.amber400;
    return COLORS.red500;
  };

  // Wi-Fi icon: green when online, red on a network without internet, dim when off.
  const wifiIconColor = isConnected
    ? COLORS.emerald400
    : networkState.isConnected
      ? COLORS.red500
      : 'rgba(255,255,255,0.4)';

  const batteryLow = battery != null && battery <= 20;

  // Each pad is a Forward button stacked on a Backward button, one pad at each
  // side of the bottom of the screen.
  const usableWidth = width - insets.left - insets.right;
  const sideColumnWidth = s(156);
  const driveButtonHeight = Math.round(
    isLandscape
      ? Math.max(s(44), Math.min(s(80), (bodyHeight - DRIVE_PAD_GAP) / 2))
      : Math.max(s(44), Math.min(s(72), bodyHeight * 0.13))
  );
  const padWidth = isLandscape
    ? sideColumnWidth
    : Math.min(s(160), (usableWidth - s(24)) / 2);

  const onBodyLayout = (e: LayoutChangeEvent) => setBodyHeight(e.nativeEvent.layout.height);

  const leftPad = (
    <DrivePad width={padWidth} buttonHeight={driveButtonHeight} stacked={!isLandscape} direction={leftDrive} onChange={d => handleDrive('left', d)} />
  );

  const rightPad = (
    <DrivePad width={padWidth} buttonHeight={driveButtonHeight} stacked={!isLandscape} direction={rightDrive} onChange={d => handleDrive('right', d)} />
  );

  return (
    <View style={styles.outer}>
      <NetworkConnectionModal visible={wifiPanelOpen} onClose={() => setWifiPanelOpen(false)} isLandscape={isLandscape} />
      <View style={styles.dashboard}>
        <View style={styles.backgroundGradient}>
          <LinearGradient colors={[COLORS.sky900, COLORS.cyan950, COLORS.slate950]} style={ABSOLUTE_FILL} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}>
            <LinearGradient colors={['rgba(34,211,238,0.2)', 'transparent', 'rgba(0,0,0,0.6)']} style={ABSOLUTE_FILL} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} />
          </LinearGradient>
        </View>

        {/* Live camera feed from the Pi relay, behind the controls. */}
        <VideoFeed style={ABSOLUTE_FILL} />
        <LinearGradient
          pointerEvents="none"
          colors={['rgba(0,0,0,0.45)', 'transparent', 'transparent', 'rgba(0,0,0,0.55)']}
          locations={[0, 0.2, 0.65, 1]}
          style={ABSOLUTE_FILL}
        />

        <View
          style={[
            styles.content,
            {
              paddingTop: s(10) + insets.top,
              paddingLeft: s(16) + insets.left,
              paddingRight: s(16) + insets.right,
            },
          ]}
        >
          <View style={styles.topBar}>
            <View style={styles.topBarLeft}>
              <View style={styles.pill}>
                <View style={[styles.dot, { backgroundColor: statusColor, shadowColor: statusColor }]} />
                <Text style={[styles.connectedText, { color: statusColor }]}>{statusLabel}</Text>
              </View>
              <View style={styles.pill}>
                <View style={[styles.dot, { backgroundColor: getSignalColor(), shadowColor: getSignalColor() }]} />
                <Text style={styles.timerText}>{formatTime(elapsedSeconds)}</Text>
              </View>
            </View>

            <View style={styles.topBarRight}>
              {/* Wi-Fi/connection indicator: always visible, tap to open the Wi-Fi panel. */}
              <Pressable style={styles.statusPill} onPress={openWifiPanel}>
                {isConnected ? (
                  <WifiStrengthIcon bars={quality.bars} color={wifiIconColor} />
                ) : (
                  <WifiOff size={s(16)} color={wifiIconColor} />
                )}
                <Text style={[styles.signalText, { color: getSignalColor() }]}>{quality.label}</Text>
              </Pressable>
              {isConnected ? (
                <>
                  {/* Assigned robot: green while it is sending heartbeats, red when offline. */}
                  <StatusPill>
                    <Radio size={s(16)} color={botColor} />
                    <Text style={[styles.whiteText, { color: botColor }]}>{botLabel}</Text>
                  </StatusPill>
                  <StatusPill>
                    <Battery size={s(16)} color={batteryLow ? COLORS.red500 : 'rgba(255,255,255,0.8)'} />
                    <Text style={[styles.whiteText, { color: batteryLow ? COLORS.red500 : COLORS.white }]}>{fmt(battery, 0)}%</Text>
                  </StatusPill>
                  <Pressable style={styles.iconButton} onPress={openWifiPanel}>
                    <Settings size={s(18)} color="rgba(255,255,255,0.9)" />
                  </Pressable>
                </>
              ) : (
                <Pressable style={styles.connectButton} onPress={openWifiPanel}>
                  <Text style={styles.connectButtonText}>CONNECT</Text>
                </Pressable>
              )}
            </View>
          </View>

          <View style={styles.body} onLayout={onBodyLayout}>
            <View style={styles.driveRow}>
              {leftPad}
              {rightPad}
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}

function StatusPill({ children }: { children: React.ReactNode }) {
  return (
    <View style={styles.statusPill}>
      {children}
    </View>
  );
}

// Wi-Fi icons with 0-3 arcs lit, from weakest to strongest.
const WIFI_STRENGTH_ICONS = [WifiZero, WifiLow, WifiHigh, Wifi] as const;

/**
 * Wi-Fi icon whose arcs fill in with connection strength, like a phone's
 * status bar: the full icon is drawn faintly underneath, and the lit arcs on top.
 */
function WifiStrengthIcon({ bars, color }: { bars: SignalBars; color: string }) {
  // 4 bars = all 3 arcs, 3 = two arcs, 2 = one arc, 0-1 = dot only.
  const Lit = WIFI_STRENGTH_ICONS[Math.max(0, bars - 1)];
  return (
    <View style={styles.wifiIcon}>
      <Wifi size={s(16)} color="rgba(255,255,255,0.2)" />
      <View style={StyleSheet.absoluteFill}>
        <Lit size={s(16)} color={color} />
      </View>
    </View>
  );
}

// Hold a button to drive that way; releasing it stops that side.
function DrivePad({
  width,
  buttonHeight,
  stacked,
  direction,
  onChange,
}: {
  width: number;
  buttonHeight: number;
  /** Put the label under the icon, for narrow pads. */
  stacked: boolean;
  direction: DriveDirection;
  onChange: (direction: DriveDirection) => void;
}) {
  return (
    <View style={[styles.drivePad, { width }]}>
      <DriveButton
        height={buttonHeight}
        stacked={stacked}
        label="FORWARD"
        icon={<ChevronsUp size={s(28)} color={direction === 'forward' ? COLORS.sky400 : COLORS.white} />}
        active={direction === 'forward'}
        onPressIn={() => onChange('forward')}
        onPressOut={() => onChange('stop')}
      />
      <DriveButton
        height={buttonHeight}
        stacked={stacked}
        label="BACKWARD"
        icon={<ChevronsDown size={s(28)} color={direction === 'backward' ? COLORS.sky400 : COLORS.white} />}
        active={direction === 'backward'}
        onPressIn={() => onChange('backward')}
        onPressOut={() => onChange('stop')}
      />
    </View>
  );
}

function DriveButton({
  height,
  stacked,
  label,
  icon,
  active,
  onPressIn,
  onPressOut,
}: {
  height: number;
  stacked: boolean;
  label: string;
  icon: React.ReactNode;
  active: boolean;
  onPressIn: () => void;
  onPressOut: () => void;
}) {
  // Gesture-handler tracks each finger on its own, so both pads can be held at
  // once (React Native's Pressable only allows one touch at a time).
  const hold =
    Platform.OS === 'ios'
      ? // iOS: LongPress with minDuration(0) never fires, so react to raw touches
        // instead. Release is handled on the touch itself, not only in
        // onFinalize, which may never come if the gesture didn't activate in
        // time - that left the button (and the motor) stuck on.
        Gesture.Manual()
          .runOnJS(true)
          .onTouchesDown((_e, manager) => {
            manager.activate();
            onPressIn();
          })
          .onTouchesUp((_e, manager) => {
            onPressOut();
            manager.end();
          })
          .onTouchesCancelled((_e, manager) => {
            onPressOut();
            manager.fail();
          })
          .onFinalize(onPressOut)
      : // Android (and web): minDuration(0) makes LongPress a "hold" that
        // begins on touch down and finalizes on release.
        Gesture.LongPress()
          .minDuration(0)
          .maxDistance(10000)
          .runOnJS(true)
          .onBegin(onPressIn)
          .onFinalize(onPressOut);

  return (
    <GestureDetector gesture={hold}>
      <View style={[styles.driveButton, { height }, stacked && styles.driveButtonStacked, active && styles.driveButtonActive]}>
        {icon}
        <Text style={[styles.driveLabel, { color: active ? COLORS.sky400 : 'rgba(255,255,255,0.7)' }]}>{label}</Text>
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  outer: {
    flex: 1,
    backgroundColor: COLORS.slate950,
  },
  dashboard: {
    flex: 1,
    overflow: 'hidden',
  },
  backgroundGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: COLORS.slate950,
  },
  content: {
    flex: 1,
    paddingBottom: s(10),
    gap: s(10),
  },
  topBar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    rowGap: s(8),
  },
  topBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(8),
  },
  topBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(8),
  },
  iconButton: {
    width: s(36),
    height: s(36),
    borderRadius: s(18),
    backgroundColor: 'rgba(0,0,0,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  connectButton: {
    backgroundColor: COLORS.emerald400,
    borderRadius: s(20),
    paddingHorizontal: s(16),
    paddingVertical: s(8),
    alignItems: 'center',
    justifyContent: 'center',
  },
  connectButtonText: {
    color: COLORS.slate950,
    fontSize: f(12),
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(8),
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: s(20),
    paddingLeft: s(12),
    paddingRight: s(16),
    paddingVertical: s(8),
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  dot: {
    width: s(8),
    height: s(8),
    borderRadius: s(4),
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: s(4),
  },
  connectedText: {
    fontSize: f(10),
    fontWeight: '700',
  },
  timerText: {
    color: COLORS.white,
    fontSize: f(12),
    fontWeight: '500',
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: s(20),
    paddingHorizontal: s(12),
    paddingVertical: s(8),
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    gap: s(4),
  },
  whiteText: {
    color: COLORS.white,
    fontSize: f(12),
    fontWeight: '600',
    marginLeft: s(4),
  },
  wifiIcon: {
    width: s(16),
    height: s(16),
  },
  signalText: {
    fontSize: f(11),
    fontWeight: '600',
    marginLeft: s(2),
  },
  body: {
    flex: 1,
  },
  driveRow: {
    marginTop: 'auto',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  drivePad: {
    gap: DRIVE_PAD_GAP,
  },
  driveButton: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: s(16),
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: s(6),
  },
  driveButtonStacked: {
    flexDirection: 'column',
    gap: s(2),
  },
  driveButtonActive: {
    backgroundColor: 'rgba(56,189,248,0.18)',
    borderColor: 'rgba(56,189,248,0.6)',
  },
  driveLabel: {
    fontSize: f(12),
    fontWeight: '700',
    letterSpacing: 1,
  },
});
