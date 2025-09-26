import { Metadata } from 'next';
import { LiveblocksTest } from '@/components/classroom/liveblocks/liveblocks-test';

interface Props {
  params: Promise<{
    locale: string;
    slug: string;
  }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  
  return {
    title: `Liveblocks Test - ${slug} | Studify`,
    description: 'Simple Liveblocks testing interface',
  };
}

export default async function LiveblocksTestPage({ params }: Props) {
  const { slug } = await params;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="py-8 px-4">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold mb-2">Liveblocks 简单测试</h1>
          <p className="text-gray-600">教室: {slug}</p>
        </div>
        <LiveblocksTest classroomSlug={slug} />
      </div>
    </div>
  );
}
