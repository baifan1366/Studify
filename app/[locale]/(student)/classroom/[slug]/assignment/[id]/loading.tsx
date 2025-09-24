import { Skeleton } from '@/components/ui/skeleton';

export default function AssignmentLoading() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="text-center space-y-4">
        <Skeleton className="h-8 w-64 mx-auto" />
        <Skeleton className="h-4 w-96 mx-auto" />
      </div>
    </div>
  );
}
