import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export default async function POSLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  return (
    <div style={{ width: '100vw', height: '100dvh', overflow: 'hidden' }}>
      {children}
    </div>
  );
}
