/**
 * One-time admin script: hash the existing app_settings password with bcrypt.
 *
 * Usage:
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/hash-password.mjs
 *
 * Optional: set a new password instead of hashing the current plaintext value:
 *   NEW_PASSWORD='your-new-password' SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/hash-password.mjs
 *
 * Never prints the plaintext password.
 */

import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const newPassword = process.env.NEW_PASSWORD;

if (!url || !key) {
  console.error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const { data, error } = await supabase
  .from('app_settings')
  .select('id, password')
  .eq('id', 1)
  .maybeSingle();

if (error || !data) {
  console.error('Unable to load app_settings');
  process.exit(1);
}

if (!newPassword && typeof data.password === 'string' && data.password.startsWith('$2')) {
  console.log('Password already looks hashed. No changes made.');
  process.exit(0);
}

const source = newPassword || data.password;
if (!source || typeof source !== 'string') {
  console.error('No password available to hash');
  process.exit(1);
}

const hash = await bcrypt.hash(source, 12);

const { error: updateError } = await supabase
  .from('app_settings')
  .update({ password: hash })
  .eq('id', 1);

if (updateError) {
  console.error('Failed to update password hash');
  process.exit(1);
}

console.log('Password hashed successfully.');
