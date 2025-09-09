'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download, X } from 'lucide-react';

export function PWAProvider({ children }: { children: React.ReactNode }) {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);

  useEffect(() => {
    // Register Service Worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          console.log('SW registered: ', registration);
          
          // Check for updates
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  // New version available
                  if (confirm('A new version is available. Update now?')) {
                    newWorker.postMessage({ type: 'SKIP_WAITING' });
                    window.location.reload();
                  }
                }
              });
            }
          });
        })
        .catch((registrationError) => {
          console.log('SW registration failed: ', registrationError);
        });
    }

    // PWA install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      
      // Check if already installed
      if (!window.matchMedia('(display-mode: standalone)').matches) {
        setShowInstallPrompt(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Check if already in PWA mode
    if (window.matchMedia('(display-mode: standalone)').matches) {
      console.log('App is running in PWA mode');
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      console.log('User accepted the install prompt');
    } else {
      console.log('User dismissed the install prompt');
    }
    
    setDeferredPrompt(null);
    setShowInstallPrompt(false);
  };

  const handleDismiss = () => {
    setShowInstallPrompt(false);
    setDeferredPrompt(null);
  };

  return (
    <>
      {children}
      
      {/* PWA Install Prompt */}
      {showInstallPrompt && (
        <div className="fixed bottom-4 left-4 right-4 z-50 md:left-auto md:right-4 md:w-80">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border p-4">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <Download className="w-5 h-5 text-blue-600" />
                <h3 className="font-semibold text-sm">Install Studify</h3>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDismiss}
                className="h-6 w-6 p-0"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
              Add Studify to your home screen for a better experience
            </p>
            
            <div className="flex gap-2">
              <Button
                onClick={handleInstallClick}
                size="sm"
                className="flex-1"
              >
                Install
              </Button>
              <Button
                onClick={handleDismiss}
                variant="outline"
                size="sm"
              >
                Later
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
