import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { getWifiSignalStrength } from '@/utils/wifi';

export type SignalBars = 0 | 1 | 2 | 3 | 4;

export type ConnectionQuality = {
  bars: SignalBars;
  label: 'GOOD' | 'FAIR' | 'POOR' | 'CHECKING' | 'OFFLINE';
  /** Round-trip time of the last internet check, in ms. */
  latencyMs: number | null;
  /** Wi-Fi signal in dBm (Android only). */
  rssi: number | null;
};

// A tiny endpoint built for connectivity checks: it returns an empty 204 response.
const PROBE_URL = 'https://clients3.google.com/generate_204';
const PROBE_INTERVAL_MS = 5000;
const PROBE_TIMEOUT_MS = 4000;
/** Median of the last few samples, so one slow request does not flip the meter. */
const SAMPLE_COUNT = 3;

const OFFLINE: ConnectionQuality = { bars: 0, label: 'OFFLINE', latencyMs: null, rssi: null };
const CHECKING: ConnectionQuality = { bars: 0, label: 'CHECKING', latencyMs: null, rssi: null };

function barsFromLatency(ms: number | null): SignalBars {
  if (ms == null) return 0;
  if (ms < 150) return 4;
  if (ms < 300) return 3;
  if (ms < 600) return 2;
  if (ms < 1500) return 1;
  return 0;
}

function barsFromRssi(dbm: number): SignalBars {
  if (dbm >= -55) return 4;
  if (dbm >= -67) return 3;
  if (dbm >= -75) return 2;
  if (dbm >= -85) return 1;
  return 0;
}

function labelFor(bars: SignalBars): ConnectionQuality['label'] {
  if (bars >= 3) return 'GOOD';
  if (bars === 2) return 'FAIR';
  return 'POOR';
}

async function measureLatency(): Promise<number | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);
  const start = Date.now();
  try {
    await fetch(`${PROBE_URL}?t=${start}`, {
      cache: 'no-store',
      signal: controller.signal,
      // Browsers block reading cross-site responses; we only need the timing.
      ...(Platform.OS === 'web' ? { mode: 'no-cors' as const } : {}),
    });
    return Date.now() - start;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Rates the phone's connection every few seconds while it is online. The
 * result is the worse of internet response time and (on Android) Wi-Fi signal
 * strength, since either one can make the connection bad.
 */
export function useConnectionQuality(isOnline: boolean, onWifi: boolean): ConnectionQuality {
  const [quality, setQuality] = useState<ConnectionQuality>(CHECKING);

  useEffect(() => {
    if (!isOnline) return;
    let cancelled = false;
    const samples: number[] = [];

    const check = async () => {
      const [latency, rssi] = await Promise.all([measureLatency(), onWifi ? getWifiSignalStrength() : null]);
      if (cancelled) return;

      samples.push(latency ?? Infinity);
      if (samples.length > SAMPLE_COUNT) samples.shift();
      const median = [...samples].sort((a, b) => a - b)[Math.floor(samples.length / 2)];
      const latencyMs = Number.isFinite(median) ? median : null;

      let bars = barsFromLatency(latencyMs);
      if (rssi != null) bars = Math.min(bars, barsFromRssi(rssi)) as SignalBars;
      setQuality({ bars, label: labelFor(bars), latencyMs, rssi });
    };

    check();
    const timer = setInterval(check, PROBE_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [isOnline, onWifi]);

  return isOnline ? quality : OFFLINE;
}
