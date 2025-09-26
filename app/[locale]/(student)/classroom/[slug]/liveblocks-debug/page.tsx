import { Metadata } from 'next';
import { LiveblocksDebug } from '@/components/classroom/liveblocks/liveblocks-debug';

interface Props {
  params: Promise<{
    locale: string;
    slug: string;
  }>;
  searchParams: Promise<{
    session?: string;
  }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  
  return {
    title: `Liveblocks Debug - ${slug} | Studify`,
    description: 'Liveblocks system diagnostics and troubleshooting',
  };
}

export default async function LiveblocksDebugPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { session } = await searchParams;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="py-8 px-4">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-center mb-2">Liveblocks 系统诊断</h1>
          <p className="text-gray-600 text-center">检查 Liveblocks 配置和连接状态</p>
        </div>
        <LiveblocksDebug classroomSlug={slug} sessionId={session} />
      </div>
    </div>
  );
}
