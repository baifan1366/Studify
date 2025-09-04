import { Metadata } from "next";
import { getTranslations } from 'next-intl/server';
import CreateCourse from '@/components/tutor/course-content/create-course';
import CreateCourseModule from '@/components/tutor/course-content/create-course-module';
import CreateCourseLesson from '@/components/tutor/course-content/create-course-lesson';
import CourseTable from "@/components/tutor/course-content/course-table";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('TutorCourseContentPage');

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

export default async function TutorCourseContentPage() {
  const t = await getTranslations('TutorCourseContentPage');

  return (
    <div className="flex flex-col w-full h-full p-6 gap-6">
      <div className="w-auto">
        <CreateCourse />
      </div>
      <div className="flex-1 w-full">
        <CourseTable />
      </div>
    </div>
  );
}