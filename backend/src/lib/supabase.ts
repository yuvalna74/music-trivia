import { createClient } from '@supabase/supabase-js';
import type { Database } from '../../../shared/types/database.js';

const supabaseUrl = process.env.SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export const supabase = createClient<Database>(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false },
});
