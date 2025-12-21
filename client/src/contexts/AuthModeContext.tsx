import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";

export type AuthMode = "online" | "offline";

interface AuthModeContextType {
  authMode: AuthMode;
  setAuthMode: (mode: AuthMode) => void;
  isOnlineMode: boolean;
  isOfflineMode: boolean;
  toggleAuthMode: () => void;
}

const AuthModeContext = createContext<AuthModeContextType | undefined>(undefined);

const AUTH_MODE_STORAGE_KEY = "spc-auth-mode";

// Default to online mode (Manus OAuth)
const DEFAULT_AUTH_MODE: AuthMode = "online";

interface AuthModeProviderProps {
  children: ReactNode;
}

export function AuthModeProvider({ children }: AuthModeProviderProps) {
  const [authMode, setAuthModeState] = useState<AuthMode>(() => {
    // Load from localStorage on initial render
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(AUTH_MODE_STORAGE_KEY);
      if (stored === "online" || stored === "offline") {
        return stored;
      }
    }
    return DEFAULT_AUTH_MODE;
  });

  // Persist to localStorage when authMode changes
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(AUTH_MODE_STORAGE_KEY, authMode);
    }
  }, [authMode]);

  const setAuthMode = useCallback((mode: AuthMode) => {
    setAuthModeState(mode);
  }, []);

  const toggleAuthMode = useCallback(() => {
    setAuthModeState((prev) => (prev === "online" ? "offline" : "online"));
  }, []);

  const value: AuthModeContextType = {
    authMode,
    setAuthMode,
    isOnlineMode: authMode === "online",
    isOfflineMode: authMode === "offline",
    toggleAuthMode,
  };

  return (
    <AuthModeContext.Provider value={value}>
      {children}
    </AuthModeContext.Provider>
  );
}

export function useAuthMode() {
  const context = useContext(AuthModeContext);
  if (context === undefined) {
    throw new Error("useAuthMode must be used within an AuthModeProvider");
  }
  return context;
}

// Export the context for advanced use cases
export { AuthModeContext };
