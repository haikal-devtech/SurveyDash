import type { MetadataRoute } from 'next';
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/studio',
        '/surveyor',
        '/invite/',
        '/api/',
        '/f/',
        '/r/',
        '/p/',
        '/admin',
        '/login',
        '/forgot-password',
        '/reset-password',
      ],
    },
    sitemap: 'https://surveydash-studio.vercel.app/sitemap.xml',
  };
}
