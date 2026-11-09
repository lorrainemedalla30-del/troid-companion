import * as Network from 'expo-network';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  belongsTo,
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
  /** This operator's updates saved on the phone that have not reached the TROID system yet. */
  pending: PendingUpdate[];
  /** This operator's updates the server rejected for good; shown so the operator knows. */
  failed: PendingUpdate[];
  lastResult: SyncResult;
  /** When the last update was confirmed by the server. */
  lastSentAt: Date | null;
  /** Saves the update, then tries to send it right away. */
  submitUpdate: (update: { status: TaskStatus; notes: string }) => Promise<SyncResult>;
  retryNow: () => Promise<SyncResult>;
  dismissFailed: () => Promise<void>;
};

const TaskSyncContext = createContext<TaskSyncContextType | null>(null);

export function TaskSyncProvider({ children }: { children: React.ReactNode }) {
  const { session, operator } = useAuth();
  const [queue, setQueue] = useState<PendingUpdate[]>([]);
  const [lastResult, setLastResult] = useState<SyncResult>({ kind: 'idle' });
  // Kept with the operator who sent it, so the next operator doesn't see it.
  const [lastSent, setLastSent] = useState<{ at: Date; operatorId: number } | null>(null);
  // Read at send time, so a retry timer always uses the current session.
  const sessionRef = useRef(session);
  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  const sync = useCallback(async () => {
    const current = sessionRef.current;
    const result = await flushQueue(current);
    setLastResult(result);
    if (result.kind === 'sent' && current) setLastSent({ at: new Date(), operatorId: current.operator.id });
    setQueue(await loadQueue());
    return result;
  }, []);

  // Other operators' queued updates on this phone wait for their own sign-in.
  const operatorId = operator?.id;
  const mine = useMemo(() => queue.filter(u => belongsTo(u, operatorId)), [queue, operatorId]);
  const pending = useMemo(() => mine.filter(u => !u.failedReason), [mine]);
  const failed = useMemo(() => mine.filter(u => u.failedReason), [mine]);
  const lastSentAt = lastSent && lastSent.operatorId === operatorId ? lastSent.at : null;

  // Send anything left over when the app starts or an operator signs in.
  const sessionToken = session?.token;
  useEffect(() => {
    if (sessionToken) sync();
  }, [sessionToken, sync]);

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
      await enqueueUpdate({
        status,
        notes: notes.trim() || null,
        operatorId: operator?.id,
        operatorEmail: operator?.email ?? null,
      });
      setQueue(await loadQueue());
      return sync();
    },
    [operator, sync]
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
