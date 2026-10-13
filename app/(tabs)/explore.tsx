import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
} from 'react-native';
import * as Network from 'expo-network';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';
import { useIsLandscape } from '@/hooks/use-is-landscape';
import UserManual from '@/components/UserManual';
import NetworkConnection from '@/components/NetworkConnection';
import { useTaskSync } from '@/contexts/TaskSyncContext';
import type { SyncResult, TaskStatus } from '@/utils/task-status-sync';
import { scaleSize, fontScale } from '@/utils/scale';
type SidebarTab = 'connection' | 'task' | 'manual' | 'logout';

const COLORS = {
  navy: '#0B1220',
  navyCard: '#101B2D',
  navyCardActive: '#12283F',
  border: '#1E3A55',
  teal: '#1D7A8C',
  tealDark: '#155E6D',
  green: '#1FA971',
  greenBg: '#E6F6EF',
  greenBorder: '#B7E4CE',
  amber: '#E7A825',
  amberBg: '#FDF3DD',
  amberBorder: '#F3DFA9',
  blue: '#4C7FDA',
  blueBg: '#EAF0FC',
  blueBorder: '#C9D9F5',
  textDark: '#101B2D',
  textMuted: '#5B6B7C',
  white: '#FFFFFF',
  bg: '#EAF2F8',
  red: '#EF4444',
  redBg: '#FEF2F2',
  redBorder: '#FECACA',
};

const s = scaleSize;
const f = fontScale;

