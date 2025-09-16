import { NextResponse } from "next/server";
import { createServerClient } from "@/utils/supabase/server";
import { authorize } from "@/utils/auth/server-guard";
import { Storage, File } from "megajs";
import { v2 as cloudinary } from "cloudinary";
import { cloudinaryManager } from "@/lib/cloudinary-manager";

export async function POST(req: Request) {
  try {
    const authResult = await authorize('tutor');
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const body = await req.json();
    const { attachment_id, transcription_text } = body;

    if (!attachment_id) {
      return NextResponse.json({ error: "attachment_id is required" }, { status: 422 });
    }

    const client = await createServerClient();

    // 1. Get user's profile ID first
    const { data: profile, error: profileError } = await client
      .from("profiles")
      .select("id")
      .eq("user_id", authResult.payload.sub)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: "User profile not found" }, { status: 404 });
    }

    // 2. Get attachment details and verify ownership/access
    const { data: attachment, error: attachmentError } = await client
      .from("course_attachments")
      .select("*")
      .eq("id", attachment_id)
      .eq("owner_id", profile.id)
      .single();

    if (attachmentError || !attachment) {
      return NextResponse.json({ error: "Attachment not found or access denied" }, { status: 404 });
    }

    // 2. Check if it's a video file
    if (attachment.type !== 'video') {
      return NextResponse.json({ error: "Only video files can be processed for embeddings" }, { status: 422 });
    }

    // 3. Check if embeddings already exist
    const { data: existingEmbedding } = await client
      .from("video_embeddings")
      .select("*")
      .eq("attachment_id", attachment_id)
      .eq("is_deleted", false)
      .single();

    if (existingEmbedding) {
      return NextResponse.json({ 
        message: "Video embeddings already exist",
        data: existingEmbedding 
      }, { status: 200 });
    }

    // 4. Convert video to audio using Cloudinary if not already converted
    let audioUrl = attachment.cloudinary_mp3;
    
    if (!audioUrl) {
      console.log('Converting video to audio...');
      
      try {
        // Download video from MEGA first
        const email = process.env.MEGA_EMAIL;
        const password = process.env.MEGA_PASSWORD;

        if (!email || !password) {
          return NextResponse.json({ error: 'MEGA credentials not configured' }, { status: 500 });
        }

        // Create MEGA storage instance
        const storage = new Storage({
          email,
          password,
          keepalive: true,
          autologin: true
        });

        await storage.ready;

        // Parse MEGA URL to get file
        const megaFile = File.fromURL(attachment.url!, {});
        await megaFile.loadAttributes();

        // Download file as buffer
        const fileBuffer = await megaFile.downloadBuffer({});

        // Get current account and configure Cloudinary
        const currentAccount = cloudinaryManager.getCurrentAccount();
        if (!currentAccount) {
          return NextResponse.json({ error: 'No available Cloudinary accounts' }, { status: 503 });
        }

        // Configure Cloudinary with current account
        cloudinary.config({
          cloud_name: currentAccount.cloudName,
          api_key: currentAccount.apiKey,
          api_secret: currentAccount.apiSecret,
          secure: true,
        });

        // Upload buffer to Cloudinary for conversion
        const conversionResult = await new Promise<any>((resolve, reject) => {
          const uploadStream = cloudinary.uploader.upload_stream(
            {
              resource_type: 'video',
              format: 'mp3',
              folder: 'studify/audio',
              public_id: `${attachment.public_id}_audio`,
              timeout: 120000, // 2 minutes
              chunk_size: 6000000, // 6MB chunks
            },
            (error, result) => {
              if (error) {
                console.error('Cloudinary upload error:', error);
                reject(error);
              } else {
                resolve(result);
              }
            }
          );

          uploadStream.end(fileBuffer);
        });

        audioUrl = conversionResult.secure_url;

        // Update database with MP3 URL
        const { error: updateError } = await client
          .from('course_attachments')
          .update({ cloudinary_mp3: audioUrl })
          .eq('id', attachment_id);

        if (updateError) {
          console.error('Failed to update database:', updateError);
          return NextResponse.json({ error: 'Failed to save audio URL to database' }, { status: 500 });
        }

        console.log('Video converted to audio successfully:', audioUrl);

      } catch (conversionError: any) {
        console.error('Video to audio conversion error:', conversionError);
        return NextResponse.json({ error: 'Failed to convert video to audio' }, { status: 500 });
      }
    }

    // 5. Get transcription text (either from parameter or Whisper API)
    let contentText: string;
    
    if (transcription_text) {
      console.log('Using pre-computed transcription text, length:', transcription_text.length);
      contentText = transcription_text;
    } else {
      console.log('No pre-computed transcription, calling Whisper API...');
      console.log('Downloading audio from Cloudinary for Whisper:', audioUrl);
      
      // Download the audio file from Cloudinary
      const audioResponse = await fetch(audioUrl);
      if (!audioResponse.ok) {
        return NextResponse.json({ error: "Failed to download audio file from Cloudinary" }, { status: 500 });
      }
      
      const audioBuffer = await audioResponse.arrayBuffer();
      const audioBlob = new Blob([audioBuffer], { type: 'audio/mpeg' });
      
      // Create form data for Whisper API
      const formData = new FormData();
      formData.append('file', audioBlob, 'audio.mp3');
      
      console.log('Sending audio to Whisper API...');
      console.log('Audio file size:', audioBuffer.byteLength, 'bytes');
      console.log('Whisper API URL:', process.env.WHISPER_HG_VOICE_TO_TEXT_SERVER_API_URL);
      
      // Simple, direct Whisper API call with generous timeout
      let whisperResponse: Response;
      try {
        whisperResponse = await fetch(`${process.env.WHISPER_HG_VOICE_TO_TEXT_SERVER_API_URL}/transcribe`, {
          method: 'POST',
          body: formData,
          // No timeout, no abort controller - let it run as long as needed
        });
        
        console.log('Whisper API response status:', whisperResponse.status);
        
        if (!whisperResponse.ok) {
          const errorText = await whisperResponse.text();
          console.error('Whisper API error:', errorText);
          return NextResponse.json({ 
            error: "Whisper transcription failed",
            details: errorText,
            status: whisperResponse.status
          }, { status: 500 });
        }
        
      } catch (error: any) {
        console.error('Whisper API request failed:', error.message);
        return NextResponse.json({ 
          error: "Failed to connect to Whisper API",
          details: error.message
        }, { status: 500 });
      }

      const whisperResult = await whisperResponse.json();
      contentText = whisperResult.text || whisperResult.transcript;

      if (!contentText) {
        return NextResponse.json({ error: "No transcription text received from Whisper" }, { status: 500 });
      }
    }

    // 6. Generate embeddings using embedding API
    console.log('Generating embeddings for text length:', contentText.length);
    console.log('Embedding API URL:', process.env.EMBEDDING_SERVER_API_URL);
    console.log('Text preview:', contentText.substring(0, 200) + '...');
    
    const embeddingResponse = await fetch(`${process.env.EMBEDDING_SERVER_API_URL}/embed`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        input: contentText,
        model: 'text-embedding-ada-002'
      })
    });

    console.log('Embedding response status:', embeddingResponse.status);
    console.log('Embedding response headers:', Object.fromEntries(embeddingResponse.headers.entries()));

    if (!embeddingResponse.ok) {
      const errorText = await embeddingResponse.text();
      console.error('Embedding API error response:', errorText);
      return NextResponse.json({ 
        error: "Embedding generation failed",
        details: errorText,
        status: embeddingResponse.status
      }, { status: 500 });
    }

    const embeddingResult = await embeddingResponse.json();
    const embedding = embeddingResult.embedding || embeddingResult.data?.[0]?.embedding;

    if (!embedding) {
      return NextResponse.json({ error: "No embedding vector received" }, { status: 500 });
    }

    // 7. Calculate additional metadata
    const wordCount = contentText.split(/\s+/).length;
    const sentenceCount = contentText.split(/[.!?]+/).filter((s: string) => s.trim().length > 0).length;
    const tokenCount = Math.ceil(wordCount * 1.3); // Rough estimate

    // 8. Save to video_embeddings table
    const videoEmbeddingPayload = {
      attachment_id: attachment_id,
      content_type: 'course', // Since it's from course attachments
      embedding: embedding,
      content_text: contentText,
      chunk_type: 'summary',
      hierarchy_level: 1,
      semantic_density: Math.min(wordCount / 100, 1.0), // Normalize to 0-1
      sentence_count: sentenceCount,
      word_count: wordCount,
      token_count: tokenCount,
      embedding_model: 'text-embedding-ada-002',
      language: 'auto',
      status: 'completed',
      is_deleted: false
    };

    const { data: savedEmbedding, error: saveError } = await client
      .from("video_embeddings")
      .insert([videoEmbeddingPayload])
      .select("*")
      .single();

    if (saveError) {
      console.error('Error saving video embedding:', saveError);
      return NextResponse.json({ error: "Failed to save video embeddings" }, { status: 500 });
    }

    return NextResponse.json({ 
      message: "Video processed successfully",
      data: savedEmbedding 
    }, { status: 201 });

  } catch (error: any) {
    console.error('Video processing error:', error);
    return NextResponse.json({ 
      error: error?.message ?? "Internal server error" 
    }, { status: 500 });
  }
}
