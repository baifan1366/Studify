import { Question } from "@/interface/onboarding/question-interface";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

export default function QuestionComponent({ question, onChange, value }: { question: Question, onChange: (id: string, value: any) => void, value: any }) {
  return (
    <div className="space-y-4">
      <Label>{question.text}</Label>
      {question.type === "text" && (
        <Input name={question.id} placeholder="Enter your answer" onChange={(e) => onChange(question.id, e.target.value)} value={value || ''} />
      )}
      {question.type === "single-choice" && (
        <RadioGroup name={question.id} onValueChange={(val) => onChange(question.id, val)} value={value}>
          {question.options?.map((option) => (
            <div key={option} className="flex items-center space-x-2">
              <RadioGroupItem value={option} id={`${question.id}-${option}`} />
              <Label htmlFor={`${question.id}-${option}`}>{option}</Label>
            </div>
          ))}
        </RadioGroup>
      )}
      {question.type === "multiple-choice" && (
        <div>
          {question.options?.map((option) => (
            <div key={option} className="flex items-center space-x-2">
              <Checkbox name={question.id} value={option} id={`${question.id}-${option}`} onChange={(e) => {
                const checked = e.target.checked;
                const currentValues = Array.isArray(value) ? value : [];
                if (checked) {
                  onChange(question.id, [...currentValues, option]);
                } else {
                  onChange(question.id, currentValues.filter(v => v !== option));
                }
              }} checked={Array.isArray(value) && value.includes(option)} />
              <Label htmlFor={`${question.id}-${option}`}>{option}</Label>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}