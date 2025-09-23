"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useTranslations } from "next-intl";
import { useCreateBan } from "@/hooks/ban/use-ban";

interface ReportButtonProps {
  targetId: number;
  targetType: "post" | "chat" | "comment" | "course" | "user" | "other";
}

export function ReportButton({ targetId, targetType }: ReportButtonProps) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<string>("");
  const { toast } = useToast();
  const t = useTranslations('ReportButton')
  const { mutateAsync: createBan } = useCreateBan();

  const handleSubmit = async () => {
    if (!reason.trim()) {
      toast({
        title: t('reasonRequired'),
        description: t('reasonRequiredDescription'),
        variant: "destructive",
      });
      return;
    }

    try {
      await createBan({
        body: {
          target_id: targetId,
          target_type: targetType,
          reason: reason.trim(),
        },
      });

      toast({
        title: t('reportSubmitted'),
        description: t('reportSubmittedDescription'),
      });

      setOpen(false);
      setReason(""); // reset
    } catch (err) {
      toast({
        title: t('error'),
        description: t('errorDescription'),
        variant: "destructive",
      });
    }
  };  

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" aria-label="More options">
            ⋮
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setOpen(true)}>
            {t('report')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('report') + ' ' + t(targetType)}</DialogTitle>
          </DialogHeader>

          <div className="space-y-2">
            <Label htmlFor="reason">{t('reason')}</Label>
            <Textarea
              id="reason"
              placeholder={t('reasonPlaceholder')}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="min-h-[100px]"
              autoFocus
              maxLength={255}
            />
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              {t('cancel')}
            </Button>
            <Button onClick={handleSubmit}>{t('submit')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
