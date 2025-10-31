export default function Loading() {
  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    </div>
  );
}