export default function AquaBotDashboard() {
  const { logout } = useAuth();
  const insets = useSafeAreaInsets();
  const isLandscape = useIsLandscape();
  const [status, setStatus] = useState<TaskStatus>('completed');
  const [notes, setNotes] = useState('');
  const [activeTab, setActiveTab] = useState<SidebarTab>('connection');
  const taskSync = useTaskSync();
  const [submitting, setSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState<{ text: string; tone: Tone } | null>(null);
  const networkState = Network.useNetworkState();
  const isOnline = networkState.isConnected === true && networkState.isInternetReachable !== false;

  const handleUpdateStatus = async () => {
    setSubmitting(true);
    setSubmitMessage(null);
    try {
      const result = await taskSync.submitUpdate({ status, notes });
      setNotes('');
      setSubmitMessage(describeSyncResult(result));
    } catch {
      setSubmitMessage({ text: 'Could not save the update on this phone. Please try again.', tone: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleRetry = async () => {
    const result = await taskSync.retryNow();
    setSubmitMessage(describeSyncResult(result));
  };

  const handleNavPress = (tab: SidebarTab) => {
    if (tab === 'logout') {
      handleLogout();
    } else {
      setActiveTab(tab);
    }
  };

  const handleLogout = () => {
    const unsent = taskSync.pending.length;
    const message =
      unsent > 0
        ? `${unsent} status update${unsent === 1 ? ' has' : 's have'} not been sent yet. ${unsent === 1 ? 'It stays' : 'They stay'} on this phone and will be sent the next time you log in. Logout anyway?`
        : 'Are you sure you want to logout?';
    Alert.alert('Logout', message, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Yes',
        onPress: () => {
          setActiveTab('connection');
          // The root layout's protected routes switch to the login page.
          logout();
        },
      },
    ]);
  };

  return (
    <View style={[styles.screen, !isLandscape && styles.screenPortrait]}>
      {/* Landscape: vertical sidebar on the left. Portrait: horizontal strip across the top. */}
      <ScrollView
        horizontal={!isLandscape}
        style={[
          isLandscape ? styles.sidebar : styles.sidebarPortrait,
          { paddingLeft: insets.left },
        ]}
        contentContainerStyle={[
          isLandscape ? styles.sidebarContent : styles.sidebarContentPortrait,
          { paddingTop: (isLandscape ? s(16) : s(10)) + insets.top },
        ]}
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
      >
        <View style={[styles.brand, !isLandscape && styles.inlinePortrait]}>
          <View style={styles.brandIcon}>
            <Text style={styles.brandTitle}>AQUABOT</Text>
          </View>
          <Text style={styles.brandSubtitle}>TRASH COLLECTOR</Text>
        </View>

        <TouchableOpacity
          style={[
            styles.navItem,
            !isLandscape && styles.inlinePortrait,
            activeTab === 'connection' ? styles.navItemActive : null,
          ]}
          onPress={() => handleNavPress('connection')}
        >
          <Text style={activeTab === 'connection' ? styles.navLabelActive : styles.navLabel}>
            WI-FI CONNECTION
          </Text>
          <Text style={isOnline ? styles.navStatusOk : styles.navStatusErr}>
            {isOnline ? 'Online' : 'Offline'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.navItem,
            !isLandscape && styles.inlinePortrait,
            activeTab === 'task' ? styles.navItemActive : null,
          ]}
          onPress={() => handleNavPress('task')}
        >
          <Text style={activeTab === 'task' ? styles.navLabelActive : styles.navLabel}>
            TASK STATUS
          </Text>
          <Text style={styles.navSub}>Update Status</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.navItem,
            !isLandscape && styles.inlinePortrait,
            activeTab === 'manual' ? styles.navItemActive : null,
          ]}
          onPress={() => handleNavPress('manual')}
        >
          <Text style={activeTab === 'manual' ? styles.navLabelActive : styles.navLabel}>
            USER MANUAL
          </Text>
          <Text style={styles.navSub}>How to use the app</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.navItem,
            !isLandscape && styles.inlinePortrait,
            activeTab === 'logout' ? styles.navItemActive : null,
          ]}
          onPress={() => handleNavPress('logout')}
        >
          <Text style={activeTab === 'logout' ? styles.navLabelActive : styles.navLabel}>
            LOGOUT
          </Text>
          <Text style={styles.navSub}>Sign out of account</Text>
        </TouchableOpacity>

        <View style={[styles.sidebarFooter, !isLandscape && styles.inlinePortrait]}>
          <View style={styles.avatar}>
            <Text style={{ color: COLORS.white, fontSize: f(14) }}>OP</Text>
          </View>
          <View style={[styles.opTextWrap, !isLandscape && styles.fillPortrait]}>
            <Text style={styles.opName}>Operator</Text>
            <Text style={styles.opRole} numberOfLines={1}>AquaBot Operator</Text>
            <Text style={isOnline ? styles.opOnline : styles.opOffline}>
              {isOnline ? 'Online' : 'Offline'}
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Android draws edge-to-edge, so it no longer shrinks the screen for the
          keyboard; padding lifts the content above it on both platforms. */}
      <KeyboardAvoidingView style={styles.main} behavior="padding">
        <ScrollView
          contentContainerStyle={[
            styles.mainContent,
            {
              // In portrait the top strip already clears the status bar.
              paddingTop: s(16) + (isLandscape ? insets.top : 0),
              paddingLeft: s(20) + (isLandscape ? 0 : insets.left),
              paddingRight: s(20) + insets.right,
            },
          ]}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.topBar}>
            <Text style={styles.menuIcon}>≡</Text>
            <View style={styles.topBarRight}>
              <Text style={styles.topBarText}>
                {activeTab === 'connection' ? (isOnline ? 'Online' : 'No Connection') : ''}
              </Text>
            </View>
          </View>

          <Text style={styles.hello}>Hello, Operator!</Text>
          <Text style={styles.subtitle}>
            {activeTab === 'connection'
              ? isOnline
                ? 'You are online.'
                : 'Connect to a Wi-Fi router or hotspot to get online.'
              : activeTab === 'task'
                ? 'Update the current status of the operation.'
                : activeTab === 'manual'
                  ? 'Everything you need to know to operate the AquaBot.'
                  : ''}
          </Text>

          {activeTab === 'manual' && <UserManual isLandscape={isLandscape} />}

          {activeTab === 'connection' && <NetworkConnection isLandscape={isLandscape} />}

          {activeTab === 'task' && (
            <View style={styles.taskCard}>
              <Text style={styles.taskTitle}>TASK STATUS</Text>
              <Text style={styles.taskSubtitle}>
                Update the current status of the operation.
              </Text>

              <View style={[styles.taskColumns, !isLandscape && styles.stackPortrait]}>
                <View style={[styles.taskOptions, !isLandscape && styles.fillPortrait]}>
                  <StatusOption
                    icon="✓"
                    iconBg={COLORS.green}
                    title="TASK COMPLETED"
                    description="The task has been completed successfully."
                    selected={status === 'completed'}
                    bg={COLORS.greenBg}
                    border={COLORS.greenBorder}
                    onPress={() => setStatus('completed')}
                  />
                  <StatusOption
                    icon="❚❚"
                    iconBg={COLORS.amber}
                    title="TO BE CONTINUED"
                    description="The task is partially done and will continue later."
                    selected={status === 'to_be_continued'}
                    bg={COLORS.amberBg}
                    border={COLORS.amberBorder}
                    onPress={() => setStatus('to_be_continued')}
                  />
                  <StatusOption
                    icon="🕐"
                    iconBg={COLORS.blue}
                    title="IN PROGRESS"
                    description="The task is currently in progress."
                    selected={status === 'in_progress'}
                    bg={COLORS.blueBg}
                    border={COLORS.blueBorder}
                    onPress={() => setStatus('in_progress')}
                  />
                </View>

                <View style={[styles.taskNotes, !isLandscape && styles.fillPortrait]}>
                  <Text style={styles.notesLabel}>Notes (Optional)</Text>
                  <TextInput
                    style={styles.notesInput}
                    placeholder="Add notes about the task..."
                    placeholderTextColor="#9AA7B4"
                    value={notes}
                    onChangeText={setNotes}
                    multiline
                  />

                  <TouchableOpacity
                    style={[styles.updateButton, submitting && styles.updateButtonBusy]}
                    activeOpacity={0.85}
                    onPress={handleUpdateStatus}
                    disabled={submitting}
                  >
                    {submitting ? (
                      <ActivityIndicator color={COLORS.white} size="small" />
                    ) : (
                      <Text style={styles.updateButtonText}>UPDATE STATUS</Text>
                    )}
                  </TouchableOpacity>

                  {submitMessage && (
                    <Text style={[styles.syncMessage, { color: TONE_COLORS[submitMessage.tone] }]}>
                      {submitMessage.text}
                    </Text>
                  )}

                  {taskSync.pending.length > 0 && (
                    <View style={styles.syncRow}>
                      <Text style={styles.syncInfo}>
                        {taskSync.pending.length} update{taskSync.pending.length === 1 ? '' : 's'} waiting to send
                      </Text>
                      <TouchableOpacity onPress={handleRetry} disabled={submitting}>
                        <Text style={styles.syncAction}>RETRY NOW</Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  {taskSync.failed.length > 0 && (
                    <View style={styles.syncRow}>
                      <Text style={[styles.syncInfo, { color: COLORS.red }]}>
                        {taskSync.failed.length} update{taskSync.failed.length === 1 ? ' was' : 's were'} rejected by the server:{' '}
                        {taskSync.failed[0].failedReason}
                      </Text>
                      <TouchableOpacity onPress={taskSync.dismissFailed}>
                        <Text style={styles.syncAction}>DISMISS</Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  {taskSync.pending.length === 0 && taskSync.lastSentAt && (
                    <Text style={styles.syncInfo}>
                      Last update sent at {taskSync.lastSentAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  )}
                </View>
              </View>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

type Tone = 'success' | 'warning' | 'error';

const TONE_COLORS: Record<Tone, string> = {
  success: COLORS.green,
  warning: '#B7791F',
  error: COLORS.red,
};

function describeSyncResult(result: SyncResult): { text: string; tone: Tone } {
  switch (result.kind) {
    case 'sent':
    case 'idle':
      return { text: 'Status update sent.', tone: 'success' };
    case 'offline':
      return {
        text: 'No connection right now. The update is saved on this phone and will be sent automatically when you are back online.',
        tone: 'warning',
      };
    case 'config-error':
      return { text: `Saved on this phone, but not sent: ${result.message}`, tone: 'error' };
  }
}

function StatusOption({
  icon,
  iconBg,
  title,
  description,
  selected,
  bg,
  border,
  onPress,
}: {
  icon: string;
  iconBg: string;
  title: string;
  description: string;
  selected: boolean;
  bg: string;
  border: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.option, { backgroundColor: bg, borderColor: border }]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={[styles.optionIcon, { backgroundColor: iconBg }]}>
        <Text style={{ color: COLORS.white, fontWeight: '700', fontSize: f(13) }}>{icon}</Text>
      </View>
      <View style={styles.optionTextWrap}>
        <Text style={styles.optionTitle}>{title}</Text>
        <Text style={styles.optionDescription}>{description}</Text>
      </View>
      <View style={styles.radioOuter}>
        {selected && <View style={styles.radioInner} />}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: COLORS.bg,
  },
  // Sidebar
  sidebar: {
    width: s(220),
    flexGrow: 0,
    backgroundColor: COLORS.navy,
  },
  sidebarContent: {
    flexGrow: 1,
    paddingHorizontal: s(14),
  },
  // Portrait overrides
  screenPortrait: {
    flexDirection: 'column',
  },
  sidebarPortrait: {
    flexGrow: 0,
    backgroundColor: COLORS.navy,
  },
  sidebarContentPortrait: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(8),
    paddingHorizontal: s(14),
    paddingBottom: s(10),
  },
  inlinePortrait: {
    marginTop: 0,
    marginBottom: 0,
  },
  stackPortrait: {
    flexDirection: 'column',
  },
  fillPortrait: {
    flex: 0,
  },
  brand: {
    alignItems: 'center',
    marginBottom: s(14),
  },
  brandIcon: {
    paddingHorizontal: s(14),
    paddingVertical: s(8),
    borderRadius: s(20),
    backgroundColor: COLORS.navyCard,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: s(4),
  },
  brandTitle: {
    color: COLORS.white,
    fontWeight: '800',
    fontSize: f(13),
    letterSpacing: 0.5,
  },
  brandSubtitle: {
    color: COLORS.teal,
    fontSize: f(9),
    letterSpacing: 0.5,
    marginTop: s(2),
  },
  navItem: {
    backgroundColor: COLORS.navyCard,
    borderRadius: s(10),
    paddingVertical: s(9),
    paddingHorizontal: s(12),
    marginBottom: s(8),
    borderWidth: 1,
    borderColor: 'transparent',
    alignItems: 'center',
  },
  navItemActive: {
    backgroundColor: COLORS.navyCardActive,
    borderColor: COLORS.teal,
  },
  navLabel: {
    color: '#8FA3B5',
    fontSize: f(11),
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: s(4),
  },
  navLabelActive: {
    color: COLORS.white,
    fontSize: f(11),
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: s(4),
  },
  navSub: {
    color: '#8FA3B5',
    fontSize: f(9),
    textAlign: 'center',
  },
  navStatusOk: {
    color: COLORS.green,
    fontSize: f(9),
    fontWeight: '600',
    textAlign: 'center',
  },
  navStatusErr: {
    color: COLORS.red,
    fontSize: f(9),
    fontWeight: '600',
    textAlign: 'center',
  },
  sidebarFooter: {
    marginTop: 'auto',
    marginBottom: s(12),
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.navyCard,
    borderRadius: s(10),
    padding: s(10),
  },
  avatar: {
    width: s(34),
    height: s(34),
    borderRadius: s(17),
    backgroundColor: COLORS.teal,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: s(10),
  },
  opTextWrap: {
    flex: 1,
  },
  opName: {
    color: COLORS.white,
    fontWeight: '700',
    fontSize: f(11),
  },
  opRole: {
    color: '#8FA3B5',
    fontSize: f(9),
    marginBottom: s(2),
  },
  opOnline: {
    color: COLORS.green,
    fontSize: f(9),
  },
  opOffline: {
    color: COLORS.red,
    fontSize: f(9),
  },
  // Main
  main: {
    flex: 1,
  },
  mainContent: {
    paddingLeft: s(20),
    paddingBottom: s(24),
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: s(8),
  },
  menuIcon: {
    fontSize: f(24),
    color: COLORS.textDark,
  },
  topBarRight: {},
  topBarText: {
    fontSize: f(13),
    color: COLORS.textDark,
  },
  hello: {
    fontSize: f(24),
    fontWeight: '800',
    color: COLORS.textDark,
  },
  subtitle: {
    fontSize: f(13),
    color: COLORS.textMuted,
    marginBottom: s(16),
  },
  // Task card
  taskCard: {
    backgroundColor: COLORS.white,
    borderRadius: s(16),
    padding: s(20),
  },
  taskTitle: {
    fontSize: f(18),
    fontWeight: '800',
    color: COLORS.textDark,
  },
  taskSubtitle: {
    fontSize: f(12),
    color: COLORS.textMuted,
    marginBottom: s(16),
  },
  taskColumns: {
    flexDirection: 'row',
    gap: s(16),
  },
  taskOptions: {
    flex: 1.2,
  },
  taskNotes: {
    flex: 1,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: s(12),
    padding: s(14),
    marginBottom: s(12),
  },
  optionIcon: {
    width: s(34),
    height: s(34),
    borderRadius: s(17),
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: s(12),
  },
  optionTextWrap: {
    flex: 1,
  },
  optionTitle: {
    fontSize: f(13),
    fontWeight: '800',
    color: COLORS.textDark,
    marginBottom: s(2),
  },
  optionDescription: {
    fontSize: f(11),
    color: COLORS.textMuted,
  },
  radioOuter: {
    width: s(20),
    height: s(20),
    borderRadius: s(10),
    borderWidth: 2,
    borderColor: COLORS.green,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioInner: {
    width: s(10),
    height: s(10),
    borderRadius: s(5),
    backgroundColor: COLORS.green,
  },
  notesLabel: {
    fontSize: f(12),
    fontWeight: '700',
    color: COLORS.textDark,
    marginTop: s(4),
    marginBottom: s(8),
  },
  notesInput: {
    borderWidth: 1,
    borderColor: '#DCE4EA',
    borderRadius: s(10),
    padding: s(12),
    minHeight: s(120),
    textAlignVertical: 'top',
    fontSize: f(13),
    color: COLORS.textDark,
    marginBottom: s(16),
  },
  updateButton: {
    backgroundColor: COLORS.tealDark,
    borderRadius: s(10),
    paddingVertical: s(16),
    alignItems: 'center',
  },
  updateButtonBusy: {
    opacity: 0.7,
  },
  syncMessage: {
    fontSize: f(12),
    fontWeight: '600',
    lineHeight: f(17),
    marginTop: s(10),
  },
  syncRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: s(10),
    marginTop: s(8),
  },
  syncInfo: {
    flex: 1,
    fontSize: f(11),
    lineHeight: f(16),
    color: COLORS.textMuted,
    marginTop: s(8),
  },
  syncAction: {
    fontSize: f(11),
    fontWeight: '800',
    color: COLORS.tealDark,
    marginTop: s(8),
  },
  updateButtonText: {
    color: COLORS.white,
    fontWeight: '800',
    fontSize: f(13),
    letterSpacing: 0.5,
  },
});
