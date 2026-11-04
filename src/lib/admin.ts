import 'server-only';
import type { User } from '@supabase/supabase-js';

/** Admins are listed by email in ADMIN_EMAILS (comma-separated). */
export function isAdmin(user: Pick<User, 'email'> | null | undefined) {
  const email = user?.email?.toLowerCase();
  if (!email) return false;
  return (process.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
    .includes(email);
}
