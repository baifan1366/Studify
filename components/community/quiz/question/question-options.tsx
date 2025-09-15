"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export default function QuestionOptions({
  options,
  correctOptionId,
}: {
  options: { id: string; text: string }[];
  correctOptionId: string;
}) {
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-3 mb-6">
      {options.map((opt) => {
        const isSelected = selected === opt.id;
        const isCorrect = selected && opt.id === correctOptionId;
        const isWrong = selected && isSelected && opt.id !== correctOptionId;

        return (
          <Button
            key={opt.id}
            variant={
              isCorrect ? "default" : isWrong ? "destructive" : "outline"
            }
            onClick={() => setSelected(opt.id)}
            className="justify-start"
          >
            {opt.text}
          </Button>
        );
      })}
    </div>
  );
}
