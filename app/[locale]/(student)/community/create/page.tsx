import CreateGroupForm from '@/components/community/create-group-form';
import { Suspense } from 'react';

export default function CreateGroupPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 p-4">
      <div className="max-w-2xl mx-auto pt-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Create Community Group</h1>
          <p className="text-gray-300">
            Start a new community group to connect with like-minded learners and share knowledge.
          </p>
        </div>
        
        <Suspense fallback={<div className="text-white">Loading...</div>}>
          <CreateGroupForm />
        </Suspense>
      </div>
    </div>
  );
}
