const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

// Manually parse .env.local
const envContent = fs.readFileSync('.env.local', 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^#=]+)=(.*)$/);
  if (match) env[match[1].trim()] = match[2].trim();
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const data = fs.readFileSync('members.csv', 'utf8');
  const lines = data.split('\n').filter(l => l.trim().length > 0);
  
  // 1: Name, 2: Date of sub, 3: Period, 4: Expiry date, 5: Period(days), 6: Amount, 7: Gender, 8: Phone Number
  
  const periods = new Set();
  const records = [];
  
  // Read records
  for (let i = 1; i < lines.length; i++) {
    // Split by comma. Assuming no commas inside values based on preview.
    const cols = lines[i].split(',').map(c => c.trim());
    if (cols.length < 8) continue;
    
    records.push({
      name: cols[0],
      start_date: parseDate(cols[1]),
      periodName: cols[2],
      end_date: parseDate(cols[3]),
      durationDays: cols[4],
      amount: parseFloat(cols[5].replace('$', '')),
      gender: cols[6] ? cols[6].toLowerCase() : null,
      phone: cols[7]
    });
    periods.add(cols[2]);
  }
  
  console.log(`Found ${records.length} records. Creating plans if needed...`);
  
  const planMap = {};
  for (const p of periods) {
    const { data: existingPlan } = await supabase.from('membership_plans').select('id').eq('name', p).single();
    if (existingPlan) {
      planMap[p] = existingPlan.id;
    } else {
      let days = 30;
      if (p.includes('1 month')) days = 30;
      if (p.includes('3 months')) days = 90;
      if (p.includes('6 months')) days = 180;
      
      const { data: newPlan, error: pErr } = await supabase.from('membership_plans').insert({
        name: p,
        description: `Imported plan - ${p}`,
        price: 0,
        duration_days: days
      }).select('id').single();
      
      if (pErr) {
        console.error('Error creating plan', pErr);
      } else {
        planMap[p] = newPlan.id;
      }
    }
  }

  console.log('Plans prepared:', planMap);
  let successCount = 0;

  for (const r of records) {
    // 1. Profile
    const { data: profile, error: pErr } = await supabase.from('profiles').insert({
      full_name: r.name,
      phone: r.phone,
      role: 'member'
    }).select('id').single();
    
    if (pErr) { console.error(`Error creating profile for ${r.name}`, pErr); continue; }

    // 2. Member
    let gender = r.gender;
    if (gender !== 'male' && gender !== 'female') gender = null;
    
    const { data: member, error: mErr } = await supabase.from('members').insert({
      profile_id: profile.id,
      gender: gender,
      status: 'active'
    }).select('id').single();
    
    if (mErr) { console.error(`Error creating member for ${r.name}`, mErr); continue; }

    // 3. Membership
    const { data: membership, error: memErr } = await supabase.from('memberships').insert({
      member_id: member.id,
      plan_id: planMap[r.periodName],
      start_date: r.start_date,
      end_date: r.end_date,
      status: 'active'
    }).select('id').single();
    
    if (memErr) { console.error(`Error creating membership for ${r.name}`, memErr); continue; }

    // 4. Payment
    if (!isNaN(r.amount) && r.amount > 0) {
      const { error: payErr } = await supabase.from('payments').insert({
        member_id: member.id,
        membership_id: membership.id,
        amount: r.amount,
        payment_method: 'cash',
        payment_date: r.start_date
      });
      if (payErr) console.error(`Error creating payment for ${r.name}`, payErr);
    }
    
    successCount++;
    if (successCount % 10 === 0) console.log(`Processed ${successCount}/${records.length} records...`);
  }
  
  console.log(`Import completed! Successfully imported ${successCount} members.`);
}

function parseDate(dStr) {
  // Format: 5-Jan-26 or 05-Jan-26
  if (!dStr) return new Date().toISOString().split('T')[0];
  const parts = dStr.split('-');
  if (parts.length !== 3) return new Date().toISOString().split('T')[0];
  const months = { 'Jan': '01', 'Feb': '02', 'Mar': '03', 'Apr': '04', 'May': '05', 'Jun': '06', 'Jul': '07', 'Aug': '08', 'Sep': '09', 'Oct': '10', 'Nov': '11', 'Dec': '12' };
  
  const day = parts[0].padStart(2, '0');
  const month = months[parts[1]] || '01';
  let year = parts[2];
  if (year.length === 2) year = '20' + year;
  
  return `${year}-${month}-${day}`;
}

main().catch(console.error);
