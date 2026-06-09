import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

async function fixProfile() {
  console.log('Fetching users to find admin@amagym.local...');
  const { data: usersData, error: usersError } = await supabaseAdmin.auth.admin.listUsers();
  
  if (usersError) {
    console.error('Error fetching users:', usersError);
    return;
  }

  const user = usersData.users.find(u => u.email === 'admin@amagym.local');
  
  if (!user) {
    console.error('User admin@amagym.local not found in auth.users!');
    return;
  }

  console.log(`Found auth user: ${user.id}`);
  
  // Check if profile exists
  const { data: existingProfile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('*')
    .eq('auth_id', user.id)
    .single();

  if (profileError && profileError.code !== 'PGRST116') {
    console.error('Error checking profile:', profileError);
  }

  if (existingProfile) {
    console.log('Profile already exists for this user:', existingProfile);
    // Maybe the role is not set correctly?
    if (existingProfile.role !== 'admin') {
      console.log('Updating role to admin...');
      await supabaseAdmin.from('profiles').update({ role: 'admin' }).eq('id', existingProfile.id);
    }
  } else {
    console.log('Profile not found. Creating profile...');
    const { data: newProfile, error: insertError } = await supabaseAdmin
      .from('profiles')
      .insert({
        auth_id: user.id,
        full_name: 'System Admin',
        email: 'admin@amagym.local',
        role: 'admin'
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error creating profile:', insertError);
    } else {
      console.log('Successfully created profile:', newProfile);
    }
  }
}

fixProfile();
