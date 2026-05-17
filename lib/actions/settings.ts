'use server';

import { createClient } from '@supabase/supabase-js';

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder';
  
  return createClient(url, key);
}

export async function createStaffAccount(data: {
  username: string;
  password: string;
  fullName: string;
  phone: string;
  role: 'staff' | 'admin';
}) {
  const supabaseAdmin = getAdminClient();
  const email = `${data.username.trim()}@salonraed.local`;

  const { data: user, error: createError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password: data.password,
    email_confirm: true,
    user_metadata: { full_name: data.fullName, phone: data.phone, role: data.role },
  });

  if (createError) return { error: createError.message };

  // Update profile role (the trigger creates the profile with role from metadata)
  if (user.user) {
    await supabaseAdmin
      .from('profiles')
      .update({ role: data.role, full_name: data.fullName, phone: data.phone })
      .eq('auth_id', user.user.id);
  }

  return { success: true };
}

export async function deleteUser(profileId: string, authId?: string | null) {
  if (!profileId) return { error: 'No profile ID provided' };
  
  const supabaseAdmin = getAdminClient();
  
  // Delete the profile first
  const { error: profileError } = await supabaseAdmin.from('profiles').delete().eq('id', profileId);
  if (profileError) return { error: `Profile deletion failed: ${profileError.message}` };

  // Then try to delete the auth user (if an authId exists)
  if (authId) {
    const { error } = await supabaseAdmin.auth.admin.deleteUser(authId);
    // If the auth user was already deleted from the dashboard, ignore the "User not found" error
    if (error && !error.message.toLowerCase().includes('user not found')) {
      return { error: `Auth deletion failed: ${error.message}` };
    }
  }
  
  return { success: true };
}

export async function updateProfile(profileId: string, data: { full_name: string; phone: string }) {
  const supabaseAdmin = getAdminClient();
  const { error } = await supabaseAdmin
    .from('profiles')
    .update({ full_name: data.full_name, phone: data.phone })
    .eq('id', profileId);
  if (error) return { error: error.message };
  return { success: true };
}

export async function getStaffPermissions(): Promise<string[]> {
  const supabaseAdmin = getAdminClient();
  const { data } = await supabaseAdmin
    .from('system_settings')
    .select('value')
    .eq('key', 'staff_permissions')
    .single();
    
  let val = data?.value;
  if (typeof val === 'string') {
    try {
      val = JSON.parse(val);
    } catch (e) {
      // ignore
    }
  }
  
  return Array.isArray(val) ? val : ['dashboard', 'members', 'checkins', 'classes'];
}

export async function saveStaffPermissions(permissions: string[]) {
  const supabaseAdmin = getAdminClient();
  const { error } = await supabaseAdmin
    .from('system_settings')
    .upsert({ key: 'staff_permissions', value: permissions });
  if (error) return { error: error.message };
  return { success: true };
}

export async function getLbpRate(): Promise<number> {
  const supabaseAdmin = getAdminClient();
  const { data } = await supabaseAdmin
    .from('system_settings')
    .select('value')
    .eq('key', 'lbp_rate')
    .single();
  const rate = Number(data?.value);
  return !isNaN(rate) && rate > 0 ? rate : 89500;
}

export async function saveLbpRate(rate: number) {
  const supabaseAdmin = getAdminClient();
  const { error } = await supabaseAdmin
    .from('system_settings')
    .upsert({ key: 'lbp_rate', value: rate });
  if (error) return { error: error.message };
  return { success: true };
}
