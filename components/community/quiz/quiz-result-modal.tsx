"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import QuizScoreDisplay from "@/components/community/quiz/quiz-score-display";

interface QuizResultModalProps {
  quizSlug: string;
  attemptId: number | null;
  totalQuestions?: number;
  open?: boolean;
}

export default function QuizResultModal({ quizSlug, attemptId, totalQuestions = 0, open = true }: QuizResultModalProps) {
  const t = useTranslations('QuizResultModal');
  const router = useRouter();

  const handleClose = () => {
    router.replace(`/community/quizzes/${quizSlug}`);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t('quiz_completed')}</DialogTitle>
          <DialogDescription>
            {t('view_answers')}
          </DialogDescription>
        </DialogHeader>

        <div className="py-2">
          <QuizScoreDisplay attemptId={attemptId} totalQuestions={totalQuestions} />
        </div>

        <DialogFooter className="flex gap-2">
          <Button variant="secondary" onClick={handleClose}>{t('view_answers')}</Button>
          <Button onClick={handleClose}>{t('close')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
