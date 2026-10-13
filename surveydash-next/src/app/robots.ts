import type { MetadataRoute } from 'next';
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: '/', disallow: ['/studio', '/api/', '/f/', '/admin', '/login'] },
    sitemap: 'https://surveydash-studio.vercel.app/sitemap.xml',
  };
}
