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

    // Check if streaming is requested
    const isStreaming = request.headers.get("accept") === "text/event-stream";

    // Check lesson type and determine appropriate model
    let isExternalVideo = false;
    let lessonKind: string | null = null;
    let useDocumentModel = false;
    let attachmentId: number | null = null;

    if (videoContext.currentLessonId) {
      const { createAdminClient } = await import("@/utils/supabase/server");
      const supabase = await createAdminClient();

      // First get the lesson with its attachments array
      const { data: lesson, error: lessonError } = await supabase
        .from("course_lesson")
        .select("content_url, kind, attachments")
        .eq("public_id", videoContext.currentLessonId)
        .single();

      if (lessonError) {
        console.error("❌ Error fetching lesson:", lessonError);
      } else if (lesson) {
        lessonKind = lesson.kind;

        // Get attachment ID for video lessons
        // attachments is a JSONB array, need to parse it properly
        if (
          lesson.attachments &&
          Array.isArray(lesson.attachments) &&
          lesson.attachments.length > 0
        ) {
          // Extract attachment IDs from JSONB array
          const attachmentIds = lesson.attachments
            .map((id: any) => (typeof id === "number" ? id : parseInt(id)))
            .filter((id: any) => !isNaN(id));

          if (attachmentIds.length > 0) {
            // Query to find video attachment
            const { data: attachments } = await supabase
              .from("course_attachments")
              .select("id, type")
              .in("id", attachmentIds)
              .eq("type", "video")
              .limit(1);

            if (attachments && attachments.length > 0) {
              attachmentId = attachments[0].id;
            }
          }
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
        }
      }
    }

    // ✅ Use unified Tool Calling Agent instead of manual orchestration
    const startTime = Date.now();

    // Select appropriate model based on lesson type
    const modelToUse = useDocumentModel
      ? process.env.OPEN_ROUTER_DOCUMENT_MODEL ||
        "nvidia/nemotron-nano-12b-v2-vl:free"
      : process.env.OPEN_ROUTER_MODEL || "z-ai/glm-4.5-air:free";

    // Specify content types to search - prioritize video_segment for video lessons
    const contentTypes = isExternalVideo
      ? ["course_content", "lesson", "note"] // External videos don't have segments
      : videoContext.currentLessonId
      ? ["video_segment", "lesson", "note"] // Prioritize video segments for video lessons
      : ["course_content", "lesson", "note"]; // General content for non-video

    // If streaming is requested, use Server-Sent Events
    if (isStreaming) {
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        async start(controller) {
          try {
            // Send initial metadata
            const metadata = {
              type: "metadata",
              videoContext,
              contentTypes,
              model: modelToUse,
            };
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify(metadata)}\n\n`)
            );

            // Pass just the user's question - educationalQA will handle the search internally
            const result = await enhancedAIExecutor.educationalQA(question, {
              userId,
              includeAnalysis: true,
              conversationContext: conversationHistory,
              contentTypes,
              model: modelToUse,
              // Pass video context separately so the tool can use it properly
              videoContext: videoContext.currentLessonId
                ? {
                    lessonId: videoContext.currentLessonId,
                    ...(attachmentId !== null && { attachmentId }), // Only include if not null
                    currentTime: videoContext.currentTimestamp || 0,
                  }
                : undefined,
            });

            // Stream the answer word by word for better UX
            const words = result.answer.split(" ");
            for (let i = 0; i < words.length; i++) {
              const chunk = {
                type: "token",
                content: words[i] + (i < words.length - 1 ? " " : ""),
              };
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`)
              );
              // Small delay for smoother streaming
              await new Promise((resolve) => setTimeout(resolve, 30));
            }

            // Send final metadata
            const totalProcessingTime = Date.now() - startTime;
            const formattedSources = (result.sources || []).map(
              (source: any) => ({
                type: source.type || "course_content",
                title: source.title || "Course Content",
                timestamp: source.timestamp,
                url: source.url,
                contentPreview:
                  source.contentPreview || source.content?.substring(0, 100),
              })
            );

            const finalData = {
              type: "final",
              sources: formattedSources,
              confidence: result.confidence || 0.85,
              toolsUsed: result.toolsUsed || [],
              processingTimeMs: totalProcessingTime,
            };
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify(finalData)}\n\n`)
            );

            controller.close();
          } catch (error) {
            console.error("❌ Streaming error:", error);
            const errorData = {
              type: "error",
              message: error instanceof Error ? error.message : "Unknown error",
            };
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify(errorData)}\n\n`)
            );
            controller.close();
          }
        },
      });

      return new Response(stream, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
          "X-RateLimit-Limit": limit.toString(),
          "X-RateLimit-Remaining": remaining.toString(),
          "X-RateLimit-Reset": resetTime.toString(),
        },
      });
    }

    // Non-streaming response (original behavior)
    // Pass just the user's question - educationalQA will handle the search internally
    const result = await enhancedAIExecutor.educationalQA(question, {
      userId,
      includeAnalysis: true,
      conversationContext: conversationHistory,
      contentTypes,
      model: modelToUse,
      // Pass video context separately so the tool can use it properly
      videoContext: videoContext.currentLessonId
        ? {
            lessonId: videoContext.currentLessonId,
            ...(attachmentId !== null && { attachmentId }), // Only include if not null
            currentTime: videoContext.currentTimestamp || 0,
          }
        : undefined,
    });

    const totalProcessingTime = Date.now() - startTime;

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
