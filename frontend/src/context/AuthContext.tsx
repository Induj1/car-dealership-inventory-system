import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { ApiClient, ApiError } from '../lib/api.js';
import type { User } from '../types/index.js';

const TOKEN_STORAGE_KEY = 'apex-motors.token';

interface AuthContextValue {
  user: User | null;
  api: ApiClient;
  /** True until the stored token has been checked, so routes do not flash. */
  initialising: boolean;
  isAdmin: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * Owns the session: the token, the current user, and the single ApiClient the
 * rest of the app uses.
 *
 * The token lives in a ref as well as localStorage so the API client can read
 * the current value synchronously without being rebuilt on every render.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const tokenRef = useRef<string | null>(readStoredToken());
  const [user, setUser] = useState<User | null>(null);
  const [initialising, setInitialising] = useState(true);

  const setToken = useCallback((token: string | null) => {
    tokenRef.current = token;

    try {
      if (token) localStorage.setItem(TOKEN_STORAGE_KEY, token);
      else localStorage.removeItem(TOKEN_STORAGE_KEY);
    } catch {
      // Private browsing can refuse storage; the session still works in memory.
    }
  }, []);

  const api = useMemo(() => new ApiClient(() => tokenRef.current), []);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
  }, [setToken]);

  // Restore a session on first load: a stored token is only trustworthy if
  // the server still accepts it.
  useEffect(() => {
    let cancelled = false;

    if (!tokenRef.current) {
      setInitialising(false);
      return;
    }

    api
      .me()
      .then(({ user: restored }) => {
        if (!cancelled) setUser(restored);
      })
      .catch((error: unknown) => {
        if (error instanceof ApiError && error.isAuthFailure) logout();
      })
      .finally(() => {
        if (!cancelled) setInitialising(false);
      });

    return () => {
      cancelled = true;
    };
  }, [api, logout]);

  const login = useCallback(
    async (email: string, password: string) => {
      const { user: loggedIn, token } = await api.login({ email, password });
      setToken(token);
      setUser(loggedIn);
    },
    [api, setToken],
  );

  const register = useCallback(
    async (name: string, email: string, password: string) => {
      const { user: created, token } = await api.register({ name, email, password });
      setToken(token);
      setUser(created);
    },
    [api, setToken],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      api,
      initialising,
      isAdmin: user?.role === 'ADMIN',
      login,
      register,
      logout,
    }),
    [user, api, initialising, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used inside an <AuthProvider>');
  }

  return context;
}

function readStoredToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}
