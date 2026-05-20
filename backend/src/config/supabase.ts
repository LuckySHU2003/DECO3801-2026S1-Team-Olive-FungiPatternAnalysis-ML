import { createClient } from '@supabase/supabase-js';
import { env } from './env.js';

// persistSession: false — service role key is server-side only and must not be cached in a session store
export const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
});
