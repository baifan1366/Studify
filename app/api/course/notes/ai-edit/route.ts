import { NextRequest, NextResponse } from "next/server";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { z } from "zod";
import { authorize } from "@/utils/auth/server-guard";
import { createAdminClient } from "@/utils/supabase/server";
import { getLLM } from "@/lib/langChain/client";

const schema = z.object({
  noteId: z.string().uuid().optional(),
  content: z.string().min(1).max(50000),
  instruction: z.string().min(2).max(2000),
});

export async function POST(request: NextRequest) {
  const auth = await authorize("student");
  if (auth instanceof NextResponse) return auth;

  try {
    const input = schema.parse(await request.json());
    const profileId = auth.user.profile?.id;
    if (!profileId) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

    if (input.noteId) {
      const supabase = await createAdminClient();
      const { data: ownedNote } = await supabase
        .from("course_notes")
        .select("id")
        .eq("public_id", input.noteId)
        .eq("user_id", profileId)
        .eq("is_deleted", false)
        .maybeSingle();
      if (!ownedNote) return NextResponse.json({ error: "Note not found" }, { status: 404 });
    }

    const llm = await getLLM({
      model: process.env.OPENROUTER_MODEL_FAST || "openrouter/owl-alpha",
      temperature: 0.2,
    });
    const result = await llm.invoke([
      new SystemMessage(
        "You edit study notes. Follow the user's instruction while preserving factual meaning, timestamps, links, and citations. Return only the complete revised note in valid Markdown. Do not wrap it in a code fence."
      ),
      new HumanMessage(`Instruction:\n${input.instruction}\n\nCurrent note:\n${input.content}`),
    ]);
    const content = typeof result.content === "string" ? result.content.trim() : String(result.content);
    return NextResponse.json({ success: true, content });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid edit request", details: error.errors }, { status: 400 });
    }
    console.error("AI note edit failed:", error);
    return NextResponse.json({ error: "Unable to edit note" }, { status: 500 });
  }
}
