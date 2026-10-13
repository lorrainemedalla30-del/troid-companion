import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { clearSession, loadSession, saveSession } from '@/utils/operator-session';
import {
  ApiError,
  changePassword as apiChangePassword,
  companionLogin,
  companionLogout,
  fetchOperator,
  type CompanionSession,
  type Operator,
} from '@/utils/troid-api';

type AuthContextType = {
  /** True while the saved session is being loaded at startup. */
  isRestoring: boolean;
  isAuthenticated: boolean;
  operator: Operator | null;
  /** Email the operator logged in with; attached to task status updates. */
  operatorEmail: string | null;
  /** The account still has the admin's temporary password and must set its own. */
  mustChangePassword: boolean;
  /** True when the temporary password from this sign-in is still in memory. */
  hasTemporaryPassword: boolean;
  /** Why the operator was signed out without asking (e.g. the admin archived the account). */
  signOutNotice: string | null;
  /** Signs in with an account from the TROID system. Throws an ApiError with a message to show. */
  login: (email: string, password: string) => Promise<void>;
  /** Replaces the temporary password; currentPassword is only needed after an app restart. */
  changePassword: (newPassword: string, currentPassword?: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<CompanionSession | null>(null);
  const [isRestoring, setIsRestoring] = useState(true);
  const [signOutNotice, setSignOutNotice] = useState<string | null>(null);
  const [hasTemporaryPassword, setHasTemporaryPassword] = useState(false);
  const sessionRef = useRef<CompanionSession | null>(null);
  // Held in memory only, so the operator isn't asked for it again on the change-password screen.
  const temporaryPasswordRef = useRef<string | null>(null);

  const applySession = useCallback(async (next: CompanionSession | null) => {
    sessionRef.current = next;
    setSession(next);
    if (next) await saveSession(next);
    else await clearSession();
  }, []);

  const endSession = useCallback(
    async (notice: string | null) => {
      temporaryPasswordRef.current = null;
      setHasTemporaryPassword(false);
      setSignOutNotice(notice);
      await applySession(null);
    },
    [applySession]
  );

  // Asks the TROID server whether this account may still use the app. Signs out if
  // the admin archived it, reset its password, or it signed in on another phone.
  // Being offline (e.g. the bot's SIM link dropped) keeps the operator signed in.
  const verify = useCallback(async () => {
    const current = sessionRef.current;
    if (!current) return;
    try {
      const operator = await fetchOperator(current);
      if (sessionRef.current?.token === current.token) await applySession({ ...current, operator });
    } catch (error) {
      if (error instanceof ApiError && error.kind === 'auth' && sessionRef.current?.token === current.token) {
        await endSession(error.message);
      }
    }
  }, [applySession, endSession]);

  useEffect(() => {
    let cancelled = false;
    loadSession().then(saved => {
      if (cancelled) return;
      sessionRef.current = saved;
      setSession(saved);
      setIsRestoring(false);
      verify();
    });
    return () => {
      cancelled = true;
    };
  }, [verify]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', state => {
      if (state === 'active') verify();
    });
    return () => sub.remove();
  }, [verify]);

  const login = useCallback(
    async (email: string, password: string) => {
      const next = await companionLogin(email.trim(), password);
      temporaryPasswordRef.current = next.operator.mustChangePassword ? password : null;
      setHasTemporaryPassword(next.operator.mustChangePassword);
      setSignOutNotice(null);
      await applySession(next);
    },
    [applySession]
  );

  const changePassword = useCallback(
    async (newPassword: string, currentPassword?: string) => {
      const current = sessionRef.current;
      const oldPassword = currentPassword ?? temporaryPasswordRef.current;
      if (!current || !oldPassword) throw new ApiError('Please sign in again.', 'auth');
      const operator = await apiChangePassword(current, oldPassword, newPassword);
      temporaryPasswordRef.current = null;
      setHasTemporaryPassword(false);
      await applySession({ ...current, operator });
    },
    [applySession]
  );

  const logout = useCallback(async () => {
    const current = sessionRef.current;
    await endSession(null);
    // Ends the session on the server too; if offline, it simply expires when the
    // operator next signs in (each sign-in replaces the previous app session).
    if (current) companionLogout(current).catch(() => {});
  }, [endSession]);

  const value = useMemo(
    () => ({
      isRestoring,
      isAuthenticated: session !== null,
      operator: session?.operator ?? null,
      operatorEmail: session?.operator.email ?? null,
      mustChangePassword: session?.operator.mustChangePassword ?? false,
      hasTemporaryPassword,
      signOutNotice,
      login,
      changePassword,
      logout,
    }),
    [isRestoring, session, hasTemporaryPassword, signOutNotice, login, changePassword, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
