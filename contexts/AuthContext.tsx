import React, { createContext, useContext, useState, useCallback } from 'react';

type AuthContextType = {
  isAuthenticated: boolean;
  /** Email the operator logged in with; attached to task status updates. */
  operatorEmail: string | null;
  login: (email: string) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  operatorEmail: null,
  login: () => {},
  logout: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [operatorEmail, setOperatorEmail] = useState<string | null>(null);

  const login = useCallback((email: string) => {
    setOperatorEmail(email.trim() || null);
    setIsAuthenticated(true);
  }, []);

  const logout = useCallback(() => {
    setIsAuthenticated(false);
    setOperatorEmail(null);
  }, []);

  return (
    <AuthContext.Provider value={{ isAuthenticated, operatorEmail, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
