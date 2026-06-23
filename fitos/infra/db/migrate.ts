import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { Client } from 'pg';

async function main(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('DATABASE_URL environment variable is not set');
    process.exit(1);
  }

  const client = new Client({ connectionString: databaseUrl });

  const files = readdirSync(__dirname)
    .filter((file) => file.endsWith('.sql'))
    .sort();

  try {
    await client.connect();

    for (const file of files) {
      console.log(`Running ${file}...`);
      const sql = readFileSync(join(__dirname, file), 'utf8');
      await client.query(sql);
    }

    console.log('All migrations complete');
    await client.end();
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    try {
      await client.end();
    } catch {
      // ignore errors closing the connection
    }
    process.exit(1);
  }
}

main();
