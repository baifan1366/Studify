import AdminCoursesList from '@/components/admin/courses/admin-courses-list';
import AdminCoursesStats from '@/components/admin/courses/admin-courses-stats';
import { Metadata } from "next";
import { getTranslations } from 'next-intl/server';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('AdminCoursesPage');

  return {
    title: t('metadata_title'),
    description: t('metadata_description'),
    keywords: t('metadata_keywords').split(','),
    openGraph: {
      title: t('og_title'),
      description: t('og_description'),
      type: 'website',
    },
  };
}

export default async function AdminCoursesPage() {
  const t = await getTranslations('AdminCoursesPage');

  return (
      <div className="space-y-6">
        <AdminCoursesStats />
        <AdminCoursesList />
      </div>
  );
}
