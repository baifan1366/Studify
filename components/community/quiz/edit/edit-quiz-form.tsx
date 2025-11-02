"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Edit3, FileText, List, Save, ArrowLeft, Trash2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { useQuiz, useUpdateQuiz, useQuizSubjects, useQuizGrades } from "@/hooks/community/use-quiz";
import { useQuizQuestions, useUpdateQuizQuestion, useDeleteQuizQuestion } from "@/hooks/community/use-quiz-questions";
import { CommunityQuizQuestion } from "@/interface/community/quiz-interface";
import { useLocale } from "next-intl";
import { getSubjectName, getGradeName } from "@/utils/quiz/translation-utils";
import { useUser } from "@/hooks/profile/use-user";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { useState as useAlertState, useCallback } from "react";

interface EditQuizFormProps {
  quizSlug: string;
}

export default function EditQuizForm({ quizSlug }: EditQuizFormProps) {
  const t = useTranslations('EditQuizForm');

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [difficulty, setDifficulty] = useState(1);
  const [visibility, setVisibility] = useState<'public' | 'private'>('public');
  const [maxAttempts, setMaxAttempts] = useState(1);
  const [timeLimitMinutes, setTimeLimitMinutes] = useState<number | null>(null);
  const [selectedSubjectId, setSelectedSubjectId] = useState<number | undefined>();
  const [selectedGradeId, setSelectedGradeId] = useState<number | undefined>();

  // Questions state
  const [editingQuestion, setEditingQuestion] = useState<CommunityQuizQuestion | null>(null);

  // Question form state
  const [questionText, setQuestionText] = useState("");
  const [questionType, setQuestionType] = useState<"single_choice" | "multiple_choice" | "fill_in_blank">("single_choice");
  const [options, setOptions] = useState<string[]>(["", ""]);
  const [correctAnswers, setCorrectAnswers] = useState<number[]>([]);
  const [fillInAnswers, setFillInAnswers] = useState<string[]>([""]);
  const [explanation, setExplanation] = useState("");

  const router = useRouter();
  const params = useParams();
  const locale = useLocale();
  const { data: currentUser } = useUser();
  const isTutor = currentUser?.profile?.role === 'tutor';

  // Alert dialog state
  const [alertDialog, setAlertDialog] = useAlertState<{
    isOpen: boolean;
    title: string;
    description: string;
    variant: "default" | "destructive" | "success";
    onConfirm?: () => void;
    confirmText?: string;
    cancelText?: string;
    showCancel?: boolean;
  }>({
    isOpen: false,
    title: "",
    description: "",
    variant: "default",
  });

  const showAlert = useCallback((options: {
    title: string;
    description: string;
    variant?: "default" | "destructive" | "success";
    onConfirm?: () => void;
    confirmText?: string;
    cancelText?: string;
    showCancel?: boolean;
  }) => {
    setAlertDialog({
      isOpen: true,
      title: options.title,
      description: options.description,
      variant: options.variant || "default",
      onConfirm: options.onConfirm,
      confirmText: options.confirmText || "OK",
      cancelText: options.cancelText || "Cancel",
      showCancel: options.showCancel || false,
    });
  }, []);

  const hideAlert = useCallback(() => {
    setAlertDialog(prev => ({ ...prev, isOpen: false }));
  }, []);

  const handleAlertConfirm = useCallback(() => {
    if (alertDialog.onConfirm) {
      alertDialog.onConfirm();
    }
    hideAlert();
  }, [alertDialog.onConfirm, hideAlert]);

  // Hooks
  const { data: quiz, isLoading, error } = useQuiz(quizSlug);
  const { data: questions, isLoading: questionsLoading } = useQuizQuestions(quizSlug);
  const { data: subjects, isLoading: subjectsLoading } = useQuizSubjects();
  const { data: grades, isLoading: gradesLoading } = useQuizGrades();
  const updateQuiz = useUpdateQuiz(quizSlug);
  const updateQuestion = useUpdateQuizQuestion(quizSlug);
  const deleteQuestion = useDeleteQuizQuestion(quizSlug);

  // Initialize form with quiz data
  useEffect(() => {
    if (quiz) {
      setTitle(quiz.title || "");
      setDescription(quiz.description || "");
      setDifficulty(quiz.difficulty || 1);
      setVisibility(quiz.visibility || 'public');
      setMaxAttempts(quiz.max_attempts || 1);
      setTimeLimitMinutes(quiz.time_limit_minutes || null);
      setSelectedSubjectId(quiz.subject_id || undefined);
      setSelectedGradeId(quiz.grade_id || undefined);
    }
  }, [quiz]);

  // Initialize question form when editing question changes
  useEffect(() => {
    if (editingQuestion) {
      setQuestionText(editingQuestion.question_text || "");
      setQuestionType(editingQuestion.question_type || "single_choice");
      setExplanation(editingQuestion.explanation || "");

      if (editingQuestion.question_type === "fill_in_blank") {
        setFillInAnswers(editingQuestion.correct_answers || [""]);
        setOptions(["", ""]);
        setCorrectAnswers([]);
      } else {
        setOptions(editingQuestion.options || ["", ""]);
        const correctIndices = (editingQuestion.correct_answers || []).map(ans => parseInt(ans, 10)).filter(n => !isNaN(n));
        setCorrectAnswers(correctIndices);
        setFillInAnswers([""]);
      }
    }
  }, [editingQuestion]);

  // Handle form submission
  const handleSubmit = () => {
    if (!title.trim()) {
      showAlert({
        title: "Title Required",
        description: "Title is required",
        variant: "destructive",
      });
      return;
    }

    const updateData = {
      title: title.trim(),
      description: description.trim() || undefined,
      difficulty,
      // tags, // Temporarily disabled as per backend
      visibility,
      max_attempts: maxAttempts,
      time_limit_minutes: timeLimitMinutes,
      subject_id: selectedSubjectId,
      grade_id: selectedGradeId,
    };

    updateQuiz.mutate(updateData, {
      onSuccess: () => {
        showAlert({
          title: "Success",
          description: "Quiz updated successfully!",
          variant: "success",
          onConfirm: () => {
            // Redirect back to quiz detail page
            const locale = (params as any)?.locale ?? "en";
            const route = isTutor
              ? `/${locale}/tutor/community/quizzes/${quizSlug}`
              : `/${locale}/community/quizzes/${quizSlug}`;
            router.push(route);
          },
        });
      },
      onError: (err: any) => {
        showAlert({
          title: "Update Failed",
          description: err?.message ?? "Update failed",
          variant: "destructive",
        });
      },
    });
  };

  // Handle back navigation
  const handleBack = () => {
    const locale = (params as any)?.locale ?? "en";
    const route = isTutor
      ? `/${locale}/tutor/community/quizzes/${quizSlug}`
      : `/${locale}/community/quizzes/${quizSlug}`;
    router.push(route);
  };

  // Question form handlers
  const handleAddOption = () => {
    setOptions([...options, ""]);
  };

  const handleRemoveOption = (index: number) => {
    if (options.length > 2) {
      const newOptions = options.filter((_, i) => i !== index);
      setOptions(newOptions);
      // Remove correct answer if it references removed option
      setCorrectAnswers(correctAnswers.filter(ans => ans < newOptions.length));
    }
  };

  const handleOptionChange = (index: number, value: string) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };

  const handleCorrectAnswerToggle = (index: number) => {
    if (questionType === "single_choice") {
      setCorrectAnswers([index]);
    } else {
      const newCorrectAnswers = correctAnswers.includes(index)
        ? correctAnswers.filter(ans => ans !== index)
        : [...correctAnswers, index];
      setCorrectAnswers(newCorrectAnswers);
    }
  };

  const handleAddFillInAnswer = () => {
    setFillInAnswers([...fillInAnswers, ""]);
  };

  const handleRemoveFillInAnswer = (index: number) => {
    if (fillInAnswers.length > 1) {
      setFillInAnswers(fillInAnswers.filter((_, i) => i !== index));
    }
  };

  const handleFillInAnswerChange = (index: number, value: string) => {
    const newAnswers = [...fillInAnswers];
    newAnswers[index] = value;
    setFillInAnswers(newAnswers);
  };

  // Handle question type change
  const handleQuestionTypeChange = (newType: "single_choice" | "multiple_choice" | "fill_in_blank") => {
    setQuestionType(newType);
    if (newType === "fill_in_blank") {
      setOptions(["", ""]);
      setCorrectAnswers([]);
      if (fillInAnswers.length === 0 || fillInAnswers[0] === "") {
        setFillInAnswers([""]);
      }
    } else {
      setFillInAnswers([""]);
      if (options.length < 2) {
        setOptions(["", ""]);
      }
      setCorrectAnswers([]);
    }
  };

  // Handle question form submission
  const handleQuestionSubmit = () => {
    if (!editingQuestion) return;

    if (!questionText.trim()) {
      showAlert({
        title: "Question Text Required",
        description: "Question text is required",
        variant: "destructive",
      });
      return;
    }

    let payload: any = {
      questionText: questionText.trim(),
      questionType,
      explanation: explanation.trim(),
    };

    if (questionType === "fill_in_blank") {
      const validAnswers = fillInAnswers.filter(ans => ans.trim());
      if (validAnswers.length === 0) {
        showAlert({
          title: "No Correct Answer",
          description: "At least one correct answer is required for fill-in-blank questions",
          variant: "destructive",
        });
        return;
      }
      payload.correctAnswers = validAnswers;
      payload.options = [];
    } else {
      const validOptions = options.filter(opt => opt.trim());
      if (validOptions.length < 2) {
        showAlert({
          title: "Invalid Options",
          description: "At least 2 options are required for choice questions",
          variant: "destructive",
        });
        return;
      }
      if (correctAnswers.length === 0) {
        showAlert({
          title: "No Correct Answer",
          description: "Please select at least one correct answer",
          variant: "destructive",
        });
        return;
      }
      payload.options = validOptions;
      payload.correctAnswers = correctAnswers;
    }

    updateQuestion.mutate({
      questionSlug: editingQuestion.slug,
      payload
    }, {
      onSuccess: () => {
        showAlert({
          title: "Success",
          description: "Question updated successfully!",
          variant: "success",
          onConfirm: () => setEditingQuestion(null),
        });
      },
      onError: (err: any) => {
        showAlert({
          title: "Update Failed",
          description: err?.message ?? "Failed to update question",
          variant: "destructive",
        });
      }
    });
  };

  // Handle question deletion
  const handleQuestionDelete = () => {
    if (!editingQuestion) return;

    showAlert({
      title: "Delete Question",
      description: "Are you sure you want to delete this question? This action cannot be undone.",
      variant: "destructive",
      confirmText: "Delete",
      cancelText: "Cancel",
      showCancel: true,
      onConfirm: () => {
        deleteQuestion.mutate(editingQuestion.slug, {
          onSuccess: () => {
            showAlert({
              title: "Success",
              description: "Question deleted successfully!",
              variant: "success",
              onConfirm: () => setEditingQuestion(null),
            });
          },
          onError: (err: any) => {
            showAlert({
              title: "Delete Failed",
              description: err?.message ?? "Failed to delete question",
              variant: "destructive",
            });
          }
        });
      },
    });
  };

  // Use real questions data
  const questionsList = questions || [];

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">{t('loading_quiz')}</p>
        </div>
      </div>
    );
  }

  if (error || !quiz) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">{t('quiz_not_found')}</h2>
              <p className="text-gray-600 mb-4">
                {error?.message || t('quiz_not_found_message')}
              </p>
              <Button onClick={handleBack} variant="outline">
                <ArrowLeft className="h-4 w-4 mr-2" />
                {t('go_back')}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 md:px-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Button onClick={handleBack} variant="outline" size="sm">
          <ArrowLeft className="h-4 w-4 mr-2" />
          {t('go_back')}
        </Button>
        <div>
          <h1 className="text-3xl font-bold">{t('edit_quiz')}</h1>
          <p className="text-muted-foreground">{t('update_quiz_description')}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content - Quiz Form */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Edit3 className="h-5 w-5" />
                {t('quiz_information')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Title */}
              <div className="space-y-2">
                <Label htmlFor="title">{t('title_required')}</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={t('title_placeholder')}
                  required
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">{t('description')}</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={t('description_placeholder')}
                  rows={3}
                />
              </div>

              {/* Difficulty */}
              <div className="space-y-2">
                <Label htmlFor="difficulty">{t('difficulty')}</Label>
                <Input
                  id="difficulty"
                  type="number"
                  min="1"
                  max="5"
                  value={difficulty}
                  onChange={(e) => setDifficulty(parseInt(e.target.value) || 1)}
                />
              </div>

              {/* Subject Selection */}
              <div className="space-y-2">
                <Label htmlFor="subject">{t('subject')}</Label>
                <Select
                  value={selectedSubjectId?.toString() || "none"}
                  onValueChange={(value) => setSelectedSubjectId(value === "none" ? undefined : Number(value))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={subjectsLoading ? t('loading_subjects') : t('select_subject')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{t('no_subject')}</SelectItem>
                    {subjects?.map((subject) => (
                      <SelectItem key={subject.id} value={subject.id.toString()}>
                        {getSubjectName(subject, locale)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Grade Selection */}
              <div className="space-y-2">
                <Label htmlFor="grade">{t('grade_level')}</Label>
                <Select
                  value={selectedGradeId?.toString() || "none"}
                  onValueChange={(value) => setSelectedGradeId(value === "none" ? undefined : Number(value))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={gradesLoading ? t('loading_grades') : t('select_grade_level')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{t('no_grade_level')}</SelectItem>
                    {grades?.map((grade) => (
                      <SelectItem key={grade.id} value={grade.id.toString()}>
                        {getGradeName(grade, locale)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Visibility */}
              <div className="space-y-3">
                <Label>Visibility</Label>
                <RadioGroup value={visibility} onValueChange={(value: 'public' | 'private') => setVisibility(value)}>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="public" id="public" />
                    <Label htmlFor="public">{t('public_access')}</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="private" id="private" />
                    <Label htmlFor="private">{t('private_access')}</Label>
                  </div>
                </RadioGroup>
              </div>

              {/* Max Attempts */}
              <div className="space-y-2">
                <Label htmlFor="maxAttempts">{t('max_attempts')}</Label>
                <Select value={maxAttempts.toString()} onValueChange={(value) => setMaxAttempts(parseInt(value))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">{t('one_attempt')}</SelectItem>
                    <SelectItem value="2">{t('two_attempts')}</SelectItem>
                    <SelectItem value="3">{t('three_attempts')}</SelectItem>
                    <SelectItem value="5">{t('five_attempts')}</SelectItem>
                    <SelectItem value="10">{t('ten_attempts')}</SelectItem>
                    <SelectItem value="999">{t('unlimited_attempts')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Time Limit */}
              <div className="space-y-2">
                <Label htmlFor="timeLimit">{t('time_limit')}</Label>
                <Input
                  id="timeLimit"
                  type="number"
                  min="1"
                  value={timeLimitMinutes || ""}
                  onChange={(e) => setTimeLimitMinutes(e.target.value ? parseInt(e.target.value) : null)}
                  placeholder={t('time_limit_placeholder')}
                />
              </div>

              {/* Save Button */}
              <div className="flex justify-end pt-4">
                <Button
                  onClick={handleSubmit}
                  disabled={updateQuiz.isPending}

                >
                  <Save className="h-4 w-4 mr-2" />
                  {updateQuiz.isPending ? t('saving') : t('save_changes')}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar - Questions List (matching quiz-sidebar.tsx style) */}
        <div className="lg:col-span-1">
          <Card className="bg-white/5 border-white/10">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <List className="h-5 w-5" />
                {t('quiz_questions')} ({questionsList.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {questionsLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="p-4 rounded-lg bg-white/5 animate-pulse">
                      <div className="h-4 bg-white/10 rounded mb-2"></div>
                      <div className="h-3 bg-white/10 rounded w-3/4"></div>
                    </div>
                  ))}
                </div>
              ) : questionsList.length === 0 ? (
                <div className="text-center py-6">
                  <FileText className="h-8 w-8 mx-auto mb-3 opacity-50" />
                  <p className="text-gray-400 text-sm mb-3">{t('no_questions_yet')}</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const locale = (params as any)?.locale ?? "en";
                      const route = isTutor
                        ? `/${locale}/tutor/community/quizzes/${quizSlug}/create-question`
                        : `/${locale}/community/quizzes/${quizSlug}/create-question`;
                      router.push(route);
                    }}
                  >
                    {t('add_question')}
                  </Button>
                </div>
              ) : (
                <>
                  {questionsList.map((question, index) => (
                    <div
                      key={question.id}
                      className={`p-4 rounded-lg transition-colors cursor-pointer min-h-[80px] ${editingQuestion?.id === question.id
                        ? 'bg-white/20 hover:bg-white/25'
                        : 'bg-white/5 hover:bg-white/10'
                        }`}
                      onClick={() => setEditingQuestion(question)}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-xs font-medium text-muted-foreground">
                              {t('question')} {index + 1}
                            </span>
                            <Badge
                              variant="outline"
                              className="text-xs border-blue-400 text-blue-400"
                            >
                              {question.question_type.replace("_", " ")}
                            </Badge>
                          </div>
                          <p className="font-medium text-sm leading-relaxed line-clamp-2">
                            {question.question_text}
                          </p>
                          {question.options && (
                            <p className="text-xs text-muted-foreground mt-2">
                              {t('options_count', { count: question.options.length })}
                            </p>
                          )}
                        </div>
                        <Edit3 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      </div>
                    </div>
                  ))}
                  <div className="text-center pt-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const locale = (params as any)?.locale ?? "en";
                        const route = isTutor
                          ? `/${locale}/tutor/community/quizzes/${quizSlug}/create-question`
                          : `/${locale}/community/quizzes/${quizSlug}/create-question`;
                        router.push(route);
                      }}
                    >
                      {t('add_question')}
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Question Editor Modal/Overlay */}
      {editingQuestion && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-2xl max-h-[80vh] overflow-auto bg-background">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Edit3 className="h-5 w-5" />
                  {t('edit_question')} {questionsList.findIndex((q: CommunityQuizQuestion) => q.id === editingQuestion.id) + 1}
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleQuestionDelete}
                    disabled={deleteQuestion.isPending}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                    {deleteQuestion.isPending ? t('deleting') : t('delete')}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditingQuestion(null)}
                  >
                    {t('close')}
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Question Text */}
              <div className="space-y-2">
                <Label htmlFor="questionText">{t('question_text_required')}</Label>
                <Textarea
                  id="questionText"
                  value={questionText}
                  onChange={(e) => setQuestionText(e.target.value)}
                  placeholder={t('question_placeholder')}
                  rows={3}
                />
              </div>

              {/* Question Type */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">{t('question_type')}</Label>
                <Select
                  value={questionType}
                  onValueChange={handleQuestionTypeChange}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="single_choice">{t('single_choice')}</SelectItem>
                    <SelectItem value="multiple_choice">{t('multiple_choice')}</SelectItem>
                    <SelectItem value="fill_in_blank">{t('fill_in_blank')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Render inputs depending on type */}
              {questionType === "single_choice" ? (
                <RadioGroup
                  value={correctAnswers[0]?.toString() || ""}
                  onValueChange={(val) => handleCorrectAnswerToggle(parseInt(val))}
                >
                  {options.map((option, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <RadioGroupItem value={index.toString()} id={`option-${index}`} />
                      <Input
                        className="flex-1"
                        value={option}
                        onChange={(e) => handleOptionChange(index, e.target.value)}
                        placeholder={`Option ${index + 1}`}
                      />
                      {correctAnswers.includes(index) && (
                        <span className="text-green-600 text-sm font-medium">
                          {t('correct_answer')}
                        </span>
                      )}
                      {options.length > 2 && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveOption(index)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                  <Button variant="outline" onClick={handleAddOption}>
                    {t('add_option')}
                  </Button>
                </RadioGroup>
              ) : questionType === "multiple_choice" ? (
                <div className="space-y-2">
                  {options.map((option, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <Checkbox
                        checked={correctAnswers.includes(index)}
                        onChange={() => handleCorrectAnswerToggle(index)}
                        id={`option-${index}`}
                      />
                      <Input
                        className="flex-1"
                        value={option}
                        onChange={(e) => handleOptionChange(index, e.target.value)}
                        placeholder={`Option ${index + 1}`}
                      />
                      {correctAnswers.includes(index) && (
                        <span className="text-green-600 text-sm font-medium">
                          {t('correct_answer')}
                        </span>
                      )}
                      {options.length > 2 && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveOption(index)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                  <Button variant="outline" onClick={handleAddOption}>
                    {t('add_option')}
                  </Button>
                </div>
              ) : null}

              {/* Fill-in-blank Answers */}
              {questionType === "fill_in_blank" && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">
                    {t('correct_answers_case_insensitive')}
                  </Label>
                  <div className="space-y-2">
                    {fillInAnswers.map((answer, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <Input
                          className="flex-1"
                          value={answer}
                          onChange={(e) => handleFillInAnswerChange(index, e.target.value)}
                          placeholder={t('answer_placeholder', { index: index + 1 })}
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveFillInAnswer(index)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                    <Button
                      variant="outline"
                      onClick={handleAddFillInAnswer}
                    >
                      {t('add_answer')}
                    </Button>
                  </div>
                </div>
              )}

              {/* Explanation */}
              <Textarea
                placeholder={t('explanation_optional')}
                value={explanation}
                onChange={(e) => setExplanation(e.target.value)}
                className="min-h-[80px]"
              />

              {/* Submit */}
              <Button
                onClick={handleQuestionSubmit}
                className="w-full"
                disabled={updateQuestion.isPending}
              >
                {updateQuestion.isPending ? t('saving') : t('save_question')}
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Alert Dialog */}
      <AlertDialog open={alertDialog.isOpen} onOpenChange={hideAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{alertDialog.title}</AlertDialogTitle>
            <AlertDialogDescription>{alertDialog.description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            {alertDialog.showCancel && (
              <AlertDialogCancel onClick={hideAlert}>
                {alertDialog.cancelText || "Cancel"}
              </AlertDialogCancel>
            )}
            <AlertDialogAction
              onClick={handleAlertConfirm}
              className={cn(
                alertDialog.variant === "destructive" && "text-red-600 hover:bg-red-600 hover:text-white",
                alertDialog.variant === "success" && "text-green-600 hover:bg-green-600 hover:text-white"
              )}
            >
              {alertDialog.confirmText || "OK"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
