"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info } from "lucide-react";
import QuizScoreDisplay from "@/components/community/quiz/quiz-score-display";
import { useUser } from "@/hooks/profile/use-user";

interface QuizResultModalProps {
  quizSlug: string;
  attemptId?: number | null;
  totalQuestions?: number;
  open?: boolean;
  // Preview mode props
  isPreview?: boolean;
  previewScore?: number;
}

export default function QuizResultModal({ 
  quizSlug, 
  attemptId, 
  totalQuestions = 0, 
  open = true,
  isPreview = false,
  previewScore
}: QuizResultModalProps) {
  const t = useTranslations('QuizResultModal');
  const router = useRouter();
  const { data: currentUser } = useUser();
  const isTutor = currentUser?.profile?.role === 'tutor';

  const handleClose = () => {
    const route = isTutor
      ? `/tutor/community/quizzes/${quizSlug}`
      : `/community/quizzes/${quizSlug}`;
    router.replace(route);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isPreview ? t('preview_completed') : t('quiz_completed')}
          </DialogTitle>
        </DialogHeader>

        {isPreview && (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              {t('preview_notice')}
            </AlertDescription>
          </Alert>
        )}

        <div className="py-2">
          <QuizScoreDisplay 
            attemptId={isPreview ? null : attemptId} 
            totalQuestions={totalQuestions}
            isPreview={isPreview}
            previewScore={previewScore}
          />
        </div>

        <DialogFooter className="flex">
          <Button onClick={handleClose}>{t('close')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
