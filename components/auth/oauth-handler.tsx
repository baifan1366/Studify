"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/utils/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { BookOpen, GraduationCap } from "lucide-react";
import { motion } from "framer-motion";

interface OAuthHandlerProps {
  locale: string;
}

export function OAuthHandler({ locale }: OAuthHandlerProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isProcessing, setIsProcessing] = useState(false);
  const [showRoleDialog, setShowRoleDialog] = useState(false);
  const [pendingSession, setPendingSession] = useState<any>(null);

  const handleRoleSelection = async (selectedRole: 'student' | 'tutor') => {
    setShowRoleDialog(false);
    setIsProcessing(true);
    
    if (!pendingSession) return;
    
    console.log('🎯 User selected role:', selectedRole);
    
    // Call sync API with selected role
    const syncResponse = await fetch("/api/auth/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        access_token: pendingSession.access_token,
        role: selectedRole
      }),
    });

    if (syncResponse.ok) {
      const syncResult = await syncResponse.json();
      console.log('✅ Sync successful:', syncResult);
      
      // Role-based redirect
      const userRole = syncResult?.user?.role || selectedRole;
      const redirectPaths = {
        student: `/${locale}/home`,
        tutor: `/${locale}/tutor/dashboard`, 
        admin: `/${locale}/admin/dashboard`
      };
      
      const redirectPath = redirectPaths[userRole as keyof typeof redirectPaths] || `/${locale}/home`;
      console.log('🔄 Redirecting OAuth user to:', redirectPath);
      
      router.replace(redirectPath);
    } else {
      console.error('❌ Sync failed');
      setIsProcessing(false);
    }
  };

  useEffect(() => {
    const handleOAuthCallback = async () => {
      // Check if we have OAuth callback parameters
      const code = searchParams.get('code');
      const error = searchParams.get('error');
      const type = searchParams.get('type');

      if (error) {
        console.error('OAuth error:', error);
        return;
      }

      if (code && !isProcessing) {
        setIsProcessing(true);
        console.log('Processing OAuth/Email callback with code:', code);

        try {
          // Check if this is an email confirmation (type=signup or type=recovery)
          // or if we're already on sign-in page (email confirmation links redirect here)
          const isEmailConfirmation = type === 'signup' || type === 'recovery' || window.location.pathname.includes('/sign-in');
          
          if (isEmailConfirmation) {
            // For email confirmations, redirect to the callback API route
            // which will handle exchangeCodeForSession on the server
            console.log('Email confirmation detected, redirecting to callback API...');
            const callbackUrl = new URL('/api/auth/callback', window.location.origin);
            callbackUrl.searchParams.set('code', code);
            if (type) callbackUrl.searchParams.set('type', type);
            
            // Preserve the next parameter if it exists
            const next = searchParams.get('next');
            if (next) {
              callbackUrl.searchParams.set('next', next);
            } else {
              // Set default next path based on locale
              callbackUrl.searchParams.set('next', `/${locale}/home`);
            }
            
            console.log('Redirecting to:', callbackUrl.toString());
            window.location.href = callbackUrl.toString();
            return;
          }

          // For OAuth logins (Google, etc.), wait for auth state change
          const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, session) => {
              console.log('Auth state change:', event);

              if (event === 'SIGNED_IN' && session) {
                console.log('User signed in via OAuth, syncing...');
                console.log('🔍 Session user data:', {
                  id: session.user.id,
                  email: session.user.email,
                  user_metadata: session.user.user_metadata,
                  identities: session.user.identities?.[0]?.identity_data
                });
                
                // Extract role from URL params if available
                const role = searchParams.get('role');
                console.log('🎯 OAuth role from URL:', role);
                
                // If no role provided, check if user has a profile
                if (!role) {
                  console.log('🔍 No role provided, checking for existing profile...');
                  const { data: profile, error: profileError } = await supabase
                    .from('profiles')
                    .select('id, role')
                    .eq('user_id', session.user.id)
                    .single();
                  
                  if (profileError && profileError.code === 'PGRST116') {
                    // Profile doesn't exist - show role selection dialog
                    console.log('🎭 No profile found, showing role selection dialog');
                    setPendingSession(session);
                    setShowRoleDialog(true);
                    subscription.unsubscribe();
                    return;
                  }
                  
                  console.log('✅ Existing profile found:', profile);
                }
                
                // Call our sync API to set up JWT session
                const syncResponse = await fetch("/api/auth/sync", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ 
                    access_token: session.access_token,
                    role: role || undefined
                  }),
                });

                if (syncResponse.ok) {
                  const syncResult = await syncResponse.json();
                  console.log('✅ Sync successful:', syncResult);
                  console.log('👤 User data from sync:', {
                    id: syncResult?.user?.id,
                    name: syncResult?.user?.name,
                    email: syncResult?.user?.email,
                    role: syncResult?.user?.role
                  });
                  
                  // Role-based redirect
                  const userRole = syncResult?.user?.role || 'student';
                  const redirectPaths = {
                    student: `/${locale}/home`,
                    tutor: `/${locale}/tutor/dashboard`, 
                    admin: `/${locale}/admin/dashboard`
                  };
                  
                  const redirectPath = redirectPaths[userRole as keyof typeof redirectPaths] || `/${locale}/home`;
                  console.log('🔄 Redirecting OAuth user to:', redirectPath);
                  
                  // Clean up subscription before redirect
                  subscription.unsubscribe();
                  router.replace(redirectPath);
                } else {
                  const errorText = await syncResponse.text();
                  console.error('❌ Sync failed:', {
                    status: syncResponse.status,
                    statusText: syncResponse.statusText,
                    body: errorText
                  });
                  subscription.unsubscribe();
                  setIsProcessing(false);
                }
              }
            }
          );

          // Clean up after a timeout
          setTimeout(() => {
            subscription.unsubscribe();
            if (isProcessing) {
              setIsProcessing(false);
            }
          }, 10000);

        } catch (err) {
          console.error('OAuth callback error:', err);
          setIsProcessing(false);
        }
      }
    };

    handleOAuthCallback();
  }, [searchParams, router, locale, isProcessing]);

  if (isProcessing) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg">
          <div className="flex items-center space-x-3">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            <span className="text-gray-700 dark:text-gray-300">Processing login...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Role Selection Dialog */}
      <Dialog open={showRoleDialog} onOpenChange={setShowRoleDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center">Choose Your Account Type</DialogTitle>
            <DialogDescription className="text-center">
              Please select how you want to use Studify
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 mt-6">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleRoleSelection('student')}
              className="flex flex-col items-center p-6 border-2 border-gray-200 dark:border-gray-700 rounded-lg hover:border-[#FF6B00] dark:hover:border-[#FF6B00] transition-colors duration-200 group"
            >
              <BookOpen className="h-12 w-12 text-gray-400 group-hover:text-[#FF6B00] transition-colors duration-200" />
              <h3 className="mt-3 font-semibold text-gray-900 dark:text-gray-100 group-hover:text-[#FF6B00] transition-colors duration-200">
                Student
              </h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 text-center">
                Learn and explore courses
              </p>
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleRoleSelection('tutor')}
              className="flex flex-col items-center p-6 border-2 border-gray-200 dark:border-gray-700 rounded-lg hover:border-[#FF6B00] dark:hover:border-[#FF6B00] transition-colors duration-200 group"
            >
              <GraduationCap className="h-12 w-12 text-gray-400 group-hover:text-[#FF6B00] transition-colors duration-200" />
              <h3 className="mt-3 font-semibold text-gray-900 dark:text-gray-100 group-hover:text-[#FF6B00] transition-colors duration-200">
                Tutor
              </h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 text-center">
                Teach and create courses
              </p>
            </motion.button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
