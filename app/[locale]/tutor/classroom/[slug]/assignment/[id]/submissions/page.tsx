import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { AssignmentSubmissionsPageComponent } from '@/components/classroom/submissions/assignment-submissions-page';

/**
 * Assignment Submissions Page Component
 * View and manage submissions for a specific assignment
 */

interface AssignmentSubmissionsPageProps {
  params: Promise<{
    locale: string;
    slug: string;
    id: string;
  }>;
}

export async function generateMetadata({ params }: AssignmentSubmissionsPageProps): Promise<Metadata> {
  const t = await getTranslations('AssignmentSubmissionsPage');
  const { locale, slug, id } = await params;
  
  return {
    title: t('metadata_title', { id, slug }),
    description: t('metadata_description', { id }),
    keywords: t('metadata_keywords').split(','),
    openGraph: {
      title: t('og_title', { id, slug }),
      description: t('og_description'),
      type: 'website',
    },
  };
}

export default async function AssignmentSubmissionsPage({ params }: AssignmentSubmissionsPageProps) {
  const { locale, slug, id } = await params;
  
  // Convert string id to number
  const assignmentId = parseInt(id, 10);
  
  if (isNaN(assignmentId)) {
    notFound();
  }
  
  return (
    <div className="container mx-auto px-4 py-8">
      <AssignmentSubmissionsPageComponent 
        assignmentId={assignmentId}
        classroomSlug={slug}
      />
    </div>
  );
}
