import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import DashboardShell from '@/components/layout/DashboardShell';
import { getStaffPermissions } from '@/lib/actions/settings';
import { query } from '@/lib/db';
import './dashboard.css';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // Run profile fetch + staff permissions in parallel via the fast Hyperdrive pool
  const [profileResult, staffPermissions] = await Promise.all([
    query(
      'SELECT full_name, email, avatar_url, role FROM profiles WHERE auth_id = $1 LIMIT 1',
      [user.id]
    ),
    getStaffPermissions(),
  ]);

  const profile = profileResult.rows[0] ?? null;
  if (!profile) redirect('/login?error=account-disabled');

  const displayName = profile.full_name || user.email?.split('@')[0] || 'Admin';
  const displayEmail = (profile.email?.includes('@amagym.local') || profile.email?.includes('@salonraed.local')) ? '' : (profile.email ?? '');
  const role: string = profile.role ?? 'staff';

  return (
    <DashboardShell
      userName={displayName}
      userEmail={displayEmail}
      avatarUrl={profile.avatar_url ?? undefined}
      role={role}
      staffPermissions={staffPermissions}
    >
      {children}
    </DashboardShell>
  );
}
