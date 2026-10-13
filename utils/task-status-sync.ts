import AsyncStorage from '@react-native-async-storage/async-storage';
import { ApiError, isApiConfigured, submitTaskStatus, type CompanionSession } from '@/utils/troid-api';

/**
 * Sends task status updates to the TROID system, with an offline queue.
 *
 * Every update is saved on the phone first, then sent in order. If the phone is
 * offline or the server is unreachable, it stays queued and is retried later, so
 * nothing is lost. Each update carries a client-generated UUID, so a retry after
 * a lost response is counted as delivered instead of creating a second row.
 *
 * The TROID backend stores the update in Supabase under the signed-in operator
 * (POST /api/companion/task-status/), so updates can't be sent in someone else's
 * name. Each queued update is only sent with the session of the operator who
 * made it. Table schema and setup: docs/task-status-sync.md.
 */

export type TaskStatus = 'completed' | 'to_be_continued' | 'in_progress';

export type PendingUpdate = {
  id: string;
  status: TaskStatus;
  notes: string | null;
  /** TROID account id of the operator who made the update (missing on updates queued by older versions). */
  operatorId?: number;
  operatorEmail: string | null;
  /** When the operator tapped UPDATE STATUS (phone clock), ISO 8601. */
  createdAt: string;
  /** Set when the server rejected this update for good (e.g. invalid data); it is no longer retried. */
  failedReason?: string;
};

export type SyncResult =
  | { kind: 'idle' }
  | { kind: 'sent'; count: number }
  /** Could not reach the server; queued updates will be retried. */
  | { kind: 'offline' }
  /** The server refused because of setup or the session (signed out, not configured). */
  | { kind: 'config-error'; message: string };

const STORAGE_KEY = 'taskStatusQueue.v1';

export const isSyncConfigured = isApiConfigured;

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

/** Removes updates the server permanently rejected, after the operator has seen them. */
export function clearFailed(): Promise<void> {
  return withQueue(async queue => ({ queue: queue.filter(u => !u.failedReason), result: undefined }));
}

/** Whether this queued update may be sent with this operator's session. */
export function belongsTo(update: PendingUpdate, operatorId: number | undefined) {
  return update.operatorId === undefined || update.operatorId === operatorId;
}

type SendOutcome = 'sent' | 'retry' | { config: string } | { rejected: string };

async function sendOne(session: CompanionSession, update: PendingUpdate): Promise<SendOutcome> {
  try {
    await submitTaskStatus(session, update);
    return 'sent';
  } catch (error) {
    if (!(error instanceof ApiError) || error.kind === 'network') return 'retry';
    // Signed out, or the account can no longer use the app; sent after signing in again.
    if (error.kind === 'auth') return { config: `Sign in again to send it. ${error.message}` };
    if (error.status === 400) return { rejected: error.message };
    return 'retry'; // Server or Supabase trouble; try again later.
  }
}

let flushing: Promise<SyncResult> | null = null;

/**
 * Sends the signed-in operator's queued updates in order. Safe to call often;
 * concurrent calls share one run. Other operators' updates wait for their sign-in.
 */
export function flushQueue(session: CompanionSession | null): Promise<SyncResult> {
  if (!isSyncConfigured) {
    return Promise.resolve({ kind: 'config-error', message: 'The TROID server address is not set yet.' });
  }
  if (!session) return Promise.resolve({ kind: 'idle' });
  if (!flushing) {
    flushing = runFlush(session).finally(() => {
      flushing = null;
    });
  }
  return flushing;
}

async function runFlush(session: CompanionSession): Promise<SyncResult> {
  let sent = 0;
  // Re-read the queue each round so updates added mid-flush are picked up too.
  for (;;) {
    const next = (await loadQueue()).find(u => !u.failedReason && belongsTo(u, session.operator.id));
    if (!next) return sent > 0 ? { kind: 'sent', count: sent } : { kind: 'idle' };

    const outcome = await sendOne(session, next);
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
