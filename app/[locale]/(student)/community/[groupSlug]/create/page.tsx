'use client';

import CreatePostForm from '@/components/community/create-post-form';
import { Suspense } from 'react';
import { useGroupAccess } from '@/hooks/community/use-community';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle } from 'lucide-react';

interface CreatePostPageProps {
  params: {
    groupSlug: string;
  };
}

function LoadingSkeleton() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 p-4">
      <div className="max-w-2xl mx-auto pt-8">
        <div className="mb-8">
          <Skeleton className="h-8 w-64 mb-2 bg-white/10" />
          <Skeleton className="h-4 w-96 bg-white/10" />
        </div>
        <Skeleton className="h-96 w-full bg-white/10" />
      </div>
    </div>
  );
}

function AccessDenied({ groupName }: { groupName?: string }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 p-4">
      <div className="max-w-2xl mx-auto pt-8">
        <div className="bg-red-400/10 border border-red-400 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-3">
            <AlertCircle className="w-6 h-6 text-red-400" />
            <h1 className="text-xl font-bold text-red-400">Access Denied</h1>
          </div>
          <p className="text-gray-300">
            You must be a member of {groupName ? `the "${groupName}"` : 'this private'} group to create posts.
          </p>
        </div>
      </div>
    </div>
  );
}

function ErrorState({ error }: { error: Error }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 p-4">
      <div className="max-w-2xl mx-auto pt-8">
        <div className="bg-red-400/10 border border-red-400 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-3">
            <AlertCircle className="w-6 h-6 text-red-400" />
            <h1 className="text-xl font-bold text-red-400">Error</h1>
          </div>
          <p className="text-gray-300">
            {error.message || 'Failed to load group information. Please try again.'}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function CreatePostPage({ params }: CreatePostPageProps) {
  const { group, canPost, isLoading, isError, error } = useGroupAccess(params.groupSlug);

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  if (isError || !group) {
    return <ErrorState error={error || new Error('Group not found')} />;
  }

  if (!canPost) {
    return <AccessDenied groupName={group.name} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 p-4">
      <div className="max-w-2xl mx-auto pt-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Create New Post</h1>
          <p className="text-gray-300">
            Share your thoughts with the <span className="font-semibold">{group.name}</span> community.
          </p>
        </div>
        
        <Suspense fallback={<Skeleton className="h-96 w-full bg-white/10" />}>
          <CreatePostForm 
            groupSlug={params.groupSlug}
            groupName={group.name}
          />
        </Suspense>
      </div>
    </div>
  );
}
