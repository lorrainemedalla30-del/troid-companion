import { useAuth } from '@/contexts/AuthContext';
import { fetchAssignedBot, type AssignedBot } from '@/utils/troid-api';
import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

const POLL_MS = 10000;

/**
 * The robot assigned to the signed-in operator and its condition (online,
 * battery), as the TROID system last heard from the robot. Refreshed every 10 s
 * while the app is open; keeps the last value while offline.
 *
 * undefined: not loaded yet. null: no robot is assigned to this operator.
 */
export function useAssignedBot(): AssignedBot | null | undefined {
  const { session } = useAuth();
  const [bot, setBot] = useState<AssignedBot | null | undefined>(undefined);

  useEffect(() => {
    if (!session) return;
    let cancelled = false;
    let inFlight = false;

    const load = async () => {
      if (inFlight || AppState.currentState !== 'active') return;
      inFlight = true;
      try {
        const next = await fetchAssignedBot(session);
        if (!cancelled) setBot(next);
      } catch {
        // Offline or the server is waking up: keep showing the last reading.
      } finally {
        inFlight = false;
      }
    };

    load();
    const timer = setInterval(load, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [session]);

  return bot;
}
