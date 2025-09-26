import { Metadata } from 'next';
import WhiteboardTest from '@/components/classroom/whiteboard/whiteboard-test';

interface Props {
  params: Promise<{
    locale: string;
    slug: string;
  }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  
  return {
    title: `Whiteboard Test - ${slug} | Studify`,
    description: 'Whiteboard system testing interface',
  };
}

export default async function WhiteboardTestPage({ params }: Props) {
  const { slug } = await params;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="py-8">
        <WhiteboardTest classroomSlug={slug} />
      </div>
    </div>
  );
}
