import { Metadata } from 'next';
import { SimpleTest } from '@/components/classroom/liveblocks/simple-test';

interface Props {
  params: Promise<{
    locale: string;
    slug: string;
  }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  
  return {
    title: `Liveblocks Simple Test - ${slug} | Studify`,
    description: 'Simple Liveblocks configuration check',
  };
}

export default async function LiveblocksSimpleTestPage({ params }: Props) {
  const { slug } = await params;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="py-8 px-4">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold mb-2">Liveblocks 配置检查</h1>
          <p className="text-gray-600">教室: {slug}</p>
        </div>
        <SimpleTest classroomSlug={slug} />
      </div>
    </div>
  );
}
