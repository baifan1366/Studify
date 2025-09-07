// lib/ai/openrouter.ts
import { ChatOpenAI } from "@langchain/openai";

export function getLLM(model = "gpt-4o-mini") {
  return new ChatOpenAI({
    model,
    temperature: 0.3,
    openAIApiKey: process.env.OPENROUTER_API_KEY!,
    configuration: {
      baseURL: "https://openrouter.ai/api/v1", // 👈 OpenRouter 关键
    },
  });
}
