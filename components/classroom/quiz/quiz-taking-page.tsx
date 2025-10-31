'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useClassrooms } from '@/hooks/classroom/use-create-live-session';
import { useClassroomQuizzes, QuizQuestion } from '@/hooks/classroom/use-classroom-quizzes';
import { getCardStyling, getClassroomColor } from '@/utils/classroom/color-generator';

interface QuizTakingPageProps {
    classroomSlug: string;
    quizId: number;
}

interface QuizSession {
    id: number;
    quiz_id: number;
    student_id: number;
    started_at: string;
    expires_at: string;
    is_active: boolean;
    submitted_at?: string;
}

export function QuizTakingPage({ classroomSlug, quizId }: QuizTakingPageProps) {
    const router = useRouter();
    const { toast } = useToast();
    const [classroom, setClassroom] = useState<any>(null);
    const [userAnswers, setUserAnswers] = useState<Record<number, any>>({});
    const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
    const [quizSession, setQuizSession] = useState<QuizSession | null>(null);
    const [isCheckingStatus, setIsCheckingStatus] = useState(true);

    const { data: classroomsData } = useClassrooms();
    const { data: quizzesData, isLoading } = useClassroomQuizzes(classroomSlug);

    const quiz = quizzesData?.quizzes?.find((q: any) => q.id === quizId);

    // Parse questions and ensure options are arrays
    const questions: QuizQuestion[] = (quiz?.questions || []).map((q: any) => ({
        ...q,
        options: typeof q.options === 'string' ? JSON.parse(q.options) : q.options,
        correct_answer: typeof q.correct_answer === 'string' && q.correct_answer.startsWith('[')
            ? JSON.parse(q.correct_answer)
            : q.correct_answer
    }));

    useEffect(() => {
        if (classroomsData?.classrooms) {
            const foundClassroom = classroomsData.classrooms.find(c => c.slug === classroomSlug);
            setClassroom(foundClassroom);
        }
    }, [classroomsData, classroomSlug]);

    // Update document title when quiz loads
    useEffect(() => {
        if (quiz?.title) {
            document.title = `${quiz.title} | Quiz`;
        }
    }, [quiz]);

    // Check quiz status and session on mount
    useEffect(() => {
        const checkQuizStatus = async () => {
            if (!quiz) return;

            try {
                const response = await fetch(
                    `/api/classroom/${classroomSlug}/quizzes/${quizId}?checkStatus=true`
                );
                const data = await response.json();

                if (!data.canTakeQuiz) {
                    if (data.reason === 'already_submitted') {
                        toast({
                            title: "已提交",
                            description: "您已经提交过这个测验了",
                            variant: "destructive",
                        });
                        router.push(`/classroom/${classroomSlug}/quiz`);
                    } else if (data.reason === 'session_expired') {
                        toast({
                            title: "会话已过期",
                            description: "测验会话已过期",
                            variant: "destructive",
                        });
                        router.push(`/classroom/${classroomSlug}/quiz`);
                    }
                    return;
                }

                if (data.hasActiveSession && data.session) {
                    // Resume existing session
                    setQuizSession(data.session);
                    setTimeRemaining(data.timeRemaining);
                } else {
                    // Start new session
                    await startQuizSession();
                }
            } catch (error: any) {
                console.error('Error checking quiz status:', error);
                toast({
                    title: "错误",
                    description: "无法检查测验状态",
                    variant: "destructive",
                });
            } finally {
                setIsCheckingStatus(false);
            }
        };

        if (quiz && isCheckingStatus) {
            checkQuizStatus();
        }
    }, [quiz, quizId, classroomSlug, isCheckingStatus]);

    // Timer countdown
    useEffect(() => {
        if (timeRemaining === null || timeRemaining <= 0) return;

        const timer = setInterval(() => {
            setTimeRemaining(prev => {
                if (prev === null || prev <= 1) {
                    handleSubmitQuiz();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [timeRemaining]);

    const startQuizSession = async () => {
        try {
            const response = await fetch(
                `/api/classroom/${classroomSlug}/quizzes/${quizId}`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        action: 'start'
                    }),
                }
            );

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to start quiz session');
            }

            const data = await response.json();
            setQuizSession(data.session);
            setTimeRemaining(data.timeRemaining);
        } catch (error: any) {
            toast({
                title: "错误",
                description: error.message || "无法开始测验会话",
                variant: "destructive",
            });
            router.push(`/classroom/${classroomSlug}/quiz`);
        }
    };

    const handleBack = () => {
        router.push(`/classroom/${classroomSlug}/quiz`);
    };

    const handleSubmitQuiz = async () => {
        if (!quiz || !quizSession) return;

        // Calculate score
        let totalPoints = 0;
        let earnedPoints = 0;

        questions.forEach((question, index) => {
            const userAnswer = userAnswers[index];
            totalPoints += question.points;

            if (question.question_type === 'multiple_choice' || question.question_type === 'true_false') {
                if (userAnswer === question.correct_answer) {
                    earnedPoints += question.points;
                }
            }
        });

        const percentage = totalPoints > 0 ? (earnedPoints / totalPoints) * 100 : 0;

        try {
            // Submit to API
            const response = await fetch(`/api/classroom/${classroomSlug}/quizzes/${quizId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    action: 'submit',
                    answers: userAnswers,
                    score: earnedPoints,
                    max_score: totalPoints,
                }),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to submit quiz');
            }

            toast({
                title: "测验已提交！",
                description: `您的得分：${earnedPoints}/${totalPoints} 分 (${percentage.toFixed(1)}%)`,
            });

            // Redirect back after 2 seconds
            setTimeout(() => {
                router.push(`/classroom/${classroomSlug}/quiz`);
            }, 2000);
        } catch (error: any) {
            toast({
                title: "错误",
                description: error.message || "提交测验失败",
                variant: "destructive",
            });
        }
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    if (isLoading || !classroom || !quiz || isCheckingStatus) {
        return (
            <div className="container mx-auto py-8">
                <div className="flex justify-center items-center h-64">
                    <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
                </div>
            </div>
        );
    }

    const classroomColor = getClassroomColor(classroom);
    const cardStyling = getCardStyling(classroomColor, 'light');

    return (
        <div className="min-h-screen" >
            <div className="container mx-auto py-8 max-w-4xl">
                <div className="mb-8">
                    <Button variant="ghost" onClick={handleBack} className="mb-4">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Quiz List
                    </Button>
                    <div className="flex justify-between items-start">
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight">{quiz.title}</h1>
                            <p className="text-muted-foreground mt-2">
                                {questions.length} questions • {quiz.total_points} points total
                                {quiz.settings.time_limit && ` • ${quiz.settings.time_limit} minutes`}
                            </p>
                        </div>
                        {timeRemaining !== null && (
                            <div className="text-right">
                                <p className="text-sm text-muted-foreground">Time Remaining</p>
                                <p className={`text-2xl font-bold ${timeRemaining < 60 ? 'text-red-600' : ''}`}>
                                    {formatTime(timeRemaining)}
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                <Card style={{ backgroundColor: cardStyling.backgroundColor, borderColor: cardStyling.borderColor }}>
                    <CardContent className="pt-6">
                        {questions.length === 0 ? (
                            <div className="text-center py-12">
                                <p className="text-lg text-muted-foreground">No questions available for this quiz.</p>
                                <p className="text-sm text-muted-foreground mt-2">Please contact your instructor.</p>
                                <Button onClick={() => console.log('Quiz data:', quiz)} className="mt-4">
                                    Log Quiz Data (Check Console)
                                </Button>
                            </div>
                        ) : (
                            <div className="space-y-8">
                                {questions.map((question, index) => (
                                    <div key={index} className="pb-6 border-b last:border-b-0">
                                        <div className="mb-4">
                                            <div className="flex items-start gap-3">
                                                <span className="font-semibold text-lg">Q{index + 1}.</span>
                                                <div className="flex-1">
                                                    <p className="text-lg mb-1">{question.question_text}</p>
                                                    <span className="text-sm text-muted-foreground">({question.points} points)</span>
                                                </div>
                                            </div>
                                        </div>

                                        {question.question_type === 'multiple_choice' && (
                                            <div className="ml-8">

                                                {question.options && Array.isArray(question.options) ? (
                                                    <div className="space-y-3">
                                                        {question.options.filter((opt: string) => opt && opt.trim()).map((option: string, optIndex: number) => {
                                                            const optionId = `q${index}-opt${optIndex}`;
                                                            return (
                                                                <div 
                                                                    key={optionId} 
                                                                    className="flex items-center space-x-3 p-3 rounded-lg bg-gray-100/5 hover:bg-gray-200/8"
                                                                >
                                                                    <input
                                                                        type="radio"
                                                                        id={optionId}
                                                                        name={`question-${index}`}
                                                                        value={option}
                                                                        checked={userAnswers[index] === option}
                                                                        onChange={() => {
                                                                            setUserAnswers(prev => ({
                                                                                ...prev,
                                                                                [index]: option
                                                                            }));
                                                                        }}
                                                                        className="h-4 w-4 cursor-pointer"
                                                                    />
                                                                    <label htmlFor={optionId} className="flex-1 cursor-pointer">
                                                                        {String.fromCharCode(65 + optIndex)}. {option}
                                                                    </label>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                ) : (
                                                    <p className="text-red-600">Options not available or not in correct format</p>
                                                )}
                                            </div>
                                        )}

                                        {question.question_type === 'true_false' && (
                                            <div className="ml-8 space-y-3">
                                                <div className="flex items-center space-x-3 p-3 rounded-lg bg-gray-100/5 hover:bg-gray-200/8">
                                                    <input
                                                        type="radio"
                                                        id={`q${index}-true`}
                                                        name={`question-${index}`}
                                                        value="True"
                                                        checked={userAnswers[index] === 'True'}
                                                        onChange={() => {
                                                            setUserAnswers(prev => ({
                                                                ...prev,
                                                                [index]: 'True'
                                                            }));
                                                        }}
                                                        className="h-4 w-4 cursor-pointer"
                                                    />
                                                    <label htmlFor={`q${index}-true`} className="flex-1 cursor-pointer">True</label>
                                                </div>
                                                <div className="flex items-center space-x-3 p-3 rounded-lg bg-gray-100/5 hover:bg-gray-200/8">
                                                    <input
                                                        type="radio"
                                                        id={`q${index}-false`}
                                                        name={`question-${index}`}
                                                        value="False"
                                                        checked={userAnswers[index] === 'False'}
                                                        onChange={() => {
                                                            setUserAnswers(prev => ({
                                                                ...prev,
                                                                [index]: 'False'
                                                            }));
                                                        }}
                                                        className="h-4 w-4 cursor-pointer"
                                                    />
                                                    <label htmlFor={`q${index}-false`} className="flex-1 cursor-pointer">False</label>
                                                </div>
                                            </div>
                                        )}

                                        {question.question_type === 'short_answer' && (
                                            <Textarea
                                                value={userAnswers[index] || ''}
                                                onChange={(e) => {
                                                    setUserAnswers(prev => ({
                                                        ...prev,
                                                        [index]: e.target.value
                                                    }));
                                                }}
                                                placeholder="Type your answer here..."
                                                rows={4}
                                                className="ml-8"
                                            />
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}

                        {questions.length > 0 && (
                            <div className="mt-8 flex justify-end gap-3">
                                <Button variant="outline" onClick={handleBack}>
                                    Cancel
                                </Button>
                                <Button onClick={handleSubmitQuiz}>
                                    <Play className="mr-2 h-4 w-4" />
                                    Submit Quiz
                                </Button>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
