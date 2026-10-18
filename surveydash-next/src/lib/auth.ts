import { betterAuth, APIError } from 'better-auth';
import { nextCookies } from 'better-auth/next-js';
import { getAuthDatabase } from './db';
import { authBaseUrl, trustedOrigins } from './origins';
import { after } from 'next/server';
import { passwordRecoveryAvailable, sendPasswordResetEmail } from './email';
import { randomUUID } from 'node:crypto';
import { createSurveyorProfile, surveyorRegistration } from './account-repository';
import { AppError } from './repository';

export const auth = betterAuth({
  database: getAuthDatabase(),
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: authBaseUrl(),
  trustedOrigins: trustedOrigins(),
  databaseHooks: {
    user: {
      create: {
        before: async (user) => {
          const registration = surveyorRegistration.getStore();
          if (!registration) return { data: user };
          const id = randomUUID();
          try {
            await createSurveyorProfile(id, registration.profile);
          } catch (error) {
            if (error instanceof AppError && error.status === 409)
              throw new APIError('CONFLICT', { message: error.message, code: 'USERNAME_TAKEN' });
            throw new APIError('INTERNAL_SERVER_ERROR', {
              message: 'Profil Surveyor belum dapat disimpan. Coba lagi.',
              code: 'PROFILE_UNAVAILABLE',
            });
          }
          registration.pendingUserId = id;
          return { data: { ...user, id, name: registration.profile.fullName } };
        },
      },
    },
  },
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
