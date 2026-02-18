import { getMicroskillContextByKey } from '@/lib/curriculum/server';
import { absoluteUrl } from '@/lib/seo';

export async function generateMetadata({ params }) {
  const resolvedParams = await params;
  const { microskillId: microskillKey } = resolvedParams;
  const { microskill, subject, grade } = await getMicroskillContextByKey(microskillKey);

  const skillTitle = microskill ? `${microskill.code} ${microskill.name}` : 'Practice Skill';
  const title = `Practice: ${skillTitle}`;
  const description = grade && subject
    ? `Practice ${skillTitle} in ${subject.name} for ${grade.name}.`
    : `Practice interactive skill questions for ${skillTitle}.`;
  const path = microskill?.slug ? `/practice/${microskill.slug}` : `/practice/${microskillKey}`;

  return {
    title,
    description,
    alternates: {
      canonical: path,
    },
    openGraph: {
      title,
      description,
      url: absoluteUrl(path),
      type: 'website',
    },
    robots: {
      index: false,
      follow: false,
      googleBot: {
        index: false,
        follow: false,
      },
    },
  };
}

export default function PracticeLayout({ children }) {
  return children;
}
