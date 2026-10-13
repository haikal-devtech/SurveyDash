export function authBaseUrl() {
  if (process.env.VERCEL_ENV === 'preview' && process.env.VERCEL_URL)
    return `https://${process.env.VERCEL_URL}`;
  return process.env.BETTER_AUTH_URL ?? 'http://localhost:3100';
}
export function trustedOrigins() {
  const base = new URL(authBaseUrl());
  const origins = [base.origin];
  if (process.env.VERCEL_URL) origins.push(`https://${process.env.VERCEL_URL}`);
  if (base.hostname === 'localhost' || base.hostname === '127.0.0.1') {
    origins.push(`${base.protocol}//localhost:${base.port}`, `${base.protocol}//127.0.0.1:${base.port}`);
  }
  return [...new Set(origins)];
}
