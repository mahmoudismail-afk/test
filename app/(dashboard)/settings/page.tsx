import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import SettingsClient from '@/components/settings/SettingsClient';
import { getStaffPermissions, getLbpRate } from '@/lib/actions/settings';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Settings' };
export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, full_name, email, phone, role, avatar_url')
    .eq('auth_id', user.id)
    .single();

  let allUsers: any[] = [];
  if (profile?.role === 'admin') {
    const { data } = await supabase
      .from('profiles')
      .select('id, auth_id, full_name, email, phone, role, created_at')
      .in('role', ['admin', 'staff'])
      .order('created_at');
    allUsers = data ?? [];
  }

  const [staffPermissions, lbpRate] = await Promise.all([
    getStaffPermissions(),
    getLbpRate(),
  ]);

  return (
    <SettingsClient
      profile={profile}
      userId={user.id}
      allUsers={allUsers}
      staffPermissions={staffPermissions}
      initialLbpRate={lbpRate}
    />
  );
}
