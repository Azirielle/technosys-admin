const { Client } = require('pg');

const tests = [
  {
    name: 'User format ap-northeast-1 port 6543',
    connectionString: 'postgres://postgres.ggknkdyuglzcnkwhvdak:almandrewrisan123@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres'
  },
  {
    name: 'User format ap-northeast-1 port 5432',
    connectionString: 'postgres://postgres.ggknkdyuglzcnkwhvdak:almandrewrisan123@aws-1-ap-northeast-1.pooler.supabase.com:5432/postgres'
  },
  {
    name: 'DB format ap-northeast-1 port 6543',
    connectionString: 'postgres://postgres:almandrewrisan123@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres.ggknkdyuglzcnkwhvdak'
  },
  {
    name: 'DB format ap-northeast-1 port 5432',
    connectionString: 'postgres://postgres:almandrewrisan123@aws-1-ap-northeast-1.pooler.supabase.com:5432/postgres.ggknkdyuglzcnkwhvdak'
  },
  {
    name: 'User format ap-northeast-1 port 6543 custom db',
    connectionString: 'postgres://postgres.ggknkdyuglzcnkwhvdak:almandrewrisan123@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres.ggknkdyuglzcnkwhvdak'
  }
];

async function run() {
  for (const t of tests) {
    console.log(`\nTesting: ${t.name}...`);
    const client = new Client({
      connectionString: t.connectionString,
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 3000
    });

    try {
      await client.connect();
      console.log(`🎉 Success! Connected using format: ${t.name}`);
      const res = await client.query('SELECT NOW()');
      console.log("DB Time:", res.rows[0]);
      await client.end();
      return;
    } catch (err) {
      console.error(`Failed:`, err.message || err);
    }
  }
  console.log("\nAll formats failed.");
}

run();
