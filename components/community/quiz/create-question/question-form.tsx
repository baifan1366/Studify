"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import {
  useCreateQuizQuestion,
  useQuizQuestions,
} from "@/hooks/community/use-quiz-questions";
import { useUpdateQuiz } from "@/hooks/community/use-quiz";
import { useUser } from "@/hooks/profile/use-user";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { X, Save } from "lucide-react";
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
import { useCallback } from "react";

interface Props {
  quizSlug: string;
}

export default function QuestionForm({ quizSlug }: Props) {
  const t = useTranslations('QuestionForm');
  const [questionType, setQuestionType] = useState<
    "single_choice" | "multiple_choice" | "fill_in_blank"
  >("single_choice");
  const [questionText, setQuestionText] = useState("");
  const [options, setOptions] = useState<string[]>([]);
  const [correctAnswers, setCorrectAnswers] = useState<(string | number)[]>([]);
  const [explanation, setExplanation] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const router = useRouter();
  const { data: user } = useUser();

  const isTutor = user?.profile?.role === 'tutor';
  const { data: questions } = useQuizQuestions(quizSlug);
  const { mutate: createQuestion, isPending: isCreatingQuestion } = useCreateQuizQuestion(quizSlug);

  // Alert dialog state
  const [alertDialog, setAlertDialog] = useState<{
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

  const resetForm = () => {
    setQuestionText("");
    setQuestionType("single_choice");
    setOptions([]);
    setCorrectAnswers([]);
    setExplanation("");
  };

  const handleSubmit = () => {
    // ✅ 前端验证
    if (questionType !== "fill_in_blank") {
      const filtered = options
        .map((opt) => opt.trim())
        .filter((opt) => opt !== "");
      if (filtered.length < 2) {
        showAlert({
          title: "Invalid Options",
          description: "You must provide at least 2 valid options.",
          variant: "destructive",
        });
        return;
      }
      if (correctAnswers.length === 0) {
        showAlert({
          title: "No Correct Answer",
          description: "Please select at least one correct answer.",
          variant: "destructive",
        });
        return;
      }
    } else {
      const filtered = correctAnswers
        .map((ans) => ans.toString().trim())
        .filter((ans) => ans !== "");
      if (filtered.length === 0) {
        showAlert({
          title: "No Correct Answer",
          description: "You must provide at least one correct answer for fill-in-the-blank.",
          variant: "destructive",
        });
        return;
      }
    }

    createQuestion({
      questionType,
      questionText,
      options: questionType === "fill_in_blank" ? [] : options,
      correctAnswers,
      explanation,
    }, {
      onSuccess: () => {
        // Reset form fields after successful submission
        resetForm();
        // Show success toast
        toast.success(t('question_added_successfully'), {
          description: t('question_added_description'),
        });
      },
      onError: (error) => {
        // Show error toast
        console.error("Failed to create question:", error);
        toast.error(t('question_add_failed'), {
          description: t('question_add_failed_description'),
        });
      }
    });
  };

  const addOption = () => setOptions([...options, ""]);

  const updateOption = (index: number, value: string) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };

  const removeOption = (index: number) => {
    setOptions(options.filter((_, i) => i !== index));
    setCorrectAnswers(correctAnswers.filter((ans) => ans !== index));
  };

  const toggleCorrect = (index: number) => {
    if (questionType === "single_choice") {
      setCorrectAnswers([index]);
    } else {
      if (correctAnswers.includes(index)) {
        setCorrectAnswers(correctAnswers.filter((i) => i !== index));
      } else {
        setCorrectAnswers([...correctAnswers, index]);
      }
    }
  };

  const handleSaveAndQuit = async () => {
    if (!questions || questions.length === 0) {
      toast.error("No questions to save", {
        description: "Please add at least one question before saving.",
      });
      return;
    }

    setIsSaving(true);

    try {
      // Quiz is already saved when questions are added, just show success and navigate
      toast.success("Quiz saved successfully!", {
        description: `Your quiz has been saved with ${questions.length} questions.`,
      });

      // Navigate based on user role
      const route = isTutor
        ? "/tutor/community/quizzes"
        : "/community/quizzes";
      router.push(route);
    } catch (error) {
      console.error("Save and quit error:", error);
      toast.error("Failed to save quiz", {
        description: "An error occurred while saving the quiz.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <Card className="p-6 shadow-lg rounded-2xl space-y-2">
        <CardHeader className="flex flex-col items-start gap-2">
          {/* Question Counter */}
          {questions && (
            <div className="flex items-center justify-center gap-1 bg-blue-100 text-blue-700 px-3 py-2 rounded-full text-lg font-semibold w-full">
              <span className="inline-block">✅</span>
              <span>{t('questions_created_so_far', { count: questions.length })}</span>
            </div>
          )}
          <CardTitle className="text-xl font-bold">{t('create_a_question')}</CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Question text */}
          <Textarea
            placeholder={t('question_placeholder')}
            value={questionText}
            onChange={(e) => setQuestionText(e.target.value)}
            className="min-h-[100px]"
          />

          {/* Question type selector */}
          <div className="space-y-2">
            <label className="text-sm font-medium">{t('question_type')}</label>
            <Select
              value={questionType}
              onValueChange={(v) => setQuestionType(v as any)}
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
          {questionType === "fill_in_blank" ? (
            <div className="space-y-2">
              <label className="text-sm font-medium">
                {t('correct_answers_case_insensitive')}
              </label>
              <div className="space-y-2">
                {correctAnswers.map((ans, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <Input
                      className="flex-1"
                      value={ans as string}
                      onChange={(e) => {
                        const newAnswers = [...correctAnswers];
                        newAnswers[idx] = e.target.value.trim();
                        setCorrectAnswers(newAnswers);
                      }}
                      placeholder={`Answer ${idx + 1}`}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() =>
                        setCorrectAnswers(
                          correctAnswers.filter((_, i) => i !== idx)
                        )
                      }
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
                <Button
                  variant="outline"
                  onClick={() => setCorrectAnswers([...correctAnswers, ""])}
                >
                  {t('add_answer')}
                </Button>
              </div>
            </div>
          ) : questionType === "single_choice" ? (
            <RadioGroup
              value={correctAnswers[0]?.toString() || ""}
              onValueChange={(val) => toggleCorrect(parseInt(val))}
            >
              {options.map((opt, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <RadioGroupItem value={idx.toString()} id={`option-${idx}`} />
                  <Input
                    className="flex-1"
                    value={opt}
                    onChange={(e) => updateOption(idx, e.target.value)}
                    placeholder={`Option ${idx + 1}`}
                  />
                  {correctAnswers.includes(idx) && (
                    <span className="text-green-600 text-sm font-medium">
                      {t('correct_answer')}
                    </span>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeOption(idx)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}
              <Button variant="outline" onClick={addOption}>
                {t('add_option')}
              </Button>
            </RadioGroup>
          ) : (
            <div className="space-y-2">
              {options.map((opt, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <Checkbox
                    checked={correctAnswers.includes(idx)}
                    onChange={() => toggleCorrect(idx)}
                    id={`option-${idx}`}
                  />
                  <Input
                    className="flex-1"
                    value={opt}
                    onChange={(e) => updateOption(idx, e.target.value)}
                    placeholder={`Option ${idx + 1}`}
                  />
                  {correctAnswers.includes(idx) && (
                    <span className="text-green-600 text-sm font-medium">
                      {t('correct_answer')}
                    </span>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeOption(idx)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}
              <Button variant="outline" onClick={addOption}>
                {t('add_option')}
              </Button>
            </div>
          )}

          {/* Explanation */}
          <Textarea
            placeholder={t('explanation_optional')}
            value={explanation}
            onChange={(e) => setExplanation(e.target.value)}
            className="min-h-[80px]"
          />

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button
              onClick={handleSubmit}
              disabled={isCreatingQuestion}
              className="flex-1"
            >
              {isCreatingQuestion ? (
                <>
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                  {t('adding_question')}
                </>
              ) : (
                t('add_question')
              )}
            </Button>
            <Button
              onClick={handleSaveAndQuit}
              disabled={isSaving || !questions || questions.length === 0}
              variant="outline"
              className="flex-1 flex items-center gap-2"
            >
              {isSaving ? (
                <>
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  {t('saving')}
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  {t('save_and_quit')}
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

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
    </>
  );
}
