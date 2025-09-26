"use client";

import { useState } from "react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { X } from "lucide-react";

interface Props {
  quizSlug: string;
}

export default function QuestionForm({ quizSlug }: Props) {
  const [questionType, setQuestionType] = useState<
    "single_choice" | "multiple_choice" | "fill_in_blank"
  >("single_choice");
  const [questionText, setQuestionText] = useState("");
  const [options, setOptions] = useState<string[]>([]);
  const [correctAnswers, setCorrectAnswers] = useState<(string | number)[]>([]);
  const [explanation, setExplanation] = useState("");

  const { data: questions } = useQuizQuestions(quizSlug);
  const { mutate: createQuestion } = useCreateQuizQuestion(quizSlug);

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
        alert("You must provide at least 2 valid options.");
        return;
      }
      if (correctAnswers.length === 0) {
        alert("Please select at least one correct answer.");
        return;
      }
    } else {
      const filtered = correctAnswers
        .map((ans) => ans.toString().trim())
        .filter((ans) => ans !== "");
      if (filtered.length === 0) {
        alert(
          "You must provide at least one correct answer for fill-in-the-blank."
        );
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

  return (
    <Card className="p-6 shadow-lg rounded-2xl space-y-2">
      <CardHeader className="flex flex-col items-start gap-2">
        {/* Question Counter */}
        {questions && (
          <div className="flex items-center justify-center gap-1 bg-blue-100 text-blue-700 px-3 py-2 rounded-full text-lg font-semibold w-full">
            <span className="inline-block">✅</span>
            <span>{questions.length} questions created so far</span>
          </div>
        )}
        <CardTitle className="text-xl font-bold">Create a Question</CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Question text */}
        <Textarea
          placeholder="Enter your question..."
          value={questionText}
          onChange={(e) => setQuestionText(e.target.value)}
          className="min-h-[100px]"
        />

        {/* Question type selector */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Question Type</label>
          <Select
            value={questionType}
            onValueChange={(v) => setQuestionType(v as any)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="single_choice">Single Choice</SelectItem>
              <SelectItem value="multiple_choice">Multiple Choice</SelectItem>
              <SelectItem value="fill_in_blank">Fill in the Blank</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Render inputs depending on type */}
        {questionType === "fill_in_blank" ? (
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Correct Answers (case-insensitive)
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
                + Add Answer
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
                    (Correct Answer)
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
              + Add Option
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
                    (Correct Answer)
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
              + Add Option
            </Button>
          </div>
        )}

        {/* Explanation */}
        <Textarea
          placeholder="Explanation (optional)"
          value={explanation}
          onChange={(e) => setExplanation(e.target.value)}
          className="min-h-[80px]"
        />

        {/* Submit */}
        <Button onClick={handleSubmit} className="w-full">
          Add Question
        </Button>
      </CardContent>
    </Card>
  );
}
