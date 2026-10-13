/**
 * Operator sign-in through the TROID system's backend (TROID-sys).
 *
 * Only operator accounts an admin created in the TROID system can sign in; the
 * backend enforces this, and rejects archived or pending accounts too. The app
 * gets its own session token, so signing in here doesn't end the operator's
 * session on the TROID website.
 */

const API_BASE = (process.env.EXPO_PUBLIC_TROID_API_BASE ?? '').replace(/\/+$/, '');
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

  constructor(message: string, kind: ApiError['kind']) {
    super(message);
    this.kind = kind;
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
  if (!/^https?:\/\//.test(API_BASE)) {
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
    throw new ApiError('Too many sign-in attempts. Wait a minute and try again.', 'auth');
  }
  if (response.status === 401 || response.status === 403) {
    throw new ApiError(message || 'Please sign in again.', 'auth');
  }
  throw new ApiError(message || `The TROID server had a problem (${response.status}). Try again.`, 'server');
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

/** The TROID system's password rules (backend validate_password_strength). */
export const PASSWORD_RULES: { label: string; test: (password: string) => boolean }[] = [
  { label: 'At least 8 characters', test: p => p.length >= 8 },
  { label: 'A lowercase letter', test: p => /[a-z]/.test(p) },
  { label: 'An uppercase letter', test: p => /[A-Z]/.test(p) },
  { label: 'A special character (e.g. ! @ # ?)', test: p => /[^A-Za-z0-9]/.test(p) },
];
