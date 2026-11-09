import { useAuth } from '@/contexts/AuthContext';
import { formatDriveMoment, formatScheduleDay, formatScheduleTime } from '@/utils/drive-format';
import { ApiError, fetchAssignedRequest, startCleanupDrive, type DriveRequest } from '@/utils/troid-api';
import { fontScale, scaleSize } from '@/utils/scale';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as ScreenOrientation from 'expo-screen-orientation';
import { ArrowLeft, Play } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const s = scaleSize;
const f = fontScale;

const COLORS = {
  navy: '#0B1220',
  navyCard: '#101B2D',
  border: '#1E3A55',
  sky: '#38bdf8',
  green: '#1FA971',
  muted: 'rgba(255,255,255,0.6)',
  white: '#FFFFFF',
  red: '#F87171',
};

function Field({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Text style={styles.fieldValue}>{value || '—'}</Text>
    </View>
  );
}

/** Overview of one assigned cleanup, with the button that starts the drive. */
export default function RequestOverviewScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [request, setRequest] = useState<DriveRequest | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  // The clock in the confirmation: this is when the drive will be logged as started.
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    if (!session || !id) return;
    let cancelled = false;
    fetchAssignedRequest(session, id).then(
      next => {
        if (!cancelled) setRequest(next);
      },
      (e: unknown) => {
        if (!cancelled) setLoadError(e instanceof ApiError ? e.message : 'Could not load this request.');
      }
    );
    return () => {
      cancelled = true;
    };
  }, [session, id]);

  useEffect(() => {
    if (!confirming) return;
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, [confirming]);

  const goToControls = async () => {
    try {
      await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
    } catch {
      // Not supported here (e.g. a web browser): the controls still work.
    }
    // The controls release the lock when the operator leaves them.
    router.dismissTo('/controls');
  };

  const openConfirm = () => {
    setStartError(null);
    setNow(new Date());
    setConfirming(true);
  };

  const confirmStart = async () => {
    if (!session || !request) return;
    setStarting(true);
    setStartError(null);
    try {
      await startCleanupDrive(session, request.id);
      setConfirming(false);
      await goToControls();
    } catch (e) {
      setStartError(e instanceof ApiError ? e.message : 'Could not start the drive. Try again.');
    } finally {
      setStarting(false);
    }
  };

  const ongoing = request?.status === 'ongoing';

  return (
    <View style={[styles.screen, { paddingTop: insets.top + s(8) }]}>
      <View style={styles.header}>
        <Pressable accessibilityRole="button" accessibilityLabel="Back" hitSlop={s(10)} onPress={() => router.back()}>
          <ArrowLeft size={s(24)} color={COLORS.white} />
        </Pressable>
        <Text style={styles.headerTitle}>Request Overview</Text>
      </View>

      {!request ? (
        loadError ? (
          <Text style={styles.error}>{loadError}</Text>
        ) : (
          <ActivityIndicator style={styles.spinner} color={COLORS.sky} size="large" />
        )
      ) : (
        <>
          <ScrollView contentContainerStyle={styles.content}>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Request Document</Text>
              <Field label="Request ID" value={request.id} />
              <Field label="Type" value={request.type} />
              <Field label="Requested by" value={request.requestedBy} />
              <Field label="Letter of request" value={request.letterFileName} />
              <Field label="Notes" value={request.notes} />
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Schedule</Text>
              <Field label="Date" value={formatScheduleDay(request.scheduleDay)} />
              <Field label="Time" value={formatScheduleTime(request.scheduleTime)} />
              {request.driveStartedAt && (
                <Field label="Drive started" value={formatDriveMoment(new Date(request.driveStartedAt))} />
              )}
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Location</Text>
              <Field label="Barangay" value={request.barangay} />
              <Field label="Site" value={request.locationName} />
              <Field label="Zone" value={request.zone} />
              <Field label="Municipality" value={[request.municipality, request.province].filter(Boolean).join(', ')} />
            </View>
          </ScrollView>

          <View style={[styles.footer, { paddingBottom: insets.bottom + s(12) }]}>
            <Pressable
              accessibilityRole="button"
              onPress={ongoing ? goToControls : openConfirm}
              style={({ pressed }) => [styles.startButton, pressed && styles.pressed]}
            >
              <Play size={s(18)} color={COLORS.white} fill={COLORS.white} />
              <Text style={styles.startText}>{ongoing ? 'CONTINUE CLEANUP DRIVE' : 'START CLEANUP DRIVE'}</Text>
            </Pressable>
          </View>
        </>
      )}

      <Modal
        visible={confirming}
        transparent
        animationType="fade"
        supportedOrientations={['portrait', 'landscape']}
        onRequestClose={() => !starting && setConfirming(false)}
      >
        <View style={styles.backdrop}>
          <View style={styles.dialog}>
            <Text style={styles.dialogTitle}>Start this cleanup drive?</Text>
            <Text style={styles.dialogText}>
              {request?.id} will be marked Ongoing, and the robot&apos;s detections will be recorded against it.
            </Text>
            <Text style={styles.startsLabel}>The drive starts</Text>
            <Text style={styles.startsValue}>{formatDriveMoment(now)}</Text>
            {startError && <Text style={styles.dialogError}>{startError}</Text>}
            <View style={styles.dialogButtons}>
              <Pressable
                accessibilityRole="button"
                disabled={starting}
                onPress={() => setConfirming(false)}
                style={({ pressed }) => [styles.dialogButton, styles.cancelButton, pressed && styles.pressed]}
              >
                <Text style={styles.cancelText}>CANCEL</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                disabled={starting}
                onPress={confirmStart}
                style={({ pressed }) => [styles.dialogButton, styles.confirmButton, (pressed || starting) && styles.pressed]}
              >
                {starting ? (
                  <ActivityIndicator color={COLORS.white} />
                ) : (
                  <Text style={styles.startText}>CONFIRM</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.navy },
  header: { flexDirection: 'row', alignItems: 'center', gap: s(12), paddingHorizontal: s(16), paddingBottom: s(12) },
  headerTitle: { color: COLORS.white, fontSize: f(20), fontWeight: '700' },
  spinner: { marginTop: s(48) },
  error: { color: COLORS.red, fontSize: f(15), textAlign: 'center', margin: s(24) },
  content: { paddingHorizontal: s(16), paddingBottom: s(16), gap: s(12) },
  card: {
    backgroundColor: COLORS.navyCard,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: s(12),
    padding: s(14),
    gap: s(10),
  },
  cardTitle: { color: COLORS.sky, fontSize: f(13), fontWeight: '700', letterSpacing: 0.5 },
  field: { gap: s(2) },
  fieldLabel: { color: COLORS.muted, fontSize: f(12) },
  fieldValue: { color: COLORS.white, fontSize: f(15) },
  footer: {
    paddingHorizontal: s(16),
    paddingTop: s(12),
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: s(8),
    backgroundColor: COLORS.green,
    borderRadius: s(12),
    paddingVertical: s(15),
  },
  startText: { color: COLORS.white, fontSize: f(15), fontWeight: '700' },
  pressed: { opacity: 0.7 },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: s(24),
  },
  dialog: {
    width: '100%',
    maxWidth: s(420),
    backgroundColor: COLORS.navyCard,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: s(16),
    padding: s(20),
  },
  dialogTitle: { color: COLORS.white, fontSize: f(19), fontWeight: '700' },
  dialogText: { color: COLORS.muted, fontSize: f(14), marginTop: s(8) },
  startsLabel: { color: COLORS.muted, fontSize: f(12), marginTop: s(16) },
  startsValue: { color: COLORS.sky, fontSize: f(18), fontWeight: '700', marginTop: s(2) },
  dialogError: { color: COLORS.red, fontSize: f(14), marginTop: s(12) },
  dialogButtons: { flexDirection: 'row', gap: s(10), marginTop: s(20) },
  dialogButton: { flex: 1, alignItems: 'center', justifyContent: 'center', borderRadius: s(10), paddingVertical: s(13) },
  cancelButton: { borderWidth: 1, borderColor: COLORS.border },
  confirmButton: { backgroundColor: COLORS.green },
  cancelText: { color: COLORS.white, fontSize: f(15), fontWeight: '600' },
});
