import { NextRequest, NextResponse } from 'next/server';
import { authorize } from '@/utils/auth/server-guard';
import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { apiKeyManager } from '@/lib/langChain/api-key-manager';

interface TextRequest {
  text: string;
  attachment_url?: string; // Optional URL to attachment file for text extraction
  attachment_type?: string; // File MIME type for proper parsing
}

interface ClassificationResponse {
  classification: string;
  confidence: number;
  probabilities: Record<string, number>;
  analysis: Record<string, any>;
  suggestions: string[];
  processing_time: number;
  text_hash: string;
}

interface ValidationError {
  detail: Array<{
    loc: (string | number)[];
    msg: string;
    type: string;
  }>;
}

// Extract text from attachment files
async function extractTextFromAttachment(attachmentUrl: string, mimeType: string): Promise<string> {
  try {
    const response = await fetch(attachmentUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch attachment: ${response.status}`);
    }

    // Handle text-based files
    if (mimeType.startsWith('text/')) {
      return await response.text();
    }

    // Handle PDF files (basic text extraction)
    if (mimeType === 'application/pdf') {
      // For now, return a message indicating PDF support is limited
      // In a production environment, you'd use a library like pdf-parse
      return 'PDF text extraction not fully implemented. Please copy and paste the text content for analysis.';
    }

    // Handle Word documents (.docx)
    if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      // For now, return a message indicating Word support is limited
      // In a production environment, you'd use a library like mammoth
      return 'Word document text extraction not fully implemented. Please copy and paste the text content for analysis.';
    }

    // Handle other document formats
    if (mimeType.startsWith('application/')) {
      return 'Document text extraction not supported for this file type. Please copy and paste the text content for analysis.';
    }

    // For unsupported file types
    throw new Error(`Unsupported file type: ${mimeType}`);

  } catch (error) {
    console.error('Text extraction error:', error);
    throw new Error(`Failed to extract text from attachment: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Mock classification function for development
async function getMockClassification(text: string): Promise<ClassificationResponse> {
  const startTime = Date.now();
  
  // Simple heuristic-based mock classification
  let classification = 'human';
  let confidence = 0.75;
  
  // Basic AI detection patterns (very simplified)
  const aiIndicators = [
    'as an ai', 'i am an ai', 'as a language model', 'i apologize', 'certainly',
    'furthermore', 'moreover', 'however', 'therefore', 'in conclusion',
    'it is important to note', 'please note that', 'i hope this helps'
  ];
  
  const textLower = text.toLowerCase();
  const aiMatches = aiIndicators.filter(indicator => textLower.includes(indicator));
  
  if (aiMatches.length > 2) {
    classification = 'ai_generated';
    confidence = 0.85;
  } else if (aiMatches.length > 0) {
    classification = 'paraphrased';
    confidence = 0.65;
  }
  
  // Add some randomness to make it more realistic
  confidence += (Math.random() - 0.5) * 0.2;
  confidence = Math.max(0.1, Math.min(0.99, confidence));
  
  const processingTime = Date.now() - startTime;
  const textHash = Buffer.from(text).toString('base64').slice(0, 16);
  
  return {
    classification,
    confidence,
    probabilities: {
      human: classification === 'human' ? confidence : 1 - confidence,
      ai_generated: classification === 'ai_generated' ? confidence : 0.2,
      paraphrased: classification === 'paraphrased' ? confidence : 0.15
    },
    analysis: {
      writing_style: "Mock analysis - text appears to have standard writing patterns",
      vocabulary_complexity: "Moderate complexity detected",
      sentence_patterns: "Standard sentence structure observed",
      ai_indicators: aiMatches,
      human_indicators: ["natural flow", "personal voice", "varied sentence length"]
    },
    suggestions: [
      "This is a mock result for development testing",
      "Review content for originality indicators",
      "Consider manual verification for important submissions"
    ],
    processing_time: processingTime,
    text_hash: textHash
  };
}

// AI Classification function using LangChain
async function classifyTextWithAI(text: string): Promise<ClassificationResponse> {
  const startTime = Date.now();
  
  try {
    // Get available API key
    const { key: apiKey, name: keyName } = await apiKeyManager.getAvailableKey();
    if (!apiKey) {
      throw new Error('No API key available');
    }

    // Initialize ChatOpenAI with GPT-4o-mini for cost efficiency
    const model = new ChatOpenAI({
      openAIApiKey: apiKey,
      modelName: "openai/gpt-4o-mini", // Using GPT-4o-mini for cost efficiency
      temperature: 0.1, // Low temperature for consistent classification
      maxTokens: 1000,
      configuration: {
        baseURL: "https://openrouter.ai/api/v1",
      },
    });

    // System prompt for AI content detection
    const systemPrompt = `You are an expert AI content detector. Analyze the given text and classify it as one of the following:
1. "human" - Written by a human
2. "ai_generated" - Generated by AI (ChatGPT, GPT-4, Claude, etc.)
3. "paraphrased" - Human-written content that has been paraphrased or modified by AI

Analyze these factors:
- Writing style and flow patterns
- Vocabulary complexity and variation
- Sentence structure patterns
- Content organization and coherence
- Presence of AI-typical phrases or structures
- Originality and creativity markers

Respond with a JSON object containing:
{
  "classification": "human|ai_generated|paraphrased",
  "confidence": 0.0-1.0,
  "probabilities": {
    "human": 0.0-1.0,
    "ai_generated": 0.0-1.0,
    "paraphrased": 0.0-1.0
  },
  "analysis": {
    "writing_style": "analysis of writing style",
    "vocabulary_complexity": "vocabulary analysis",
    "sentence_patterns": "sentence structure analysis",
    "ai_indicators": ["list of AI indicators found"],
    "human_indicators": ["list of human indicators found"]
  },
  "suggestions": ["actionable suggestions for educators"]
}`;

    const messages = [
      new SystemMessage(systemPrompt),
      new HumanMessage(`Please analyze this text:\n\n"${text}"`)
    ];

    // Get AI response
    const response = await model.invoke(messages);
    const responseText = response.content as string;

    // Parse JSON response
    let aiResult;
    try {
      // Extract JSON from response (handle cases where AI adds extra text)
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in AI response');
      }
      aiResult = JSON.parse(jsonMatch[0]);
    } catch (parseError) {
      console.error('Failed to parse AI response:', responseText);
      throw new Error('Invalid AI response format');
    }

    // Validate and normalize the response
    const classification = aiResult.classification || 'human';
    const confidence = Math.min(Math.max(aiResult.confidence || 0.5, 0), 1);
    const probabilities = {
      human: aiResult.probabilities?.human || (classification === 'human' ? confidence : 1 - confidence),
      ai_generated: aiResult.probabilities?.ai_generated || (classification === 'ai_generated' ? confidence : 0),
      paraphrased: aiResult.probabilities?.paraphrased || (classification === 'paraphrased' ? confidence : 0)
    };

    // Normalize probabilities to sum to 1
    const totalProb = Object.values(probabilities).reduce((sum, val) => sum + val, 0);
    if (totalProb > 0) {
      Object.keys(probabilities).forEach(key => {
        probabilities[key as keyof typeof probabilities] /= totalProb;
      });
    }

    const processingTime = Date.now() - startTime;

    // Generate text hash for caching/deduplication
    const textHash = Buffer.from(text).toString('base64').slice(0, 16);

    return {
      classification,
      confidence,
      probabilities,
      analysis: aiResult.analysis || {},
      suggestions: aiResult.suggestions || [
        "Review content for originality",
        "Consider discussing academic integrity with students",
        "Use this as a teaching moment about proper attribution"
      ],
      processing_time: processingTime,
      text_hash: textHash
    };

  } catch (error) {
    console.error('AI classification error:', error);
    const processingTime = Date.now() - startTime;
    const textHash = Buffer.from(text).toString('base64').slice(0, 16);
    
    // Return fallback response
    return {
      classification: 'human',
      confidence: 0.5,
      probabilities: { human: 0.5, ai_generated: 0.25, paraphrased: 0.25 },
      analysis: { error: 'Classification failed', fallback: true },
      suggestions: ['Manual review recommended due to classification error'],
      processing_time: processingTime,
      text_hash: textHash
    };
  }
}

export async function POST(request: NextRequest) {
  try {
    // Authorize user (tutors and above can use AI detection)
    const authResult = await authorize('tutor');
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    // Parse request body
    const body: TextRequest = await request.json();
    
    let textToAnalyze = body.text;
    
    // If an attachment URL is provided, extract text from it
    if (body.attachment_url && body.attachment_type) {
      try {
        const extractedText = await extractTextFromAttachment(body.attachment_url, body.attachment_type);
        textToAnalyze = extractedText;
      } catch (error) {
        return NextResponse.json(
          {
            detail: [{
              loc: ['body', 'attachment_url'],
              msg: `Failed to extract text from attachment: ${error instanceof Error ? error.message : 'Unknown error'}`,
              type: 'value_error.attachment'
            }]
          },
          { status: 422 }
        );
      }
    }
    
    // Validate request - either text or attachment must be provided
    if (!textToAnalyze || typeof textToAnalyze !== 'string') {
      return NextResponse.json(
        {
          detail: [{
            loc: ['body', 'text'],
            msg: 'Text field is required or valid attachment must be provided',
            type: 'value_error.missing'
          }]
        },
        { status: 422 }
      );
    }

    // Validate text length
    if (textToAnalyze.length < 10) {
      return NextResponse.json(
        {
          detail: [{
            loc: ['body', 'text'],
            msg: 'Text must be at least 10 characters long',
            type: 'value_error.str.min_length'
          }]
        },
        { status: 422 }
      );
    }

    if (textToAnalyze.length > 10000) {
      return NextResponse.json(
        {
          detail: [{
            loc: ['body', 'text'],
            msg: 'Text must not exceed 10,000 characters',
            type: 'value_error.str.max_length'
          }]
        },
        { status: 422 }
      );
    }

    // Check if we're in development mode and use mock response to avoid domain restrictions
    const isDevelopment = process.env.NODE_ENV === 'development' || process.env.VERCEL_ENV !== 'production';
    
    if (isDevelopment) {
      // Mock AI classification for development/testing
      const result = await getMockClassification(textToAnalyze);
      console.log('Using mock AI classification for development:', result);
      return NextResponse.json(result);
    }

    // Use LangChain AI classification for production
    const result = await classifyTextWithAI(textToAnalyze);
    
    // Log the classification for audit purposes (optional)
    console.log('AI Classification:', {
      user_id: authResult.sub,
      classification: result.classification,
      confidence: result.confidence,
      text_length: textToAnalyze.length,
      source: body.attachment_url ? 'attachment' : 'direct_text',
      attachment_type: body.attachment_type || null,
      timestamp: new Date().toISOString()
    });

    return NextResponse.json(result);

  } catch (error) {
    console.error('Error in AI classification API:', error);
    
    // Handle JSON parsing errors
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        {
          detail: [{
            loc: ['body'],
            msg: 'Invalid JSON format',
            type: 'value_error.json'
          }]
        },
        { status: 422 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Health check endpoint
export async function GET() {
  try {
    const isDevelopment = process.env.NODE_ENV === 'development' || process.env.VERCEL_ENV !== 'production';
    
    if (isDevelopment) {
      return NextResponse.json({
        status: 'healthy',
        service: 'ai_classification_mock',
        mode: 'development',
        timestamp: new Date().toISOString()
      });
    }
    
    // Check if API keys are available for production
    const { key: apiKey, name: keyName } = await apiKeyManager.getAvailableKey();
    if (!apiKey) {
      return NextResponse.json(
        { 
          status: 'unhealthy', 
          service: 'ai_classification',
          error: 'No API keys available'
        },
        { status: 503 }
      );
    }

    return NextResponse.json({
      status: 'healthy',
      service: 'ai_classification_langchain',
      key_name: keyName,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    return NextResponse.json(
      { 
        status: 'unhealthy', 
        service: 'ai_classification',
        error: 'Service configuration error'
      },
      { status: 503 }
    );
  }
}
