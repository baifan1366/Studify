"use client";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertTriangle, Trash2 } from "lucide-react";
import { useDeleteQuiz } from "@/hooks/community/use-quiz";
import { toast } from "sonner";

interface DeleteQuizModalProps {
  quizSlug: string;
  quizTitle: string;
  onDeleteSuccess?: () => void;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function DeleteQuizModal({
  quizSlug,
  quizTitle,
  onDeleteSuccess,
  isOpen,
  onOpenChange
}: DeleteQuizModalProps) {
  const t = useTranslations('DeleteQuizModal');
  const [confirmText, setConfirmText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const router = useRouter();
  
  const deleteQuizMutation = useDeleteQuiz(quizSlug);

  const handleDelete = async () => {
    if (confirmText !== quizTitle) {
      toast.error(t('type_title_exact'));
      return;
    }

    setIsDeleting(true);
    try {
      const result = await deleteQuizMutation.mutateAsync();
      toast.success(`Quiz "${result.quiz_title}" ${t('deleted_success')}`);
      onOpenChange(false);
      setConfirmText("");
      
      // Call the success callback if provided
      if (onDeleteSuccess) {
      } else {
        // Default behavior: redirect to quizzes list
        router.push("/community/quizzes");
      }
    } catch (error: any) {
      toast.error(t('delete_failed'));
      const errorMessage = error?.response?.data?.details || error?.response?.data?.error || error?.message || t('delete_failed');
      const errorCode = error?.response?.data?.code;
      toast.error(`${errorMessage}${errorCode ? ` (Code: ${errorCode})` : ''}`);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!isDeleting) {
      onOpenChange(open);
      if (!open) {
        setConfirmText("");
      }
    }
  };

  const isConfirmValid = confirmText === quizTitle;

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent 
        className="sm:max-w-[425px]"
        onClick={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            Delete Quiz
          </DialogTitle>
          <DialogDescription className="text-left">
            This action cannot be undone. This will permanently delete the quiz
            <strong className="font-semibold"> "{quizTitle}"</strong> and remove all associated data including:
          </DialogDescription>
        </DialogHeader>
        
        <div 
          className="py-4"
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1 mb-4">
            <li>All quiz questions and answers</li>
            <li>Student attempts and scores</li>
            <li>Quiz statistics and leaderboard</li>
            <li>Comments and interactions</li>
          </ul>
          
          <div className="space-y-2">
            <Label htmlFor="confirm-text" className="text-sm font-medium">
              Type <strong>"{quizTitle}"</strong> to confirm deletion:
            </Label>
            <Input
              id="confirm-text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder={quizTitle}
              disabled={isDeleting}
              className="w-full"
              onClick={(e) => e.stopPropagation()}
              onFocus={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
            />
          </div>
        </div>

        <DialogFooter className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={!isConfirmValid || isDeleting}
            className="flex items-center gap-2"
          >
            {isDeleting ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Deleting...
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4" />
                Delete Quiz
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
