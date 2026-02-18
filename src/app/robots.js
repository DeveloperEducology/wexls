import { getSiteUrl } from '@/lib/seo';

export default function robots() {
  const siteUrl = getSiteUrl();

  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/'],
        disallow: ['/api/', '/practice/'],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
