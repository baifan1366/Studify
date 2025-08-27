import { ChatOpenAI } from "@langchain/openai";

export const chatModel = new ChatOpenAI({
  modelName: "openai/gpt-4o-mini",   // 这里可以换成 OpenRouter 支持的任意模型
  apiKey: process.env.OPENROUTER_API_KEY,
  configuration: {
    baseURL: process.env.OPENROUTER_API_BASE,
  },
  temperature: 0.7,
});
