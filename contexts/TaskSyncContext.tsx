import * as Network from 'expo-network';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  clearFailed,
  enqueueUpdate,
  flushQueue,
  isSyncConfigured,
  loadQueue,
  type PendingUpdate,
  type SyncResult,
  type TaskStatus,
} from '@/utils/task-status-sync';

const RETRY_INTERVAL_MS = 30000;

type TaskSyncContextType = {
  isConfigured: boolean;
  /** Updates saved on the phone that have not reached Supabase yet. */
  pending: PendingUpdate[];
  /** Updates Supabase rejected for good; shown so the operator knows. */
  failed: PendingUpdate[];
  lastResult: SyncResult;
  /** When the last update was confirmed by Supabase. */
  lastSentAt: Date | null;
  /** Saves the update, then tries to send it right away. */
  submitUpdate: (update: { status: TaskStatus; notes: string }) => Promise<SyncResult>;
  retryNow: () => Promise<SyncResult>;
  dismissFailed: () => Promise<void>;
};

const TaskSyncContext = createContext<TaskSyncContextType | null>(null);

export function TaskSyncProvider({ children }: { children: React.ReactNode }) {
  const { operatorEmail } = useAuth();
  const [queue, setQueue] = useState<PendingUpdate[]>([]);
  const [lastResult, setLastResult] = useState<SyncResult>({ kind: 'idle' });
  const [lastSentAt, setLastSentAt] = useState<Date | null>(null);

  const sync = useCallback(async () => {
    const result = await flushQueue();
    setLastResult(result);
    if (result.kind === 'sent') setLastSentAt(new Date());
    setQueue(await loadQueue());
    return result;
  }, []);

  const pending = useMemo(() => queue.filter(u => !u.failedReason), [queue]);
  const failed = useMemo(() => queue.filter(u => u.failedReason), [queue]);

  // Send anything left over from a previous session when the app starts.
  useEffect(() => {
    let cancelled = false;
    flushQueue().then(async result => {
      if (cancelled) return;
      setLastResult(result);
      if (result.kind === 'sent') setLastSentAt(new Date());
      setQueue(await loadQueue());
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Send as soon as the phone comes back online.
  useEffect(() => {
    const sub = Network.addNetworkStateListener(state => {
      if (state.isConnected && state.isInternetReachable !== false) sync();
    });
    return () => sub.remove();
  }, [sync]);

  // Keep retrying while something is waiting.
  const hasPending = pending.length > 0;
  useEffect(() => {
    if (!hasPending) return;
    const timer = setInterval(sync, RETRY_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [hasPending, sync]);

  const submitUpdate = useCallback(
    async ({ status, notes }: { status: TaskStatus; notes: string }) => {
      await enqueueUpdate({ status, notes: notes.trim() || null, operatorEmail });
      setQueue(await loadQueue());
      return sync();
    },
    [operatorEmail, sync]
  );

  const dismissFailed = useCallback(async () => {
    await clearFailed();
    setQueue(await loadQueue());
  }, []);

  const value = useMemo(
    () => ({
      isConfigured: isSyncConfigured,
      pending,
      failed,
      lastResult,
      lastSentAt,
      submitUpdate,
      retryNow: sync,
      dismissFailed,
    }),
    [pending, failed, lastResult, lastSentAt, submitUpdate, sync, dismissFailed]
  );

  return <TaskSyncContext.Provider value={value}>{children}</TaskSyncContext.Provider>;
}

export function useTaskSync() {
  const context = useContext(TaskSyncContext);
  if (!context) throw new Error('useTaskSync must be used within a TaskSyncProvider');
  return context;
}
