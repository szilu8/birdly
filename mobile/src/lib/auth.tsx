import type { Session } from '@supabase/supabase-js';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { fetchProfile } from './api';
import { unregisterPush } from './push';
import { supabase } from './supabase';
import type { Profile } from './types';

type AuthState = {
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  const userId = session?.user.id;
  const refreshProfile = useCallback(async () => {
    setProfile(userId ? await fetchProfile(userId) : null);
  }, [userId]);

  useEffect(() => {
    let cancelled = false;
    (userId ? fetchProfile(userId) : Promise.resolve(null))
      .then((p) => {
        if (!cancelled) setProfile(p);
      })
      .catch((e) => console.warn('Profil betöltése sikertelen', e));
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const signOut = useCallback(async () => {
    if (userId) await unregisterPush(userId).catch(() => undefined);
    await supabase.auth.signOut();
  }, [userId]);

  const value = useMemo(
    () => ({ session, profile, loading, refreshProfile, signOut }),
    [session, profile, loading, refreshProfile, signOut],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth csak AuthProvider-en belül használható');
  return ctx;
}
