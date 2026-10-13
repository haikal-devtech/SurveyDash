import { getMigrations } from 'better-auth/db/migration';
import { initializeDatabase, closeDatabase } from '../src/lib/db';
import { auth } from '../src/lib/auth';
await initializeDatabase();
const migrations = await getMigrations(auth.options);
await migrations.runMigrations();
await closeDatabase();
console.log('Database SurveyDash Studio siap. Jalankan pnpm dev, lalu buat akun workspace.');
