'use client';

import { useSearchParams } from 'next/navigation';

export default function SuccessPage() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-green-600 mb-2">Payment Successful!</h1>
      <p>Session ID: {sessionId}</p>
    </div>
  );
}
