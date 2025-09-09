'use client';

import { Wifi, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function OfflinePage() {
  const handleRetry = () => {
    window.location.reload();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="max-w-md mx-auto text-center p-8">
        <div className="mb-8">
          <div className="relative">
            <Wifi className="w-24 h-24 mx-auto text-gray-300 dark:text-gray-600" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-6 h-6 bg-red-500 rounded-full animate-pulse" />
            </div>
          </div>
        </div>
        
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
          You're Currently Offline
        </h1>
        
        <p className="text-gray-600 dark:text-gray-300 mb-8 leading-relaxed">
          It looks like there's an issue with your network connection. Please check your connection and try again.
        </p>
        
        <div className="space-y-4">
          <Button 
            onClick={handleRetry}
            className="w-full flex items-center justify-center gap-2"
            size="lg"
          >
            <RefreshCw className="w-4 h-4" />
            Reconnect
          </Button>
          
          <div className="text-sm text-gray-500 dark:text-gray-400">
            <p>You can try:</p>
            <ul className="mt-2 space-y-1 text-left">
              <li>• Check your WiFi or mobile data connection</li>
              <li>• Refresh the page</li>
              <li>• Try again later</li>
            </ul>
          </div>
        </div>
        
        <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <p className="text-sm text-blue-700 dark:text-blue-300">
            💡 Studify supports offline browsing of cached content. Some features may not be available while offline.
          </p>
        </div>
      </div>
    </div>
  );
}
