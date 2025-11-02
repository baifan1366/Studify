"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import {
  X,
  Triangle,
  Square,
  Circle,
  Diamond,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Alert, AlertDescription } from "@/components/ui/alert";

import { useQuizQuestions } from "@/hooks/community/use-quiz-questions";
import {
  useCreateQuizAttempt,
  useSubmitAnswer,
  useCompleteAttempt,
} from "@/hooks/community/use-quiz";
import { useQuizSession } from "@/hooks/community/use-quiz-session";
import { useUser } from "@/hooks/profile/use-user";
import QuizTimer from "@/components/community/quiz/quiz-timer";
import QuizDebugPanel from "@/components/community/quiz/quiz-debug-panel";
import { toast } from "sonner";

const optionStyles = [
  {
    bgColor: "bg-red-500 hover:bg-red-600",
    icon: <Triangle className="h-8 w-8" />,
  },
  {
    bgColor: "bg-blue-500 hover:bg-blue-600",
    icon: <Diamond className="h-8 w-8" />,
  },
  {
    bgColor: "bg-yellow-500 hover:bg-yellow-600",
    icon: <Square className="h-8 w-8" />,
  },
  {
    bgColor: "bg-green-500 hover:bg-green-600",
    icon: <Circle className="h-8 w-8" />,
  },
];

