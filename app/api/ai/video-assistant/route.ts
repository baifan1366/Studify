import { NextRequest, NextResponse } from "next/server";
import { authorize } from "@/utils/auth/server-guard";
import { enhancedAIExecutor } from "@/lib/langChain/tool-calling-integration";
import { createRateLimitCheck, rateLimitResponse } from "@/lib/ratelimit";
import { z } from "zod";

// Request validation schema for video AI assistant
const videoAssistantRequestSchema = z.object({
  question: z.string().min(1, "Question is required"),
  videoContext: z.object({
    courseSlug: z.string(),
    currentLessonId: z.string().optional(),
    currentTimestamp: z.number().optional(),
    selectedText: z.string().optional(),
  }),
  conversationHistory: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string(),
      })
    )
    .optional(),
});

export async function POST(request: NextRequest) {
  try {
    // Authorize user (require student role or higher)
    const authResult = await authorize("student");
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const user = authResult.user;
    const userId = parseInt(authResult.payload.sub);

    // Rate limiting check
    const checkLimit = createRateLimitCheck("videoQA");
    const { allowed, remaining, resetTime, limit } = checkLimit(
      userId.toString()
    );

    if (!allowed) {
      return NextResponse.json(rateLimitResponse(resetTime, limit), {
        status: 429,
        headers: {
          "X-RateLimit-Limit": limit.toString(),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": resetTime.toString(),
        },
      });
    }

    // Parse and validate request
    const body = await request.json();
    const validatedData = videoAssistantRequestSchema.parse(body);

    const { question, videoContext, conversationHistory } = validatedData;

    console.log(
      `🎓 Video AI Assistant request from user ${userId}: "${question.substring(
        0,
        50
      )}..."`
    );
    console.log(
      `📍 Context: Course=${videoContext.courseSlug}, Lesson=${videoContext.currentLessonId}, Time=${videoContext.currentTimestamp}s`
    );

    // Check lesson type and determine appropriate model
    let isExternalVideo = false;
    let lessonKind: string | null = null;
    let useDocumentModel = false;
    let attachmentId: number | null = null;

    if (videoContext.currentLessonId) {
      const { createAdminClient } = await import("@/utils/supabase/server");
      const supabase = await createAdminClient();

      const { data: lesson } = await supabase
        .from("course_lesson")
        .select(
          `
          content_url, 
          kind,
          course_attachments!inner(id, file_type)
        `
        )
        .eq("public_id", videoContext.currentLessonId)
        .single();

      if (lesson) {
        lessonKind = lesson.kind;

        // Get attachment ID for video lessons
        if (
          lesson.course_attachments &&
          Array.isArray(lesson.course_attachments)
        ) {
          const videoAttachment = lesson.course_attachments.find(
            (a: any) => a.file_type === "video"
          );
          attachmentId = videoAttachment?.id || null;
        }

        // Check if it's an external video
        if (lesson.content_url) {
          isExternalVideo =
            lesson.content_url.includes("youtube.com") ||
            lesson.content_url.includes("youtu.be") ||
            lesson.content_url.includes("vimeo.com");
        }

        // Use document model for PDF and image types
        if (lesson.kind === "document" || lesson.kind === "image") {
          useDocumentModel = true;
          console.log(
            `📄 Document/Image lesson detected - using DOCUMENT model`
          );
        }

        console.log(
          `📎 Lesson info: kind=${lessonKind}, attachmentId=${attachmentId}, isExternal=${isExternalVideo}`
        );
      }
    }

    // ✅ Use unified Tool Calling Agent instead of manual orchestration
    const startTime = Date.now();

    // Select appropriate model based on lesson type
    const modelToUse = useDocumentModel
      ? process.env.OPEN_ROUTER_DOCUMENT_MODEL ||
        "nvidia/nemotron-nano-12b-v2-vl:free"
      : process.env.OPEN_ROUTER_MODEL || "z-ai/glm-4.5-air:free";

    console.log(
      `🤖 Using model: ${modelToUse} (Document model: ${useDocumentModel})`
    );

    // Build context-aware question with video metadata
    let contextualizedQuestion = "";

    if (isExternalVideo) {
      console.log(
        `🎬 External video detected - using direct AI without embeddings`
      );
      contextualizedQuestion = `Video Learning Context (External Video - YouTube/Vimeo):
- Course: ${videoContext.courseSlug}
- Lesson: ${videoContext.currentLessonId || "Not specified"}
- Video timestamp: ${videoContext.currentTimestamp || 0} seconds
${
  videoContext.selectedText
    ? `- Selected text: "${videoContext.selectedText}"`
    : ""
}

Note: This is an external video (YouTube/Vimeo) without available transcripts or embeddings.

Student Question: ${question}

Please provide a clear, educational answer that:
1. Provides general guidance based on the course and lesson context
2. Offers relevant learning suggestions and resources
3. If specific video content is needed, suggest reviewing the video at the mentioned timestamp
4. Encourages deeper understanding through related concepts`;
    } else {
      // For internal videos with embeddings, provide context for the AI to use the search tool
      contextualizedQuestion = `Video Learning Context:
- Course: ${videoContext.courseSlug}
- Lesson: ${videoContext.currentLessonId || "Not specified"}
- Video timestamp: ${videoContext.currentTimestamp || 0} seconds
${
  videoContext.selectedText
    ? `- Selected text: "${videoContext.selectedText}"`
    : ""
}

Student Question: ${question}

Please search for relevant video content at the current timestamp and provide a clear, educational answer that:
1. Connects to the specific video content and timestamp
2. Uses course materials and lesson context
3. Provides actionable learning suggestions
4. Encourages deeper understanding`;
    }

    // Specify content types to search - prioritize video_segment for video lessons
    const contentTypes = isExternalVideo
      ? ["course_content", "lesson", "note"] // External videos don't have segments
      : videoContext.currentLessonId
      ? ["video_segment", "lesson", "note"] // Prioritize video segments for video lessons
      : ["course_content", "lesson", "note"]; // General content for non-video

    const result = await enhancedAIExecutor.educationalQA(
      contextualizedQuestion,
      {
        userId,
        includeAnalysis: true,
        conversationContext: conversationHistory,
        contentTypes,
        model: modelToUse,
        // Pass video context separately so the tool can use it properly
        videoContext: videoContext.currentLessonId
          ? {
              lessonId: videoContext.currentLessonId,
              attachmentId: attachmentId,
              currentTime: videoContext.currentTimestamp || 0,
            }
          : undefined,
      }
    );

    const totalProcessingTime = Date.now() - startTime;

    console.log(
      `✅ Video AI Assistant completed in ${totalProcessingTime}ms using tools: ${
        result.toolsUsed?.join(", ") || "NONE"
      }`
    );
    console.log(
      `📊 Response quality: Sources=${result.sources?.length || 0}, Tools=${
        result.toolsUsed?.length || 0
      }`
    );
    console.log(
      `📝 Answer preview: ${result.answer?.substring(0, 200) || "No answer"}`
    );

    // Format sources for compatibility
    const formattedSources = (result.sources || []).map((source: any) => ({
      type: source.type || "course_content",
      title: source.title || "Course Content",
      timestamp: source.timestamp,
      url: source.url,
      contentPreview:
        source.contentPreview || source.content?.substring(0, 100),
    }));

    return NextResponse.json(
      {
        success: true,
        question,
        answer: result.answer,
        sources: formattedSources,
        confidence: result.confidence || 0.85,
        webSearchUsed: result.toolsUsed?.includes("search") || false,
        suggestedActions: [
          "Review related course materials",
          "Take notes on key points",
          "Try related practice questions",
        ],
        relatedConcepts: formattedSources.slice(0, 3).map((s: any) => s.title),
        metadata: {
          processingTimeMs: totalProcessingTime,
          aiProcessingTimeMs: totalProcessingTime,
          videoContext,
          sourcesCount: formattedSources.length,
          toolsUsed: result.toolsUsed || [],
          timestamp: new Date().toISOString(),
          userId: authResult.payload.sub,
          conversationHistoryLength: conversationHistory?.length || 0,
          upgraded: true, // Mark as using new Tool Calling architecture
        },
      },
      {
        headers: {
          "X-RateLimit-Limit": limit.toString(),
          "X-RateLimit-Remaining": remaining.toString(),
          "X-RateLimit-Reset": resetTime.toString(),
        },
      }
    );
  } catch (error) {
    console.error("❌ Video AI Assistant error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: "Validation error",
          details: error.errors,
          message: "Please check your request format",
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error: "Video AI Assistant failed",
        message: error instanceof Error ? error.message : "Unknown error",
        suggestion:
          "Please try again or contact support if the problem persists",
      },
      { status: 500 }
    );
  }
}

// GET endpoint to check AI assistant status and capabilities
export async function GET(request: NextRequest) {
  try {
    const authResult = await authorize("student");
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    return NextResponse.json({
      success: true,
      status: "operational",
      capabilities: {
        questionAnswering: true,
        contextAwareness: true,
        courseContentSearch: true,
        webFallback: true,
        conversationHistory: true,
        sourceAttribution: true,
        confidenceScoring: true,
      },
      features: {
        doubleCallPattern: true,
        multiSourceRetrieval: true,
        intelligentFallback: true,
        videoContextIntegration: true,
        userPersonalization: true,
      },
      supportedContentTypes: [
        "course_content",
        "lesson",
        "note",
        "metadata",
        "web",
        "video_segment",
      ],
      version: "1.0.0",
      lastUpdated: new Date().toISOString(),
    });
  } catch (error) {
    console.error("❌ Error checking AI assistant status:", error);
    return NextResponse.json(
      { error: "Failed to check AI assistant status" },
      { status: 500 }
    );
  }
}
