import { Question } from "@/interface/onboarding/question-interface";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { motion } from "framer-motion";

export default function QuestionComponent({ question, onChange, value }: { question: Question, onChange: (id: string, value: any) => void, value: any }) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      <Label className="text-lg font-semibold text-white">{question.text}</Label>
      
      {question.type === "text" && (
        <Input 
          name={question.id} 
          placeholder="Enter your answer" 
          onChange={(e) => onChange(question.id, e.target.value)} 
          value={value || ''}
          className="bg-white/10 border-white/20 text-white placeholder-white/50 focus:border-blue-400 focus:ring-blue-400/20"
        />
      )}
      
      {question.type === "single-choice" && (
        <RadioGroup name={question.id} onValueChange={(val) => onChange(question.id, val)} value={value}>
          <div className="grid gap-3">
            {question.options?.map((option, index) => (
              <motion.div 
                key={option}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1, duration: 0.3 }}
                className="flex items-center space-x-3 p-3 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 transition-all cursor-pointer"
              >
                <RadioGroupItem 
                  value={option} 
                  id={`${question.id}-${option}`}
                  className="border-white/30 text-blue-400"
                />
                <Label 
                  htmlFor={`${question.id}-${option}`}
                  className="text-white cursor-pointer flex-1 font-medium"
                >
                  {option}
                </Label>
              </motion.div>
            ))}
          </div>
        </RadioGroup>
      )}
      
      {question.type === "multiple-choice" && (
        <div className="grid gap-3">
          {question.options?.map((option, index) => (
            <motion.div 
              key={option}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1, duration: 0.3 }}
              className="flex items-center space-x-3 p-3 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 transition-all cursor-pointer"
            >
              <Checkbox 
                name={question.id} 
                value={option} 
                id={`${question.id}-${option}`} 
                onChange={(e) => {
                  const checked = e.target.checked;
                  const currentValues = Array.isArray(value) ? value : [];
                  if (checked) {
                    onChange(question.id, [...currentValues, option]);
                  } else {
                    onChange(question.id, currentValues.filter(v => v !== option));
                  }
                }} 
                checked={Array.isArray(value) && value.includes(option)}
                className="border-white/30 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
              />
              <Label 
                htmlFor={`${question.id}-${option}`}
                className="text-white cursor-pointer flex-1 font-medium"
              >
                {option}
              </Label>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
}