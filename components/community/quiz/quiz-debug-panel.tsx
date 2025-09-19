"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bug, Eye, EyeOff } from "lucide-react";

interface QuizDebugPanelProps {
  attemptId: number | null;
  currentQuestionIndex: number;
  session: any;
  remainingTime: number | null;
  isExpired: boolean;
}

export default function QuizDebugPanel({
  attemptId,
  currentQuestionIndex,
  session,
  remainingTime,
  isExpired
}: QuizDebugPanelProps) {
  const [isVisible, setIsVisible] = useState(false);

  if (process.env.NODE_ENV !== 'development') {
    return null; // 只在开发环境显示
  }

  if (!isVisible) {
    return (
      <Button
        variant="outline"
        size="sm"
        className="fixed bottom-4 right-4 z-50"
        onClick={() => setIsVisible(true)}
      >
        <Bug className="h-4 w-4" />
      </Button>
    );
  }

  const formatTime = (seconds: number | null) => {
    if (seconds === null) return "∞";
    if (seconds <= 0) return "00:00";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Card className="fixed bottom-4 right-4 z-50 w-80 max-h-96 overflow-y-auto">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Bug className="h-4 w-4" />
            Quiz Debug Panel
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsVisible(false)}
          >
            <EyeOff className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 text-xs">
        {/* Attempt Info */}
        <div>
          <div className="font-semibold mb-1">Attempt Info:</div>
          <div>ID: {attemptId || 'None'}</div>
          <div>Current Question: {currentQuestionIndex}</div>
        </div>

        {/* Session Info */}
        <div>
          <div className="font-semibold mb-1">Session Info:</div>
          {session ? (
            <>
              <div>Status: <Badge variant="outline">{session.status}</Badge></div>
              <div>Session Index: {session.current_question_index}</div>
              <div>Time Limit: {session.time_limit_minutes ? `${session.time_limit_minutes}min` : 'None'}</div>
              <div>Time Spent: {Math.floor(session.time_spent_seconds / 60)}:{(session.time_spent_seconds % 60).toString().padStart(2, '0')}</div>
              <div>Remaining: {formatTime(remainingTime)}</div>
              <div>Expired: <Badge variant={isExpired ? "destructive" : "secondary"}>{isExpired ? 'Yes' : 'No'}</Badge></div>
              <div>Token: {session.session_token?.substring(0, 8)}...</div>
            </>
          ) : (
            <div className="text-gray-500">No session</div>
          )}
        </div>

        {/* Actions */}
        <div>
          <div className="font-semibold mb-1">Debug Actions:</div>
          <div className="space-y-1">
            <Button
              variant="outline"
              size="sm"
              className="w-full text-xs"
              onClick={() => {
                console.log('Current State:', {
                  attemptId,
                  currentQuestionIndex,
                  session,
                  remainingTime,
                  isExpired
                });
              }}
            >
              Log State to Console
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="w-full text-xs"
              onClick={async () => {
                if (attemptId) {
                  try {
                    const response = await fetch(`/api/community/quizzes/current/current-attempt`);
                    const data = await response.json();
                    console.log('Current Attempt API Response:', data);
                  } catch (error) {
                    console.error('Failed to fetch current attempt:', error);
                  }
                }
              }}
            >
              Refresh Current Attempt
            </Button>
            {session && (
              <Button
                variant="outline"
                size="sm"
                className="w-full text-xs"
                onClick={async () => {
                  if (attemptId) {
                    try {
                      const response = await fetch(`/api/community/quizzes/current/attempts/${attemptId}/session`);
                      const data = await response.json();
                      console.log('Session API Response:', data);
                    } catch (error) {
                      console.error('Failed to fetch session:', error);
                    }
                  }
                }}
              >
                Refresh Session
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
