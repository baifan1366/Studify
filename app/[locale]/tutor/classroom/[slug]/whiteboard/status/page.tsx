import { Metadata } from 'next';
import DebugStatus from '@/components/classroom/whiteboard/debug-status';

interface Props {
  params: Promise<{
    locale: string;
    slug: string;
  }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  
  return {
    title: `Whiteboard Status - ${slug} | Studify`,
    description: 'Whiteboard system status and diagnostics',
  };
}

export default async function WhiteboardStatusPage({ params }: Props) {
  const { slug } = await params;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="py-8 px-4">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-center mb-2">Whiteboard System Diagnostics</h1>
          <p className="text-gray-600 text-center">Comprehensive status check for classroom: {slug}</p>
        </div>
        <DebugStatus classroomSlug={slug} />
      </div>
    </div>
  );
}
