import { Metadata } from "next";
import { getTranslations } from 'next-intl/server';
import StudentList from "@/components/tutor/student-content/student-list";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('TutorStudentPage');

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

export default async function TutorStudentPage() {
  const t = await getTranslations('TutorStudentPage');

  return (
    <div>
      <StudentList />
    </div>
  );
}