import { Metadata } from 'next';
import { notFound } from 'next/navigation';

interface AssignmentPageProps {
  params: Promise<{
    locale: string;
    slug: string;
    id: string;
  }>;
}

export async function generateMetadata({ params }: AssignmentPageProps): Promise<Metadata> {
  const { locale, slug, id } = await params;
  
  return {
    title: `Assignment ${id} - ${slug}`,
    description: `View assignment ${id} details`,
  };
}

export default async function AssignmentPage({ params }: AssignmentPageProps) {
  const { locale, slug, id } = await params;
  
  // For now, redirect to the main assignment page
  // This can be enhanced later to show individual assignment details
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4">Assignment {id}</h1>
        <p className="text-muted-foreground">Individual assignment view - Coming soon</p>
      </div>
    </div>
  );
}
