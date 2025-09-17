"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { X, Timer, Triangle, Square, Circle, Diamond, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Alert, AlertDescription } from "@/components/ui/alert";

import { useQuizQuestions } from "@/hooks/community/use-quiz-questions";
import {
  useCreateQuizAttempt,
  useSubmitAnswer,
  useCompleteAttempt,
} from "@/hooks/community/use-quiz";

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
  const { quizSlug } = useParams<{ quizSlug: string }>();
  const router = useRouter();

  // 状态
  const [attemptId, setAttemptId] = useState<number | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [timeLeft, setTimeLeft] = useState(30);
  const [textAnswer, setTextAnswer] = useState("");
  const [selectedAnswers, setSelectedAnswers] = useState<number[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isCreatingAttempt, setIsCreatingAttempt] = useState(false);

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

  // 初始化 attempt
  useEffect(() => {
    if (!attemptId && !isCreatingAttempt && !error) {
      setIsCreatingAttempt(true);
      createAttempt()
        .then((data) => {
          setAttemptId(data.id);
          setError(null);
        })
        .catch((err) => {
          console.error("Failed to create attempt:", err);
          setError(err.message || "Failed to start quiz. You may have reached the maximum number of attempts.");
        })
        .finally(() => {
          setIsCreatingAttempt(false);
        });
    }
  }, [attemptId, createAttempt, isCreatingAttempt, error]);

  // 倒计时
  useEffect(() => {
    if (isAnswered) return;
    if (timeLeft === 0) {
      setIsAnswered(true);
      return;
    }
    const timer = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [timeLeft, isAnswered]);

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
              onClick={() => router.push(`/community/quizzes/${quizSlug}`)}
              variant="outline"
            >
              Back to Quiz
            </Button>
            <Button 
              onClick={() => {
                setError(null);
                setAttemptId(null);
              }}
              variant="default"
            >
              Try Again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading || isCreatingAttempt) {
    return (
      <div className="flex h-screen items-center justify-center text-white">
        {isCreatingAttempt ? "Starting quiz..." : "Loading questions..."}
      </div>
    );
  }

  if (!questions || questions.length === 0) {
    return (
      <div className="flex h-screen items-center justify-center text-white">
        No questions found for this quiz.
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
    if (!attemptId) return;

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
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setSelectedAnswer(null);
      setSelectedAnswers([]);
      setTextAnswer("");
      setTimeLeft(30);
      setIsAnswered(false); // ✅ 每次强制重置
    } else {
      const result = await completeAttempt();
      alert(`Quiz Finished! You got ${result.correct}/${result.total} correct`);
      router.push(`/community/quizzes/${quizSlug}`);
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
              onClick={() => router.push(`/community/quizzes/${quizSlug}`)}
            >
              <X className="h-6 w-6" />
            </Button>
            <Progress value={progress} className="w-full bg-gray-700" />
            <div className="flex items-center gap-2 bg-gray-800 px-3 py-1.5 rounded-lg flex-shrink-0">
              <Timer className="h-5 w-5 text-yellow-400" />
              <span className="font-bold text-lg">{timeLeft}</span>
            </div>
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
                placeholder="Type your answer here..."
              />
              {!isAnswered ? (
                <Button
                  onClick={handleNextQuestion}
                  className="bg-purple-600 hover:bg-purple-700 text-white text-lg px-12 py-6 rounded-lg shadow-lg"
                >
                  {currentQuestionIndex < questions.length - 1
                    ? "Next"
                    : "Finish"}
                </Button>
              ) : (
                <div className="mt-6 text-center animate-fade-in">
                  <Button
                    onClick={handleNextQuestion}
                    className="bg-purple-600 hover:bg-purple-700 text-white text-lg px-12 py-6 rounded-lg shadow-lg"
                  >
                    {currentQuestionIndex < questions.length - 1
                      ? "Next"
                      : "Finish"}
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
                  disabled={selectedAnswers.length === 0}
                  className="bg-purple-600 hover:bg-purple-700 text-white text-lg px-12 py-6 rounded-lg shadow-lg"
                >
                  {currentQuestionIndex < questions.length - 1
                    ? "Next"
                    : "Finish"}
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
                    className="bg-purple-600 hover:bg-purple-700 text-white text-lg px-12 py-6 rounded-lg shadow-lg"
                  >
                    {currentQuestionIndex < questions.length - 1
                      ? "Next"
                      : "Finish"}
                  </Button>
                </div>
              )}
            </>
          )}
        </footer>
      </div>
    </div>
  );
}
