import { NextRequest, NextResponse } from 'next/server';
import { authorize } from '@/utils/auth/server-guard';
import { enhancedAIExecutor } from '@/lib/langChain/tool-calling-integration';
import { z } from 'zod';

// Request validation schema for content analysis
const analysisRequestSchema = z.object({
  content: z.string().min(1, 'Content is required'),
  analysisType: z.enum(['summary', 'topics', 'questions', 'notes', 'problem_solving', 'learning_path']).default('summary'),
  includeRecommendations: z.boolean().default(false),
  // 新增支持图片上传的情况
  imageUrl: z.string().optional(),
  // 学习路径特定参数
  learningGoal: z.string().optional(),
  currentLevel: z.string().optional(),
  timeConstraint: z.string().optional()
});

export async function POST(request: NextRequest) {
  try {
    // Authorize user
    const authResult = await authorize('student');
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const user = authResult.user;

    // Handle both JSON and FormData (for image uploads)
    let validatedData;
    const contentType = request.headers.get('content-type');
    
    if (contentType?.includes('multipart/form-data')) {
      // Handle image upload for problem solving
      const formData = await request.formData();
      const content = formData.get('content') as string || '';
      const analysisTypeRaw = formData.get('analysisType') as string || 'problem_solving';
      const includeRecommendations = formData.get('includeRecommendations') === 'true';
      const imageFile = formData.get('image') as File;
      
      // Validate analysisType
      const validAnalysisTypes = ['summary', 'topics', 'questions', 'notes', 'problem_solving'] as const;
      const analysisType = validAnalysisTypes.includes(analysisTypeRaw as any) 
        ? analysisTypeRaw as typeof validAnalysisTypes[number]
        : 'problem_solving';
      
      let imageData = null;
      if (imageFile) {
        // Convert image to base64 for AI processing
        const arrayBuffer = await imageFile.arrayBuffer();
        const base64 = Buffer.from(arrayBuffer).toString('base64');
        const mimeType = imageFile.type || 'image/jpeg';
        imageData = `data:${mimeType};base64,${base64}`;
        
        console.log(`📸 Processing uploaded image: ${imageFile.name} (${imageFile.size} bytes, ${mimeType})`);
      }
      
      validatedData = {
        content: imageData || content, // Use image data as content for AI analysis
        analysisType,
        includeRecommendations,
        imageUrl: imageFile ? `uploaded_${imageFile.name}` : undefined
      };
    } else {
      // Handle JSON request
      const body = await request.json();
      validatedData = analysisRequestSchema.parse(body);
    }

    const { content, analysisType, includeRecommendations, imageUrl, learningGoal, currentLevel, timeConstraint } = validatedData;

    console.log(`📊 Content analysis request from user ${authResult.payload.sub}: ${analysisType} analysis for content (${content.length} chars)`);

    // Execute course analysis with tools
    const startTime = Date.now();
    const result = await enhancedAIExecutor.analyzeCourseContent(
      content,
      analysisType,
      {
        userId: parseInt(authResult.payload.sub),
        includeRecommendations,
        imageUrl,
        learningGoal,
        currentLevel,
        timeConstraint
      }
    );

    const processingTime = Date.now() - startTime;

    console.log(`✅ Course analysis completed in ${processingTime}ms using tools: ${result.toolsUsed.join(', ')}`);

    return NextResponse.json({
      success: true,
      type: analysisType,
      result: result.analysis,
      answer: result.analysis, // For compatibility with frontend
      content: {
        preview: imageUrl ? `Image: ${imageUrl}` : content.substring(0, 200) + (content.length > 200 ? '...' : ''),
        length: content.length,
        type: imageUrl ? 'image' : 'text'
      },
      analysisType,
      analysis: result.analysis,
      recommendations: result.recommendations,
      toolsUsed: result.toolsUsed,
      executionTime: result.executionTime,
      confidence: 0.95, // Default confidence for image analysis
      metadata: {
        processingTimeMs: processingTime,
        includeRecommendations,
        timestamp: new Date().toISOString(),
        userId: authResult.payload.sub,
        imageProcessed: !!imageUrl
      }
    });

  } catch (error) {
    console.error('❌ Course analysis error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: 'Validation error',
          details: error.errors
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { 
        error: 'Course analysis failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
