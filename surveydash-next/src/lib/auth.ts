import { betterAuth } from 'better-auth';
import { nextCookies } from 'better-auth/next-js';
import { getAuthDatabase } from './db';
import { authBaseUrl, trustedOrigins } from './origins';
import { after } from 'next/server';
import { passwordRecoveryAvailable, sendPasswordResetEmail } from './email';

export const auth = betterAuth({
  database: getAuthDatabase(),
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: authBaseUrl(),
  trustedOrigins: trustedOrigins(),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 10,
    resetPasswordTokenExpiresIn: 1800,
    revokeSessionsOnPasswordReset: true,
    ...(passwordRecoveryAvailable()
      ? {
          sendResetPassword: async ({ user, url }: { user: { name: string; email: string }; url: string }) =>
            sendPasswordResetEmail(user, url),
        }
      : {}),
  },
  advanced: {
    backgroundTasks: {
      handler: (task) => {
        after(() => task);
      },
    },
  },
  rateLimit: {
    enabled: true,
    storage: 'database',
    customRules: { '/request-password-reset': { window: 600, max: 3 } },
  },
  plugins: [nextCookies()],
});
