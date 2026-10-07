import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_KEY;

/** Ha hiányzik a .env beállítás, az app egy útmutató képernyőt mutat. */
export const isSupabaseConfigured = Boolean(url && key);

export const supabase = createClient(url ?? 'https://not-configured.supabase.co', key ?? 'not-configured', {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

export const PHOTO_BUCKET = 'photos';

// Mobilon csak előtérben frissítjük a bejelentkezési tokent.
if (Platform.OS !== 'web') {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  });
}
