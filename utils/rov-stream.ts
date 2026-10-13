/**
 * Where the ROV camera feed comes from: the Raspberry Pi relay (pi_relay.py),
 * which re-serves the ESP32-CAM stream as MJPEG on the Pi's hotspot.
 *
 * Override with EXPO_PUBLIC_ROV_VIDEO_URL if the Pi's address changes.
 */
export const ROV_VIDEO_URL = process.env.EXPO_PUBLIC_ROV_VIDEO_URL || 'http://10.42.0.1:8000/video';

/** The relay's health check, next to /video: returns { stream_ok: boolean }. */
export const ROV_STATUS_URL = ROV_VIDEO_URL.replace(/\/video\/?$/, '/status');

/** The relay's address without a path, e.g. "http://10.42.0.1:8000/" (React Native's URL has no .origin). */
export const ROV_ORIGIN = (ROV_VIDEO_URL.match(/^[a-z]+:\/\/[^/]+/i)?.[0] ?? 'http://10.42.0.1:8000') + '/';

/** Drive commands for the motor driver: POST { left, right }. */
export const ROV_DRIVE_URL = ROV_ORIGIN + 'drive';
