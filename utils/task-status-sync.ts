import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Sends task status updates to Supabase, with an offline queue.
 *
 * Every update is saved on the phone first, then sent in order. If the phone is
 * offline or Supabase is unreachable, it stays queued and is retried later, so
 * nothing is lost. Each update carries a client-generated UUID as its primary
 * key, so a retry after a lost response is rejected as a duplicate (and counted
 * as delivered) instead of creating a second row.
 *
 * Uses Supabase's REST API (PostgREST) directly, so no Supabase SDK is needed.
 * Table schema and setup: docs/task-status-sync.md.
 */

export type TaskStatus = 'completed' | 'to_be_continued' | 'in_progress';

export type PendingUpdate = {
  id: string;
  status: TaskStatus;
  notes: string | null;
  operatorEmail: string | null;
  /** When the operator tapped UPDATE STATUS (phone clock), ISO 8601. */
  createdAt: string;
  /** Set when Supabase rejected this update for good (e.g. invalid data); it is no longer retried. */
  failedReason?: string;
};

export type SyncResult =
  | { kind: 'idle' }
  | { kind: 'sent'; count: number }
  /** Could not reach Supabase; queued updates will be retried. */
  | { kind: 'offline' }
  /** Supabase refused the request because of setup (key, table, permissions). */
  | { kind: 'config-error'; message: string };

const STORAGE_KEY = 'taskStatusQueue.v1';
const REQUEST_TIMEOUT_MS = 15000;

const SUPABASE_URL = (process.env.EXPO_PUBLIC_SUPABASE_URL ?? '').replace(/\/+$/, '');
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';
const TABLE = process.env.EXPO_PUBLIC_SUPABASE_TASK_TABLE || 'task_status_updates';

// http:// is allowed for a local Supabase (`supabase start` serves http://127.0.0.1:54321).
export const isSyncConfigured = /^https?:\/\//.test(SUPABASE_URL) && SUPABASE_ANON_KEY.length > 0;

/** RFC 4122 version 4 UUID (Hermes has no crypto.randomUUID). */
function uuidv4() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

export async function loadQueue(): Promise<PendingUpdate[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as PendingUpdate[]) : [];
  } catch {
    return [];
  }
}

async function saveQueue(queue: PendingUpdate[]) {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
}

// All queue reads/writes go through this chain so an enqueue during a flush
// can't overwrite the flush's changes (or vice versa).
let queueLock: Promise<unknown> = Promise.resolve();
function withQueue<T>(fn: (queue: PendingUpdate[]) => Promise<{ queue: PendingUpdate[]; result: T }>): Promise<T> {
  const run = queueLock.then(async () => {
    const { queue, result } = await fn(await loadQueue());
    await saveQueue(queue);
    return result;
  });
  queueLock = run.catch(() => undefined);
  return run;
}

export function enqueueUpdate(update: Omit<PendingUpdate, 'id' | 'createdAt'>): Promise<PendingUpdate> {
  const item: PendingUpdate = { ...update, id: uuidv4(), createdAt: new Date().toISOString() };
  return withQueue(async queue => ({ queue: [...queue, item], result: item }));
}

/** Removes updates Supabase permanently rejected, after the operator has seen them. */
export function clearFailed(): Promise<void> {
  return withQueue(async queue => ({ queue: queue.filter(u => !u.failedReason), result: undefined }));
}

type SendOutcome = 'sent' | 'retry' | { config: string } | { rejected: string };

async function sendOne(update: PendingUpdate): Promise<SendOutcome> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    // A plain insert. (An upsert with "ignore duplicates" would need a SELECT
    // policy on the table, which would let anyone with the public key read
    // every update; insert-only is safer.)
    const response = await fetch(`${SUPABASE_URL}/rest/v1/${encodeURIComponent(TABLE)}`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({
        id: update.id,
        status: update.status,
        notes: update.notes,
        operator_email: update.operatorEmail,
        created_at: update.createdAt,
      }),
      signal: controller.signal,
    });

    if (response.ok) return 'sent';
    const error = await readError(response);
    // 23505 = unique violation on the id: an earlier attempt already stored this
    // update (its response was lost), so it counts as delivered, not a duplicate.
    if (response.status === 409 && error.code === '23505') return 'sent';
    const detail = error.text;
    if (response.status === 401 || response.status === 403) {
      return { config: `Supabase refused the update (${response.status}). Check the anon key and the table's insert policy. ${detail}` };
    }
    if (response.status === 404) {
      return { config: `Table "${TABLE}" was not found in Supabase. ${detail}` };
    }
    if (response.status === 408 || response.status === 429 || response.status >= 500) return 'retry';
    // Other 4xx: Supabase rejected this particular update (e.g. a column or check constraint).
    return { rejected: `${response.status}: ${detail}` };
  } catch {
    return 'retry'; // Network error or timeout.
  } finally {
    clearTimeout(timer);
  }
}

async function readError(response: Response): Promise<{ code: string | null; text: string }> {
  try {
    const body = await response.json();
    return { code: body.code ?? null, text: [body.message, body.hint].filter(Boolean).join(' ') };
  } catch {
    return { code: null, text: '' };
  }
}

let flushing: Promise<SyncResult> | null = null;

/** Sends queued updates in order. Safe to call often; concurrent calls share one run. */
export function flushQueue(): Promise<SyncResult> {
  if (!isSyncConfigured) {
    return Promise.resolve({ kind: 'config-error', message: 'Supabase is not configured yet (missing URL or anon key).' });
  }
  if (!flushing) {
    flushing = runFlush().finally(() => {
      flushing = null;
    });
  }
  return flushing;
}

async function runFlush(): Promise<SyncResult> {
  let sent = 0;
  // Re-read the queue each round so updates added mid-flush are picked up too.
  for (;;) {
    const next = (await loadQueue()).find(u => !u.failedReason);
    if (!next) return sent > 0 ? { kind: 'sent', count: sent } : { kind: 'idle' };

    const outcome = await sendOne(next);
    if (outcome === 'retry') return { kind: 'offline' };
    if (typeof outcome === 'object' && 'config' in outcome) return { kind: 'config-error', message: outcome.config };

    await withQueue(async queue => ({
      queue:
        outcome === 'sent'
          ? queue.filter(u => u.id !== next.id)
          : queue.map(u => (u.id === next.id ? { ...u, failedReason: outcome.rejected } : u)),
      result: undefined,
    }));
    if (outcome === 'sent') sent++;
  }
}
