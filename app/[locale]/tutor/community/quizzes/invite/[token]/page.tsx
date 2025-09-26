"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle, AlertCircle, Lock, Play, Calendar } from "lucide-react";
import { apiGet, apiSend } from "@/lib/api-config";
import { useUser } from "@/hooks/profile/use-user";

interface InviteInfo {
  quiz: {
    slug: string;
    title: string;
    description: string;
  };
  permission_type: 'view' | 'attempt' | 'edit';
  expires_at?: string;
}

export default function QuizInvitePage() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();
  const { data: currentUser } = useUser();

  const [inviteInfo, setInviteInfo] = useState<InviteInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (token) {
      fetchInviteInfo();
    }
  }, [token]);

  const fetchInviteInfo = async () => {
    try {
      setLoading(true);
      const data = await apiGet<InviteInfo>(`/api/community/quizzes/invite/${token}`);
      setInviteInfo(data);
      setError(null);
    } catch (err: any) {
      setError(err.message || "Failed to load invite information");
      setInviteInfo(null);
    } finally {
      setLoading(false);
    }
  };

  const acceptInvite = async () => {
    if (!currentUser) {
      router.push('/auth/login');
      return;
    }

    try {
      setAccepting(true);
      const response = await apiSend<{ message: string; quiz_slug: string; permission_type: string }>({
        url: `/api/community/quizzes/invite/${token}`,
        method: "POST"
      });

      setSuccess(response.message);
      setError(null);

      // 延迟跳转到quiz页面
      setTimeout(() => {
        router.push(`/community/quizzes/${response.quiz_slug}`);
      }, 2000);

    } catch (err: any) {
      setError(err.message || "Failed to accept invite");
    } finally {
      setAccepting(false);
    }
  };

  const getPermissionLabel = (type: string) => {
    switch (type) {
      case 'view': return 'View Quiz';
      case 'attempt': return 'Attempt Quiz';
      case 'edit': return 'Edit Quiz';
      default: return type;
    }
  };

  const getPermissionDescription = (type: string) => {
    switch (type) {
      case 'view': return 'You can view the quiz content but not attempt it';
      case 'attempt': return 'You can view and attempt the quiz';
      case 'edit': return 'You can view, attempt, and edit the quiz';
      default: return '';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading invite...</p>
        </div>
      </div>
    );
  }

  if (error && !inviteInfo) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <AlertCircle className="h-5 w-5" />
              Invalid Invite
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Alert className="border-red-200 bg-red-50">
              <AlertDescription className="text-red-700">
                {error}
              </AlertDescription>
            </Alert>
          </CardContent>
          <CardFooter>
            <Button 
              onClick={() => router.push('/community/quizzes')}
              variant="outline"
              className="w-full"
            >
              Browse Public Quizzes
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-600">
              <CheckCircle className="h-5 w-5" />
              Access Granted!
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Alert className="border-green-200 bg-green-50">
              <AlertDescription className="text-green-700">
                {success}
              </AlertDescription>
            </Alert>
            <p className="text-sm text-gray-600 mt-3">
              Redirecting you to the quiz...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-orange-500" />
            Quiz Invitation
          </CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {inviteInfo && (
            <>
              <div>
                <h3 className="text-xl font-semibold mb-2">{inviteInfo.quiz.title}</h3>
                {inviteInfo.quiz.description && (
                  <p className="text-gray-600 mb-3">{inviteInfo.quiz.description}</p>
                )}
              </div>

              <div className="flex items-center gap-2">
                <Badge variant="outline" className="flex items-center gap-1">
                  <Play className="h-3 w-3" />
                  {getPermissionLabel(inviteInfo.permission_type)}
                </Badge>
                {inviteInfo.expires_at && (
                  <Badge variant="secondary" className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    Expires {new Date(inviteInfo.expires_at).toLocaleDateString()}
                  </Badge>
                )}
              </div>

              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-sm text-gray-700">
                  <strong>Permission:</strong> {getPermissionDescription(inviteInfo.permission_type)}
                </p>
              </div>

              {error && (
                <Alert className="border-red-200 bg-red-50">
                  <AlertCircle className="h-4 w-4 text-red-500" />
                  <AlertDescription className="text-red-700">
                    {error}
                  </AlertDescription>
                </Alert>
              )}
            </>
          )}
        </CardContent>

        <CardFooter className="flex gap-3">
          {!currentUser ? (
            <>
              <Button 
                onClick={() => router.push('/auth/login')}
                className="flex-1"
              >
                Login to Accept
              </Button>
              <Button 
                onClick={() => router.push('/community/quizzes')}
                variant="outline"
              >
                Cancel
              </Button>
            </>
          ) : (
            <>
              <Button 
                onClick={acceptInvite}
                disabled={accepting}
                className="flex-1"
              >
                {accepting ? "Accepting..." : "Accept Invitation"}
              </Button>
              <Button 
                onClick={() => router.push('/community/quizzes')}
                variant="outline"
              >
                Cancel
              </Button>
            </>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}
