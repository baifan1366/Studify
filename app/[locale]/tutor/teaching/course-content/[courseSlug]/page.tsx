import { Metadata } from "next";
import { getTranslations } from 'next-intl/server';
import CourseDetails from '@/components/tutor/course-content/course-details';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('TutorCourseContentDetailsPage');

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

export default async function TutorCourseContentDetailsPage() {
  const t = await getTranslations('TutorCourseContentDetailsPage');

  return (
    <div className="flex flex-col w-full h-full p-6 gap-6">
      <CourseDetails />
    </div>
  );
}