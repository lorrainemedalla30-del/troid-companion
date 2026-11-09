import { ROV_STATUS_URL } from '@/utils/rov-stream';
import { useEffect, useState } from 'react';
import { Platform } from 'react-native';

export type VideoStatus = 'connecting' | 'live' | 'offline';

const POLL_MS = 2000;
const TIMEOUT_MS = 1500;

/**
 * Polls the Pi relay's /status so the feed is only shown while the relay is
 * reachable and has frames from the camera. `attempt` changes each time the
 * feed comes back, so the player can reopen the stream.
 */
export function useVideoStatus() {
  const [status, setStatus] = useState<VideoStatus>('connecting');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    let wasLive = false;

    const check = async () => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
      let live = false;
      try {
        if (Platform.OS === 'web') {
          // The relay sends no CORS headers, so a browser can't read /status.
          // A no-cors request still fails if the relay is unreachable, which is enough.
          await fetch(ROV_STATUS_URL, { signal: controller.signal, cache: 'no-store', mode: 'no-cors' });
          live = true;
        } else {
          const res = await fetch(ROV_STATUS_URL, { signal: controller.signal, cache: 'no-store' });
          live = res.ok && (await res.json())?.stream_ok === true;
        }
      } catch {
        live = false;
      } finally {
        clearTimeout(timeout);
      }
      if (cancelled) return;
      if (live && !wasLive) setAttempt(a => a + 1);
      wasLive = live;
      setStatus(live ? 'live' : 'offline');
    };

    check();
    const timer = setInterval(check, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  return { status, attempt };
}
