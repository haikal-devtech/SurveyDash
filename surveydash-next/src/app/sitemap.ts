import type { MetadataRoute } from 'next';
export default function sitemap(): MetadataRoute.Sitemap {
  return ['', '/features', '/help', '/contact', '/privacy', '/terms'].map((path) => ({
    url: `https://surveydash-studio.vercel.app${path}`,
    changeFrequency: 'monthly',
    priority: path ? 0.5 : 1,
  }));
}
