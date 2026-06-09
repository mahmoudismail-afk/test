import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createAdmin() {
  const { data, error } = await supabase.auth.admin.createUser({
    email: 'admin@salonraed.local',
    password: '1234567',
    email_confirm: true,
    user_metadata: { role: 'admin', full_name: 'System Admin' }
  });

  if (error) {
    if (error.message.includes('already registered')) {
        console.log('User already exists. Updating password instead...');
        const { data: usersData } = await supabase.auth.admin.listUsers();
        const user = usersData.users.find(u => u.email === 'admin@salonraed.local');
        if (user) {
            const { error: updateError } = await supabase.auth.admin.updateUserById(user.id, {
                password: '1234567'
            });
            if (updateError) {
                console.error('Error updating password:', updateError);
            } else {
                console.log('Successfully updated password for admin@salonraed.local');
            }
        }
    } else {
        console.error('Error creating admin user:', error);
    }
  } else {
    console.log('Successfully created admin user:', data.user.email);
  }
}

createAdmin();
