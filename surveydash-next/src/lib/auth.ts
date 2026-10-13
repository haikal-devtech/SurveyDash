import { betterAuth } from 'better-auth';
import { nextCookies } from 'better-auth/next-js';
import { getAuthDatabase } from './db';
import { authBaseUrl, trustedOrigins } from './origins';

export const auth = betterAuth({
  database: getAuthDatabase(),
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: authBaseUrl(),
  trustedOrigins: trustedOrigins(),
  emailAndPassword: { enabled: true, minPasswordLength: 10 },
  rateLimit: { enabled: true, storage: 'database' },
  plugins: [nextCookies()],
});
