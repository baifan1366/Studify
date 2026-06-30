import { NextRequest, NextResponse } from "next/server";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { z } from "zod";
import { authorize } from "@/utils/auth/server-guard";
import { getLLM } from "@/lib/langChain/client";

const schema = z.object({
  targetLanguage: z.string().min(2).max(60),
  segments: z.array(z.object({
    id: z.string(),
    startTime: z.number(),
    endTime: z.number(),
    text: z.string().min(1).max(3000),
  })).min(1).max(300),
});

export async function POST(request: NextRequest) {
  const auth = await authorize("student");
  if (auth instanceof NextResponse) return auth;
  try {
    const input = schema.parse(await request.json());
    const llm = await getLLM({
      model: process.env.OPENROUTER_MODEL_FAST || "nvidia/nemotron-3-super-120b-a12b:free",
      temperature: 0,
    });
    const numbered = input.segments.map((segment, index) => `${index}\t${segment.text}`).join("\n");
    const result = await llm.invoke([
      new SystemMessage(`Translate video subtitles into ${input.targetLanguage}. Preserve meaning and cybersecurity terminology. Return only a JSON array of translated strings in the exact same order.`),
      new HumanMessage(numbered),
    ]);
    const raw = typeof result.content === "string" ? result.content : String(result.content);
    const match = raw.match(/\[[\s\S]*\]/);
    const translated = match ? JSON.parse(match[0]) : [];
    if (!Array.isArray(translated) || translated.length !== input.segments.length) {
      throw new Error("Translation response did not match segment count");
    }
    return NextResponse.json({
      segments: input.segments.map((segment, index) => ({ ...segment, text: String(translated[index]) })),
      language: input.targetLanguage,
    });
  } catch (error) {
    console.error("Transcript translation failed:", error);
    return NextResponse.json({ error: "Unable to translate transcript" }, { status: 500 });
  }
}
