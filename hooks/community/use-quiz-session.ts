"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { apiGet, apiSend } from "@/lib/api-config";

interface QuizSession {
  id: number;
  public_id?: string;
  session_token: string;
  status: 'active' | 'expired' | 'completed';
  time_limit_minutes: number | null;
  time_spent_seconds: number;
  current_question_index: number;
  remaining_seconds: number | null;
  is_expired: boolean;
  started_at: string;
  last_activity_at: string;
  server_time: string;
}

interface UseQuizSessionReturn {
  session: QuizSession | null;
  isLoading: boolean;
  error: string | null;
  remainingTime: number | null; // 剩余秒数
  isExpired: boolean;
  startSession: (attemptId: number) => Promise<QuizSession>;
  updateSession: (attemptId: number, updates: { current_question_index?: number }) => Promise<QuizSession>;
  getSession: (attemptId: number) => Promise<QuizSession>;
}

export function useQuizSession(quizSlug: string): UseQuizSessionReturn {
  const [session, setSession] = useState<QuizSession | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [remainingTime, setRemainingTime] = useState<number | null>(null);
  const [isExpired, setIsExpired] = useState(false);

  // 心跳相关
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const currentAttemptIdRef = useRef<number | null>(null);

  // 停止心跳
  const stopHeartbeat = useCallback(() => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }
  }, []);

  // 启动心跳机制（仅发送 ping，不再上传 delta）
  const startHeartbeat = useCallback(
    (attemptId: number, sessionToken: string) => {
      // 清除之前的心跳
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
      }

      heartbeatIntervalRef.current = setInterval(async () => {
        try {
          // 仅发送 session_token，服务器端计算用时
          const response = await apiSend<QuizSession>({
            url: `/api/community/quizzes/${quizSlug}/attempts/${attemptId}/session`,
            method: "PUT",
            body: {
              session_token: sessionToken,
            },
          });

          setSession(response);
          setRemainingTime(response.remaining_seconds);
          setIsExpired(response.is_expired);

          // 如果过期了，停止心跳
          if (response.is_expired || response.status !== "active") {
            stopHeartbeat();
          }
        } catch (error) {
          console.error("Heartbeat failed:", error);
          // 如果心跳失败，可能是 session 过期或网络问题，停止心跳
          stopHeartbeat();
        }
      }, 10000); // 每10秒心跳一次
    },
    [quizSlug, stopHeartbeat]
  );

  // 获取 session
  const getSession = useCallback(
    async (attemptId: number): Promise<QuizSession> => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await apiGet<QuizSession>(
          `/api/community/quizzes/${quizSlug}/attempts/${attemptId}/session`
        );

        // Hydrate internal state so UI (timer) can render after refresh/back/forward
        setSession(response);
        setRemainingTime(response.remaining_seconds);
        setIsExpired(response.is_expired);
        currentAttemptIdRef.current = attemptId;

        // Ensure heartbeat restarts for existing session
        if (response?.session_token) {
          startHeartbeat(attemptId, response.session_token);
        }

        return response;
      } catch (err: any) {
        setError(err.message || "Failed to get session");
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [quizSlug, startHeartbeat]
  );

  // 创建 session
  const startSession = useCallback(
    async (attemptId: number): Promise<QuizSession> => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await apiSend<QuizSession>({
          url: `/api/community/quizzes/${quizSlug}/attempts/${attemptId}/session`,
          method: "POST",
          body: {
            browser_info: {
              userAgent: navigator.userAgent,
              language: navigator.language,
              timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            },
          },
        });

        setSession(response);
        setRemainingTime(response.remaining_seconds);
        setIsExpired(response.is_expired);
        currentAttemptIdRef.current = attemptId;

        // 启动心跳（仅 ping）
        startHeartbeat(attemptId, response.session_token);

        return response;
      } catch (err: any) {
        setError(err.message || "Failed to start session");
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [quizSlug]
  );

  // 更新 session（仅支持心跳 + 进度更新；不再上传 delta）
  const updateSession = useCallback(
    async (
      attemptId: number,
      updates: {
        current_question_index?: number;
      }
    ): Promise<QuizSession> => {
      if (!session) {
        throw new Error("No active session");
      }

      const response = await apiSend<QuizSession>({
        url: `/api/community/quizzes/${quizSlug}/attempts/${attemptId}/session`,
        method: "PUT",
        body: {
          session_token: session.session_token, // 服务器端计算用时
          ...updates,
        },
      });

      setSession(response);
      setRemainingTime(response.remaining_seconds);
      setIsExpired(response.is_expired);

      return response;
    },
    [quizSlug, session]
  );

  // 客户端倒计时（基于服务器时间校准）
  useEffect(() => {
    if (!session || !session.remaining_seconds || session.is_expired) {
      return;
    }

    let localRemainingTime = session.remaining_seconds;
    setRemainingTime(localRemainingTime);

    const countdownInterval = setInterval(() => {
      localRemainingTime -= 1;
      setRemainingTime(Math.max(0, localRemainingTime));

      if (localRemainingTime <= 0) {
        setIsExpired(true);
        clearInterval(countdownInterval);
      }
    }, 1000);

    return () => clearInterval(countdownInterval);
  }, [session?.remaining_seconds, session?.server_time]);

  // 组件卸载时清理
  useEffect(() => {
    return () => {
      stopHeartbeat();
    };
  }, [stopHeartbeat]);

  // 更新当前题目索引的便捷方法
  const updateQuestionIndex = useCallback(
    async (questionIndex: number) => {
      if (!currentAttemptIdRef.current) {
        console.warn("No attempt ID available for updating question index");
        return;
      }

      try {
        const updatedSession = await updateSession(currentAttemptIdRef.current, {
          current_question_index: questionIndex,
        });
        console.log("Question index updated successfully:", questionIndex);
        return updatedSession;
      } catch (error) {
        console.error("Failed to update question index:", error);
        throw error;
      }
    },
    [updateSession]
  );

  // 暴露更新题目索引的方法到全局（可选，用于调试）
  useEffect(() => {
    if (typeof window !== "undefined") {
      (window as any).updateQuizQuestionIndex = updateQuestionIndex;
      return () => {
        delete (window as any).updateQuizQuestionIndex;
      };
    }
  }, [updateQuestionIndex]);

  return {
    session,
    isLoading,
    error,
    remainingTime,
    isExpired,
    startSession,
    updateSession,
    getSession,
  };
}
