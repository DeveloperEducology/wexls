import { getSiteUrl } from '@/lib/seo';
import { getHomeGradesData } from '@/lib/curriculum/server';

export default async function sitemap() {
  const siteUrl = getSiteUrl();
  const now = new Date();
  const grades = await getHomeGradesData();

  const baseRoutes = [
    {
      url: `${siteUrl}/`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 1,
    },
  ];

  const skillRoutes = grades.flatMap((grade) => {
    return (grade.subjects || []).map((subject) => ({
      url: `${siteUrl}/skills/${grade.id}/${subject.slug}`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.8,
    }));
  });

  return [...baseRoutes, ...skillRoutes];
}
