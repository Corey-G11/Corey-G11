import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'fitos.accessToken';

interface SessionContextValue {
  token: string | null;
  ready: boolean;
  setToken: (token: string | null) => Promise<void>;
  signOut: () => Promise<void>;
}

const SessionContext = createContext<SessionContextValue | undefined>(undefined);

export function SessionProvider({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  const [token, setTokenState] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const stored = await SecureStore.getItemAsync(TOKEN_KEY);
        if (active && stored) setTokenState(stored);
      } catch {
        // SecureStore unavailable (e.g. web) — fall back to in-memory only.
      } finally {
        if (active) setReady(true);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const setToken = useCallback(async (next: string | null) => {
    setTokenState(next);
    try {
      if (next) {
        await SecureStore.setItemAsync(TOKEN_KEY, next);
      } else {
        await SecureStore.deleteItemAsync(TOKEN_KEY);
      }
    } catch {
      // Persistence is best-effort; in-memory state still holds.
    }
  }, []);

  const signOut = useCallback(async () => {
    await setToken(null);
  }, [setToken]);

  const value = useMemo<SessionContextValue>(
    () => ({ token, ready, setToken, signOut }),
    [token, ready, setToken, signOut],
  );

  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  );
}

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx) {
    throw new Error('useSession must be used within a SessionProvider');
  }
  return ctx;
}
