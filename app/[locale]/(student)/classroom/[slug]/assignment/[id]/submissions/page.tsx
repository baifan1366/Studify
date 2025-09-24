import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { AssignmentSubmissionsPageComponent } from '@/components/classroom/submissions/assignment-submissions-page';

interface AssignmentSubmissionsPageProps {
  params: Promise<{
    locale: string;
    slug: string;
    id: string;
  }>;
}

export async function generateMetadata({ params }: AssignmentSubmissionsPageProps): Promise<Metadata> {
  const { locale, slug, id } = await params;
  
  return {
    title: `Assignment ${id} Submissions - ${slug}`,
    description: `View and manage submissions for assignment ${id}`,
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
