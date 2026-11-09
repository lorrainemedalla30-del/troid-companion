import { useAuth } from '@/contexts/AuthContext';
import { ApiError, fetchAssignedRequests, type DriveRequest } from '@/utils/troid-api';
import { fontScale, scaleSize } from '@/utils/scale';
import { useFocusEffect, useRouter } from 'expo-router';
import { ChevronRight } from 'lucide-react-native';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const s = scaleSize;
const f = fontScale;

const COLORS = {
  navy: '#0B1220',
  navyCard: '#101B2D',
  border: '#1E3A55',
  sky: '#38bdf8',
  green: '#34d399',
  muted: 'rgba(255,255,255,0.6)',
  white: '#FFFFFF',
  red: '#F87171',
};

/** Landing page: the cleanups assigned to this operator and their robot. */
export default function RequestsScreen() {
  const { session } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [requests, setRequests] = useState<DriveRequest[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(() => {
    if (!session) return Promise.resolve();
    return fetchAssignedRequests(session).then(
      list => {
        setRequests(list);
        setError(null);
      },
      (e: unknown) => setError(e instanceof ApiError ? e.message : 'Could not load your requests.')
    );
  }, [session]);

  // Refreshed each time the screen is shown, so a finished drive drops off the list.
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const refresh = () => {
    setRefreshing(true);
    load().finally(() => setRefreshing(false));
  };

  const renderItem = ({ item }: { item: DriveRequest }) => {
    const ongoing = item.status === 'ongoing';
    return (
      <Pressable
        accessibilityRole="button"
        onPress={() => router.push({ pathname: '/request/[id]', params: { id: item.id } })}
        style={({ pressed }) => [styles.card, ongoing && styles.cardOngoing, pressed && styles.cardPressed]}
      >
        <Text style={styles.selection} numberOfLines={2}>
          {item.barangay ? `${item.id} - ${item.barangay}` : item.id}
        </Text>
        <View style={[styles.pill, { borderColor: ongoing ? COLORS.green : COLORS.sky }]}>
          <Text style={[styles.pillText, { color: ongoing ? COLORS.green : COLORS.sky }]}>
            {ongoing ? 'ONGOING' : 'APPROVED'}
          </Text>
        </View>
        <ChevronRight size={s(20)} color={COLORS.muted} />
      </Pressable>
    );
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top + s(12) }]}>
      <Text style={styles.title}>Cleanup Requests</Text>
      <Text style={styles.subtitle}>Select your assigned cleanup to begin.</Text>

      {requests === null && !error ? (
        <ActivityIndicator style={styles.spinner} color={COLORS.sky} size="large" />
      ) : (
        <FlatList
          data={requests ?? []}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + s(16) }]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={COLORS.sky} />}
          ListHeaderComponent={error ? <Text style={styles.error}>{error} Pull down to try again.</Text> : null}
          ListEmptyComponent={
            error ? null : <Text style={styles.empty}>No cleanups are assigned to you and your robot right now.</Text>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.navy, paddingHorizontal: s(16) },
  title: { color: COLORS.white, fontSize: f(24), fontWeight: '700' },
  subtitle: { color: COLORS.muted, fontSize: f(14), marginTop: s(4), marginBottom: s(12) },
  spinner: { marginTop: s(48) },
  list: { gap: s(10), flexGrow: 1 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(8),
    backgroundColor: COLORS.navyCard,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: s(12),
    padding: s(14),
  },
  cardOngoing: { borderColor: COLORS.green },
  cardPressed: { opacity: 0.7 },
  selection: { flex: 1, color: COLORS.white, fontSize: f(17), fontWeight: '600' },
  pill: { borderWidth: 1, borderRadius: s(10), paddingHorizontal: s(8), paddingVertical: s(2) },
  pillText: { fontSize: f(10), fontWeight: '700' },
  error: { color: COLORS.red, fontSize: f(14), marginBottom: s(8) },
  empty: { color: COLORS.muted, fontSize: f(15), textAlign: 'center', marginTop: s(48) },
});
