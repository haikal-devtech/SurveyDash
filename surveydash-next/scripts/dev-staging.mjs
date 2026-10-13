import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
process.loadEnvFile('.env.staging.local');
process.argv = [process.execPath, 'next', 'dev', '--hostname', '127.0.0.1', '--port', '3100'];
await import(pathToFileURL(resolve('node_modules/next/dist/bin/next')).href);
