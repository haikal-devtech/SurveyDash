import { existsSync, writeFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { spawnSync } from 'node:child_process';
if (!existsSync('.env.local')) {
  writeFileSync(
    '.env.local',
    `BETTER_AUTH_SECRET=${randomBytes(48).toString('base64url')}\nBETTER_AUTH_URL=http://localhost:3100\nSTUDIO_DB_PATH=.data/studio.sqlite\n`,
  );
  console.log('Konfigurasi lokal dibuat.');
}
const result = spawnSync(process.execPath, ['--env-file=.env.local', '--import', 'tsx', 'scripts/setup.ts'], {
  stdio: 'inherit',
});
process.exit(result.status ?? 1);
