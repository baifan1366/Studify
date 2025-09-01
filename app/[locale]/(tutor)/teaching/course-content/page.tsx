import { Metadata } from "next";
import { getTranslations } from 'next-intl/server';
import CreateCourse from '@/components/tutor/course-content/create-course';
import CreateCourseModule from '@/components/tutor/course-content/create-course-module';
import CreateCourseLesson from '@/components/tutor/course-content/create-course-lesson';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('CourseContentPage');

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

export default async function CourseContentPage() {
  const t = await getTranslations('CourseContentPage');

  return (
    <div>
      <h1>{t('page_title')}</h1>
      <CreateCourse />
      <CreateCourseModule />
      <CreateCourseLesson />
    </div>
  );
}