import { createClient, User } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://nkzccgjsfioizogxyuxl.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5remNjZ2pzZmlvaXpvZ3h5dXhsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU5MzY1NTAsImV4cCI6MjEwMTUxMjU1MH0.2JuACW9DfwZ_Bh9-i4b_hWekaqL2w5xo88BFWo6AO5A';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

export async function checkIsAdmin(user: User | null): Promise<boolean> {
  if (!user) return false;

  // Known admin bypass / app_metadata check
  if (
    user.app_metadata?.role === 'admin' ||
    user.app_metadata?.role === 'super_admin' ||
    user.email === 'adonayforschool@gmail.com' ||
    user.email === 'admin@mebacha.et' ||
    user.email === 'admin@mebacha.com'
  ) {
    return true;
  }

  // Check admin_users table in DB
  try {
    const { data, error } = await supabase
      .from('admin_users')
      .select('id, role')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) {
      console.warn('Error checking admin_users table:', error.message);
      // Fallback check via RPC if available
      const { data: rpcAdmin } = await supabase.rpc('is_admin');
      return !!rpcAdmin;
    }

    return !!data;
  } catch (err) {
    console.error('Failed to verify admin status:', err);
    return false;
  }
}
