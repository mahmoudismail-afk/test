'use server';

import { createClient } from '@supabase/supabase-js';
import { query } from '@/lib/db';

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder';
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

// ── Create staff account ─────────────────────────────────────
export async function createStaffAccount(data: {
  username: string;
  password: string;
  fullName: string;
  phone: string;
  role: 'staff' | 'admin';
}) {
  const admin = getAdminClient();
  const email = `${data.username.trim()}@possystem.local`;

  const { data: user, error: createError } = await admin.auth.admin.createUser({
    email,
    password: data.password,
    email_confirm: true,
    user_metadata: { full_name: data.fullName, phone: data.phone, role: data.role },
  });

  if (createError) return { error: createError.message };

  // Upsert the profile row via admin client (reliable write)
  if (user.user) {
    const { error } = await admin
      .from('profiles')
      .upsert(
        { auth_id: user.user.id, role: data.role, full_name: data.fullName, phone: data.phone, email },
        { onConflict: 'auth_id' }
      );
    if (error) console.error('[createStaffAccount] profile upsert:', error.message);
  }

  return { success: true };
}

// ── Delete user ──────────────────────────────────────────────
export async function deleteUser(profileId: string, authId?: string | null) {
  if (!profileId) return { error: 'No profile ID provided' };

  const admin = getAdminClient();

  // Delete profile row
  const { error: delErr } = await admin.from('profiles').delete().eq('id', profileId);
  if (delErr) return { error: `Profile deletion failed: ${delErr.message}` };

  // Delete auth user if available
  if (authId) {
    const { error } = await admin.auth.admin.deleteUser(authId);
    if (error && !error.message.toLowerCase().includes('user not found')) {
      return { error: `Auth deletion failed: ${error.message}` };
    }
  }

  return { success: true };
}

// ── Update profile ───────────────────────────────────────────
export async function updateProfile(profileId: string, data: { full_name: string; phone: string }) {
  try {
    const admin = getAdminClient();
    const { error } = await admin
      .from('profiles')
      .update({ full_name: data.full_name, phone: data.phone })
      .eq('id', profileId);
    if (error) throw new Error(error.message);
    return { success: true };
  } catch (err: any) {
    return { error: err.message };
  }
}

// ── Get staff permissions ────────────────────────────────────
export async function getStaffPermissions(): Promise<string[]> {
  try {
    const { rows } = await query(
      "SELECT value FROM system_settings WHERE key = $1 LIMIT 1",
      ['staff_permissions']
    );
    let val = rows[0]?.value;
    if (typeof val === 'string') {
      try { val = JSON.parse(val); } catch { /* ignore */ }
    }
    return Array.isArray(val) ? val : ['pos'];
  } catch (err) {
    console.error("Error fetching staff permissions:", err);
    return ['pos'];
  }
}

// ── Save staff permissions ───────────────────────────────────
export async function saveStaffPermissions(permissions: string[]) {
  try {
    const admin = getAdminClient();
    const { error } = await admin
      .from('system_settings')
      .upsert({ key: 'staff_permissions', value: JSON.stringify(permissions) }, { onConflict: 'key' });
    if (error) throw new Error(error.message);
    return { success: true };
  } catch (err: any) {
    return { error: err.message };
  }
}

// ── Get LBP rate ─────────────────────────────────────────────
export async function getLbpRate(): Promise<number> {
  try {
    const { rows } = await query(
      "SELECT value FROM system_settings WHERE key = $1 LIMIT 1",
      ['lbp_rate']
    );
    const rate = Number(rows[0]?.value);
    return !isNaN(rate) && rate > 0 ? rate : 89500;
  } catch (err) {
    console.error("Error fetching LBP rate:", err);
    return 89500;
  }
}

// ── Save LBP rate ────────────────────────────────────────────
export async function saveLbpRate(rate: number) {
  try {
    const admin = getAdminClient();
    const { error } = await admin
      .from('system_settings')
      .upsert({ key: 'lbp_rate', value: String(rate) }, { onConflict: 'key' });
    if (error) throw new Error(error.message);
    return { success: true };
  } catch (err: any) {
    return { error: err.message };
  }
}
