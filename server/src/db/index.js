import { useSupabase } from '../config.js';
import { jsonStore } from './jsonStore.js';

// Supabase is used automatically when SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY are set.
export const db = useSupabase ? (await import('./supabaseStore.js')).supabaseStore : jsonStore;
