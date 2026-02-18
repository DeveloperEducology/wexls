import TeacherAnalyticsClient from './teacher-analytics-client';

export default async function TeacherAnalyticsPage({ searchParams }) {
  const params = await searchParams;
  const initialStudentId = String(params?.studentId || '');
  const initialMicroSkillId = String(params?.microSkillId || '');

  return (
    <TeacherAnalyticsClient
      initialStudentId={initialStudentId}
      initialMicroSkillId={initialMicroSkillId}
    />
  );
}
