const { Client } = require('pg');
const regions = ['us-east-1', 'us-east-2', 'us-west-1', 'us-west-2', 'eu-central-1', 'eu-west-1', 'eu-west-2', 'ap-southeast-1', 'ap-northeast-1', 'ap-south-1', 'sa-east-1', 'ca-central-1'];
async function test() {
  for (const region of regions) {
    const connectionString = `postgresql://postgres.sjqgalckdhimavjcrxck:1UvKvAhRDeLV4e9m@aws-0-${region}.pooler.supabase.com:6543/postgres`;
    const client = new Client({ connectionString, connectionTimeoutMillis: 3000 });
    try {
      await client.connect();
      console.log('SUCCESS: ' + connectionString);
      await client.end();
      return;
    } catch (e) {
      console.log('FAIL ' + region + ': ' + e.message);
    }
  }
}
test();