export default function QuizAttemptPage() {
  const t = useTranslations("QuizAttemptPage");
  const { quizSlug } = useParams<{ quizSlug: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: currentUser } = useUser();
  const isTutor = currentUser?.profile?.role === 'tutor';

  // 状态
  const [attemptId, setAttemptId] = useState<number | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [textAnswer, setTextAnswer] = useState("");
  const [selectedAnswers, setSelectedAnswers] = useState<number[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isCreatingAttempt, setIsCreatingAttempt] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [needsSessionParam, setNeedsSessionParam] = useState<boolean>(false);
  const [isNavigatingToSession, setIsNavigatingToSession] =
    useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Hooks
  const { data: questions, isLoading } = useQuizQuestions(quizSlug);
  const { mutateAsync: createAttempt } = useCreateQuizAttempt(quizSlug);
  const { mutateAsync: submitAnswer } = useSubmitAnswer(
    quizSlug,
    attemptId ?? -1
  );
  const { mutateAsync: completeAttempt } = useCompleteAttempt(
    quizSlug,
    attemptId ?? -1
  );

  // Session 管理
  const {
    session,
    remainingTime,
    isExpired: sessionExpired,
    startSession,
    updateSession,
    getSession,
  } = useQuizSession(quizSlug);

  // 初始化 attempt 和 session
  const attemptCreatedRef = useRef(false);

  useEffect(() => {
    const initializeQuiz = async () => {
      if (
        isInitialized ||
        isCreatingAttempt ||
        error ||
        attemptCreatedRef.current
      ) {
        return;
      }

      attemptCreatedRef.current = true;
      setIsCreatingAttempt(true);

      try {
        const sessionParam = searchParams.get("session");
        if (sessionParam) {
          // 通过 public_id 获取 session 和 attemptId
          const res = await fetch(
            `/api/community/quizzes/${quizSlug}/attempts/session/${sessionParam}`
          );
          if (!res.ok) {
            setNeedsSessionParam(true); // 无效session，回到守卫界面
            setIsInitialized(true);
            return;
          }
          const data = await res.json();
          const aId = data?.session?.attempt_id || data?.attempt?.id;
          if (!aId) {
            setNeedsSessionParam(true);
            setIsInitialized(true);
            return;
          }
          setAttemptId(aId);
          // 完整补水并启动心跳
          const s = await getSession(aId);
          const idx = s?.current_question_index ?? 0;
          setCurrentQuestionIndex(idx);
        } else {
          // 没有 session 参数：不自动创建，进入守卫模式
          setNeedsSessionParam(true);
        }

        setError(null);
        setIsInitialized(true);
      } catch (err: any) {
        console.error("Failed to initialize quiz:", err);
        setError(
          err.message ||
          "Failed to start quiz. You may have reached the maximum number of attempts."
        );
        attemptCreatedRef.current = false; // 重置以允许重试
      } finally {
        setIsCreatingAttempt(false);
      }
    };

    initializeQuiz();
  }, [searchParams]); // 依赖searchParams，确保带session参数时可补水

  // 监听 session 过期
  useEffect(() => {
    if (sessionExpired && attemptId) {
      // 会话过期时，尝试提交并跳转至结果页
      (async () => {
        try {
          await completeAttempt();
        } catch (e) {
          console.warn(
            "completeAttempt on expiry failed or already submitted",
            e
          );
        } finally {
          const route = isTutor
            ? `/tutor/community/quizzes/${quizSlug}/result/${attemptId}`
            : `/community/quizzes/${quizSlug}/result/${attemptId}`;
          router.replace(route);
        }
      })();
    }
  }, [sessionExpired, attemptId, router, quizSlug, completeAttempt]);

  // 监听 session 标记为 completed 的情况，直接跳转结果页
  useEffect(() => {
    if (session?.status === "completed" && attemptId) {
      const route = isTutor
        ? `/tutor/community/quizzes/${quizSlug}/result/${attemptId}`
        : `/community/quizzes/${quizSlug}/result/${attemptId}`;
      router.replace(route);
    }
  }, [session?.status, attemptId, router, quizSlug, isTutor]);

  // 当页面从 bfcache 恢复（pageshow persisted）或标签页可见性变化时，重新补水 session（解决刷新/前进/后退 timer 丢失）
  useEffect(() => {
    const onPageShow = (e: PageTransitionEvent) => {
      if ((e as any).persisted && attemptId) {
        getSession(attemptId).catch(() => { });
      }
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible" && attemptId) {
        getSession(attemptId).catch(() => { });
      }
    };
    window.addEventListener("pageshow", onPageShow as any);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("pageshow", onPageShow as any);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [attemptId, getSession]);

  // 同步 session 中的题目索引到本地状态
  useEffect(() => {
    if (session && session.current_question_index !== currentQuestionIndex) {
      console.log(
        "Syncing question index from session:",
        session.current_question_index,
        "to local:",
        currentQuestionIndex
      );
      setCurrentQuestionIndex(session.current_question_index);
    }
  }, [session?.current_question_index]);

  // 点击开始或继续：创建/获取 attempt+session，并带 public_id 导航
  const navigateWithSession = async () => {
    try {
      setIsNavigatingToSession(true);
      // 尝试获取当前 attempt
      const res = await fetch(
        `/api/community/quizzes/${quizSlug}/current-attempt`
      );
      let aId: number | null = null;
      let sessPublicId: string | null = null;
      if (res.ok) {
        const data = await res.json();
        if (data?.hasCurrentAttempt) {
          aId = data.currentAttempt.id;
          if (data.session?.public_id) {
            sessPublicId = data.session.public_id;
          }
        }
      }

      // 如果没有 attempt，创建一个
      if (!aId) {
        try {
          const newAttempt = await createAttempt();
          aId = newAttempt.id;
        } catch (createError: any) {
          // Handle max attempts reached error
          if (createError.message?.includes("maximum") ||
            createError.message?.includes("attempts") ||
            createError.message?.includes("limit")) {
            toast.error("Maximum attempts reached", {
              description: "You have reached the maximum number of attempts for this quiz.",
            });
            // Redirect back to quiz page
            const route = isTutor
              ? `/tutor/community/quizzes/${quizSlug}`
              : `/community/quizzes/${quizSlug}`;
            router.push(route);
            return;
          }
          throw createError; // Re-throw if it's a different error
        }
      }

      // 如果没有 session，创建一个
      if (!sessPublicId && aId) {
        const s = await startSession(aId);
        sessPublicId = s.public_id || null;
      }

      if (sessPublicId) {
        const route = isTutor
          ? `/tutor/community/quizzes/${quizSlug}/attempt?session=${sessPublicId}`
          : `/community/quizzes/${quizSlug}/attempt?session=${sessPublicId}`;
        router.replace(route);
      } else {
        throw new Error("Failed to obtain session identifier");
      }
    } catch (e: any) {
      console.error(e);
      // Check if it's the "no questions" error
      if (e.message === "Quiz has no questions") {
        toast.error("Quiz has no questions", {
          description:
            "Quiz has no questions. Please contact the tutor to add questions.",
        });
      } else {
        toast.error("Failed to start/continue quiz", {
          description: "Please try again later, or contact support.",
        });
      }
    } finally {
      setIsNavigatingToSession(false);
    }
  };

  // 守卫界面：当无 session 参数时，避免自动创建，要求点击按钮开始/继续
  if (needsSessionParam) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-6">
        <Card className="max-w-lg w-full p-6 text-center border-2 border-white !border-white">
          <h2 className="text-xl font-bold mb-2">{t("enter_quiz_session")}</h2>
          <p className="text-sm text-muted-foreground mb-6">
            {t("session_description")}
          </p>
          <div className="flex items-center justify-center gap-3">
            <Button
              onClick={navigateWithSession}
              disabled={isNavigatingToSession}
            >
              {isNavigatingToSession ? t("processing") : t("start_continue")}
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                const route = isTutor
                  ? `/tutor/community/quizzes/${quizSlug}`
                  : `/community/quizzes/${quizSlug}`;
                router.push(route);
              }}
            >
              {t("back_to_quiz")}
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center p-4">
        <div className="max-w-md w-full">
          <Alert className="border-red-500 bg-red-50">
            <AlertCircle className="h-4 w-4 text-red-500" />
            <AlertDescription className="text-red-700">
              {error}
            </AlertDescription>
          </Alert>
          <div className="mt-4 flex gap-2 justify-center">
            <Button
              onClick={() => {
                const route = isTutor
                  ? `/tutor/community/quizzes/${quizSlug}`
                  : `/community/quizzes/${quizSlug}`;
                router.push(route);
              }}
              variant="outline"
            >
              {t("back_to_quiz")}
            </Button>
            <Button
              onClick={() => {
                // Don't reset state - instead navigate to guard screen
                // This prevents bypassing max attempts check
                setNeedsSessionParam(true);
                setError(null);
                setAttemptId(null);
                attemptCreatedRef.current = false;
              }}
              variant="default"
            >
              {t("try_again")}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading || isCreatingAttempt) {
    return (
      <div className="flex h-screen items-center justify-center text-white">
        {isCreatingAttempt ? t("starting_quiz") : t("loading_questions")}
      </div>
    );
  }

  if (!questions || questions.length === 0) {
    return (
      <div className="flex h-screen items-center justify-center text-white">
        {t("no_questions_found")}
      </div>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];
  console.log("Current Question:", currentQuestion);
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100;

  // 单选
  const handleSingleChoice = (optionIndex: number) => {
    setSelectedAnswer(optionIndex);
  };

  // 多选
  const handleMultiChoice = (optionIndex: number) => {
    setSelectedAnswers((prev) =>
      prev.includes(optionIndex)
        ? prev.filter((i) => i !== optionIndex)
        : [...prev, optionIndex]
    );
  };

  // 下一题 / 结束
  const handleNextQuestion = async () => {
    if (!attemptId || isSubmitting) return;

    setIsSubmitting(true);
    try {
      // 提交答案
      if (
        currentQuestion.question_type === "single_choice" &&
        selectedAnswer !== null
      ) {
        await submitAnswer({
          question_id: currentQuestion.public_id,
          user_answer: [selectedAnswer.toString()],
        });
      } else if (
        currentQuestion.question_type === "multiple_choice" &&
        selectedAnswers.length > 0
      ) {
        await submitAnswer({
          question_id: currentQuestion.public_id,
          user_answer: selectedAnswers.map((i) => i.toString()),
        });
      } else if (
        currentQuestion.question_type === "fill_in_blank" &&
        textAnswer.trim() !== ""
      ) {
        await submitAnswer({
          question_id: currentQuestion.public_id,
          user_answer: [textAnswer.trim()],
        });
      }

      // 下一题或结束
      if (currentQuestionIndex < questions.length - 1) {
        const nextIndex = currentQuestionIndex + 1;

        // 先更新 session（确保服务器端状态同步）
        if (session && updateSession) {
          await updateSession(attemptId, {
            current_question_index: nextIndex,
          });
        }

        // 再更新本地状态
        setCurrentQuestionIndex(nextIndex);
        setSelectedAnswer(null);
        setSelectedAnswers([]);
        setTextAnswer("");
        setIsAnswered(false);

        console.log("Advanced to question:", nextIndex);
      } else {
        // 完成 quiz
        await completeAttempt();
        // 跳转到结果页显示分数 Modal
        const route = isTutor
          ? `/tutor/community/quizzes/${quizSlug}/result/${attemptId}`
          : `/community/quizzes/${quizSlug}/result/${attemptId}`;
        router.replace(route);
      }
    } catch (error) {
      console.error("Error in handleNextQuestion:", error);
      alert("提交答案时出错，请重试");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="h-screen w-full bg-gray-900 text-white flex items-center justify-center p-4">
      <div className="relative flex flex-col w-full max-w-5xl h-[90%] bg-black/20 rounded-2xl p-4 md:p-6 border border-white/10 shadow-2xl">
        {/* Header */}
        <header className="w-full">
          <div className="flex items-center justify-between gap-4">
            <Button
              variant="ghost"
              size="icon"
              className="hover:bg-white/10"
              onClick={() => {
                const route = isTutor
                  ? `/tutor/community/quizzes/${quizSlug}`
                  : `/community/quizzes/${quizSlug}`;
                router.push(route);
              }}
            >
              <X className="h-6 w-6" />
            </Button>
            <Progress value={progress} className="w-full bg-gray-700" />

            {/* Quiz Timer - 显示整个 quiz 的剩余时间 */}
            <QuizTimer
              remainingSeconds={remainingTime}
              isExpired={sessionExpired}
              size="md"
              className="flex-shrink-0"
            />
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 flex flex-col items-center justify-center w-full max-w-3xl mx-auto text-center py-8">
          <Card className="w-full bg-transparent border-0">
            <CardHeader>
              <h1 className="text-2xl md:text-4xl font-bold">
                {currentQuestion.question_text}
              </h1>
            </CardHeader>
          </Card>
        </main>

        {/* Footer with Answer Options */}
        <footer className="w-full max-w-5xl mx-auto">
          {currentQuestion.question_type === "fill_in_blank" ? (
            <div className="flex flex-col items-center gap-4">
              <input
                type="text"
                value={textAnswer}
                onChange={(e) => setTextAnswer(e.target.value)}
                disabled={isAnswered}
                className="w-full bg-blue-400 px-4 py-2 text-lg text-black rounded-md"
                placeholder={t("type_answer_placeholder")}
              />
              {!isAnswered ? (
                <Button
                  onClick={handleNextQuestion}
                  disabled={isSubmitting}
                  className="bg-purple-600 hover:bg-purple-700 text-white text-lg px-12 py-6 rounded-lg shadow-lg disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      {currentQuestionIndex < questions.length - 1
                        ? t("next")
                        : t("finish")}
                    </div>
                  ) : (
                    currentQuestionIndex < questions.length - 1
                      ? t("next")
                      : t("finish")
                  )}
                </Button>
              ) : (
                <div className="mt-6 text-center animate-fade-in">
                  <Button
                    onClick={handleNextQuestion}
                    disabled={isSubmitting}
                    className="bg-purple-600 hover:bg-purple-700 text-white text-lg px-12 py-6 rounded-lg shadow-lg disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        {currentQuestionIndex < questions.length - 1
                          ? t("next")
                          : t("finish")}
                      </div>
                    ) : (
                      currentQuestionIndex < questions.length - 1
                        ? t("next")
                        : t("finish")
                    )}
                  </Button>
                </div>
              )}
            </div>
          ) : currentQuestion.question_type === "multiple_choice" ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                {currentQuestion.options.map(
                  (option: string, index: number) => {
                    const style = optionStyles[index % 4];
                    const isSelected = selectedAnswers.includes(index);

                    return (
                      <button
                        key={index}
                        onClick={() => handleMultiChoice(index)}
                        className={cn(
                          "relative flex items-center justify-start p-3 md:p-4 rounded-lg text-white text-lg md:text-xl font-bold transition-all duration-300 transform hover:scale-105",
                          style.bgColor,
                          {
                            "ring-4 ring-white ring-offset-4 ring-offset-gray-900":
                              isSelected,
                          }
                        )}
                      >
                        <div
                          className={cn(
                            "absolute top-2 left-2 w-5 h-5 rounded border-2 border-white flex items-center justify-center",
                            isSelected ? "bg-white" : "bg-transparent"
                          )}
                        >
                          {isSelected && (
                            <span className="text-black text-sm font-bold">
                              ✔
                            </span>
                          )}
                        </div>
                        <div className="flex items-center justify-center h-10 w-10 md:h-12 md:w-12 bg-black/20 rounded-md mr-4">
                          {style.icon}
                        </div>
                        <span>{option}</span>
                      </button>
                    );
                  }
                )}
              </div>

              <div className="mt-6 text-center">
                <Button
                  onClick={handleNextQuestion}
                  disabled={selectedAnswers.length === 0 || isSubmitting}
                  className="bg-purple-600 hover:bg-purple-700 text-white text-lg px-12 py-6 rounded-lg shadow-lg disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      {currentQuestionIndex < questions.length - 1
                        ? t("next")
                        : t("finish")}
                    </div>
                  ) : (
                    currentQuestionIndex < questions.length - 1
                      ? t("next")
                      : t("finish")
                  )}
                </Button>
              </div>
            </>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                {currentQuestion.options.map(
                  (option: string, index: number) => {
                    const style = optionStyles[index % 4];
                    const isSelected = selectedAnswer === index;
                    const isCorrect = currentQuestion.correct_answers.includes(
                      index.toString()
                    );

                    return (
                      <button
                        key={index}
                        onClick={() => handleSingleChoice(index)}
                        disabled={isAnswered}
                        className={cn(
                          "flex items-center justify-start p-3 md:p-4 rounded-lg text-white text-lg md:text-xl font-bold transition-all duration-300 transform hover:scale-105",
                          style.bgColor,
                          {
                            "opacity-50": isAnswered && !isSelected,
                            "ring-4 ring-white ring-offset-4 ring-offset-gray-900":
                              isSelected,
                            "bg-green-600":
                              isAnswered &&
                              isCorrect &&
                              (isSelected || selectedAnswer === null),
                            "bg-red-700":
                              isAnswered && !isCorrect && isSelected,
                          }
                        )}
                      >
                        <div className="flex items-center justify-center h-10 w-10 md:h-12 md:w-12 bg-black/20 rounded-md mr-4">
                          {style.icon}
                        </div>
                        <span>{option}</span>
                      </button>
                    );
                  }
                )}
              </div>
              {selectedAnswer !== null && (
                <div className="mt-6 text-center animate-fade-in">
                  <Button
                    onClick={handleNextQuestion}
                    disabled={isSubmitting}
                    className="bg-purple-600 hover:bg-purple-700 text-white text-lg px-12 py-6 rounded-lg shadow-lg disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        {currentQuestionIndex < questions.length - 1
                          ? t("next")
                          : t("finish")}
                      </div>
                    ) : (
                      currentQuestionIndex < questions.length - 1
                        ? t("next")
                        : t("finish")
                    )}
                  </Button>
                </div>
              )}
            </>
          )}
        </footer>
      </div>

      {/* Debug Panel (开发环境) */}
      <QuizDebugPanel
        attemptId={attemptId}
        currentQuestionIndex={currentQuestionIndex}
        session={session}
        remainingTime={remainingTime}
        isExpired={sessionExpired}
      />
    </div>
  );
}
