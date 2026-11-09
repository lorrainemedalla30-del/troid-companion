import { ROV_DRIVE_URL } from '@/utils/rov-stream';
import { useEffect } from 'react';

export type DriveDirection = 'forward' | 'backward' | 'stop';

/** How often a held command is repeated. The Pi stops the motors after 600 ms of silence. */
const HEARTBEAT_MS = 200;
const TIMEOUT_MS = 500;

async function sendDrive(left: DriveDirection, right: DriveDirection) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    await fetch(ROV_DRIVE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ left, right }),
      signal: controller.signal,
    });
  } catch {
    // Dropped commands are fine: the next heartbeat retries, and the Pi stops on its own if they all fail.
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Sends the drive pads' state to the Pi relay: once on every change, then
 * every HEARTBEAT_MS while a side is moving, so the Pi's watchdog keeps the
 * motors running only while a button is actually held.
 */
export function useDriveLink(left: DriveDirection, right: DriveDirection) {
  useEffect(() => {
    sendDrive(left, right);
    if (left === 'stop' && right === 'stop') return;
    const timer = setInterval(() => sendDrive(left, right), HEARTBEAT_MS);
    return () => clearInterval(timer);
  }, [left, right]);
}
