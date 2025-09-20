"use client";

import { useRouter } from "next/navigation";
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
  const router = useRouter();

  const handleClose = () => {
    router.replace(`/community/quizzes/${quizSlug}`);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Quiz Results</DialogTitle>
          <DialogDescription>
            下方为本次测验成绩。你可以返回测验详情页面查看排行榜和其他信息。
          </DialogDescription>
        </DialogHeader>

        <div className="py-2">
          <QuizScoreDisplay attemptId={attemptId} totalQuestions={totalQuestions} />
        </div>

        <DialogFooter className="flex gap-2">
          <Button variant="secondary" onClick={handleClose}>Back to Quiz</Button>
          <Button onClick={handleClose}>OK</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
