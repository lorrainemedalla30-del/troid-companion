/**
 * Operator sign-in through the TROID system's backend (TROID-sys).
 *
 * Only operator accounts an admin created in the TROID system can sign in; the
 * backend enforces this, and rejects archived or pending accounts too. The app
 * gets its own session token, so signing in here doesn't end the operator's
 * session on the TROID website.
 */

const API_BASE = (process.env.EXPO_PUBLIC_TROID_API_BASE ?? '').replace(/\/+$/, '');
/** True when the TROID server address is set. */
export const isApiConfigured = /^https?:\/\//.test(API_BASE);
// Render's free tier sleeps when idle and can take about a minute to wake up.
const REQUEST_TIMEOUT_MS = 60000;

export type Operator = {
  id: number;
  userId: string | null;
  name: string;
  email: string;
  /** Set when the admin created or reset the account with a temporary password. */
  mustChangePassword: boolean;
};

export type CompanionSession = { operator: Operator; token: string };

/**
 * kind 'auth': the server refused the credentials or the session (wrong password,
 * not an operator, account archived, signed out). 'network': the server could not
 * be reached. 'server': anything else.
 */
export class ApiError extends Error {
  kind: 'auth' | 'network' | 'server';
  /** HTTP status, when the server answered. */
  status?: number;

  constructor(message: string, kind: ApiError['kind'], status?: number) {
    super(message);
    this.kind = kind;
    this.status = status;
  }
}

type ApiOperator = {
  id: number;
  user_id: string | null;
  name: string;
  email: string;
  must_change_password: boolean;
};

function toOperator(data: ApiOperator): Operator {
  return {
    id: data.id,
    userId: data.user_id,
    name: data.name,
    email: data.email,
    mustChangePassword: data.must_change_password,
  };
}

async function request<T>(
  path: string,
  { method = 'GET', body, session }: { method?: string; body?: object; session?: CompanionSession } = {}
): Promise<T> {
  if (!isApiConfigured) {
    throw new ApiError('The TROID server address is not set (EXPO_PUBLIC_TROID_API_BASE).', 'server');
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(session ? { Authorization: `Companion ${session.operator.id}:${session.token}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
  } catch {
    throw new ApiError(
      controller.signal.aborted
        ? 'The TROID server took too long to answer. It may be starting up; try again in a minute.'
        : 'Could not reach the TROID server. Check the internet connection.',
      'network'
    );
  } finally {
    clearTimeout(timer);
  }

  if (response.ok) {
    return (response.status === 204 ? null : await response.json()) as T;
  }
  let message = '';
  try {
    const data = await response.json();
    message = typeof data.error === 'string' ? data.error : '';
  } catch {
    // Not JSON (e.g. a proxy error page); fall back to the messages below.
  }
  if (response.status === 429) {
    throw new ApiError('Too many sign-in attempts. Wait a minute and try again.', 'auth', 429);
  }
  if (response.status === 401 || response.status === 403) {
    throw new ApiError(message || 'Please sign in again.', 'auth', response.status);
  }
  throw new ApiError(
    message || `The TROID server had a problem (${response.status}). Try again.`,
    'server',
    response.status
  );
}

export async function companionLogin(email: string, password: string): Promise<CompanionSession> {
  const data = await request<ApiOperator & { session_token: string }>('/companion/login/', {
    method: 'POST',
    body: { email, password },
  });
  return { operator: toOperator(data), token: data.session_token };
}

/** Re-checks the session; throws an 'auth' ApiError if the account can no longer use the app. */
export async function fetchOperator(session: CompanionSession): Promise<Operator> {
  return toOperator(await request<ApiOperator>('/companion/me/', { session }));
}

export async function changePassword(
  session: CompanionSession,
  oldPassword: string,
  newPassword: string
): Promise<Operator> {
  const data = await request<ApiOperator>('/companion/change-password/', {
    method: 'POST',
    body: { old_password: oldPassword, password: newPassword },
    session,
  });
  return toOperator(data);
}

export async function companionLogout(session: CompanionSession): Promise<void> {
  await request<null>('/companion/logout/', { method: 'POST', session });
}

/**
 * Sends a task status update. The server records it under the signed-in
 * operator, so the update can't be sent in someone else's name.
 */
export async function submitTaskStatus(
  session: CompanionSession,
  update: { id: string; status: string; notes: string | null; createdAt: string }
): Promise<void> {
  await request<{ id: string }>('/companion/task-status/', {
    method: 'POST',
    body: { id: update.id, status: update.status, notes: update.notes, created_at: update.createdAt },
    session,
  });
}

/** The robot assigned to the operator, with its condition from the robot's heartbeats. */
export type AssignedBot = {
  id: number;
  /** As the website shows it, e.g. "TRD-004". */
  label: string;
  name: string;
  /** The robot sent a heartbeat in the last ~15 s. */
  isOnline: boolean;
  isActive: boolean;
  /** Percent; null until the robot has a battery sensor. */
  battery: number | null;
  lastSeen: string | null;
};

type ApiBot = {
  id: number;
  label: string;
  name: string;
  is_online: boolean;
  is_active: boolean;
  battery_level: number | null;
  last_seen: string | null;
};

/** Null when no robot is assigned to the operator (Operator Management on the website). */
export async function fetchAssignedBot(session: CompanionSession): Promise<AssignedBot | null> {
  const { bot } = await request<{ bot: ApiBot | null }>('/companion/bot/', { session });
  if (!bot) return null;
  return {
    id: bot.id,
    label: bot.label,
    name: bot.name,
    isOnline: bot.is_online,
    isActive: bot.is_active,
    battery: bot.battery_level,
    lastSeen: bot.last_seen,
  };
}

/** The TROID system's password rules (backend validate_password_strength). */
export const PASSWORD_RULES: { label: string; test: (password: string) => boolean }[] = [
  { label: 'At least 8 characters', test: p => p.length >= 8 },
  { label: 'A lowercase letter', test: p => /[a-z]/.test(p) },
  { label: 'An uppercase letter', test: p => /[A-Z]/.test(p) },
  { label: 'A special character (e.g. ! @ # ?)', test: p => /[^A-Za-z0-9]/.test(p) },
];
