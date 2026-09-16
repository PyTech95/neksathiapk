import { useRouter, useSegments, useRootNavigationState } from 'expo-router';
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { errMessage, isUsableToken, setClientToken, setUnauthorizedHandler, TOKEN_KEY } from '@/src/api/client';
import { configurationError } from '@/src/api/config';
import { getMe, login as apiLogin, otpVerify as apiOtpVerify, register as apiRegister } from '@/src/api/endpoints';
import { normalizeUser } from '@/src/api/normalizers';
import type { AuthResponse, User } from '@/src/api/types';
import { storage } from '@/src/utils/storage';
import { stopGuardian } from '@/src/services/backgroundLocation';

interface AuthContextValue {
  user: User | null;
  bootstrapping: boolean;
  startupError: string | null;
  retryStartup: () => Promise<void>;
  setSession: (res: AuthResponse) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, phone: string, password: string) => Promise<void>;
  verifyOtp: (phone: string, code: string, name?: string) => Promise<void>;
  refreshUser: () => Promise<void>;
  logout: () => Promise<void>;
}
const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [bootstrap, setBootstrap] = useState<{ loading: boolean; error: string | null }>({ loading: true, error: null });
  const bootstrapping = bootstrap.loading, startupError = bootstrap.error;
  const generation = useRef(0);
  const writes = useRef<Promise<unknown>>(Promise.resolve());
  const router = useRouter(), segments = useSegments(), navigation = useRootNavigationState();
  const enqueue = useCallback((work: () => Promise<unknown>) => {
    const next = writes.current.then(work, work);
    writes.current = next.catch(() => {}); return next;
  }, []);

  const logout = useCallback(async () => {
    generation.current++; setClientToken(null); setUser(null);
    setBootstrap({ loading: false, error: null });
    // Invalidate memory immediately; even a failed storage delete cannot keep polling alive.
    await enqueue(async () => {
      if (!(await storage.secureRemove(TOKEN_KEY))) await storage.secureSet(TOKEN_KEY, '');
    });
    await stopGuardian().catch(() => {});
  }, [enqueue]);

  const retryStartup = useCallback(async () => {
    const op = ++generation.current;
    setBootstrap({ loading: true, error: null });
    let failure: string | null = null;
    try {
      if (configurationError) throw new Error(configurationError);
      const token = await storage.secureGet(TOKEN_KEY, '');
      if (op !== generation.current) return;
      if (!isUsableToken(token)) {
        setClientToken(null); setUser(null);
        if (token) await enqueue(() => storage.secureRemove(TOKEN_KEY));
        return;
      }
      setClientToken(token);
      const me = normalizeUser(await getMe());
      if (op === generation.current) setUser(me);
    } catch (error: any) {
      if (op !== generation.current) return;
      if (error?.response?.status === 401) await logout();
      else failure = errMessage(error); // Offline/5xx must NOT delete a valid session.
    } finally {
      if (op === generation.current) setBootstrap({ loading: false, error: failure });
    }
  }, [enqueue, logout]);

  const commitSession = async (res: AuthResponse, op: number) => {
    if (op !== generation.current) return;
    if (!isUsableToken(res?.access_token)) throw new Error('Sign-in returned an invalid session. Please retry.');
    const me = normalizeUser(res?.user);
    const saved = await enqueue(() => op === generation.current ? storage.secureSet(TOKEN_KEY, res.access_token) : Promise.resolve(false));
    if (op !== generation.current) return;
    if (!saved) throw new Error('Could not save your secure session on this device. Please try again.');
    setClientToken(res.access_token); setUser(me); setBootstrap({ loading: false, error: null });
  };
  const setSession = (res: AuthResponse) => commitSession(res, ++generation.current);
  const authenticate = async (request: () => Promise<AuthResponse>) => {
    const op = ++generation.current; await commitSession(await request(), op);
  };
  const refreshUser = async () => {
    const op = generation.current, me = normalizeUser(await getMe());
    if (op === generation.current) setUser(me);
  };
  useEffect(() => {
    setUnauthorizedHandler(() => { void logout(); });
    void retryStartup();
    return () => { generation.current++; setUnauthorizedHandler(null); };
  }, [logout, retryStartup]);

  useEffect(() => {
    if (!navigation?.key || bootstrapping || startupError) return;
    const inAuth = segments[0] === '(auth)';
    const publicScreen = ['scan-report', 'scan'].includes(segments[0] ?? '');
    if (!user && !inAuth && !publicScreen) router.replace('/(auth)/login');
    else if (user && inAuth) router.replace('/(tabs)/security');
  }, [user, segments, bootstrapping, startupError, navigation?.key, router]);

  return <AuthContext.Provider value={{ user, bootstrapping, startupError, retryStartup, setSession,
    login: (email, password) => authenticate(() => apiLogin(email, password)),
    register: (name, email, phone, password) => authenticate(() => apiRegister(name, email, phone, password)),
    verifyOtp: (phone, code, name) => authenticate(() => apiOtpVerify(phone, code, name)), refreshUser, logout,
  }}>{children}</AuthContext.Provider>;
}
export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};