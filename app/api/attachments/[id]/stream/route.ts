import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { File } from 'megajs';

// Enable streaming for large files
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

interface RouteParams {
  params: {
    id: string;
  };
}

export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const attachmentId = params.id;
    const supabase = await createClient();

    // Get attachment info from database
    const { data: attachment, error: dbError } = await supabase
      .from('course_attachments')
      .select('*')
      .eq('id', parseInt(attachmentId))
      .single();

    if (dbError || !attachment) {
      return NextResponse.json(
        { error: 'Attachment not found' },
        { status: 404 }
      );
    }

    // Check if it's a MEGA URL
    const isMegaUrl = attachment.file_url && (
      attachment.file_url.includes('mega.nz') ||
      attachment.file_url.includes('mega.co.nz') ||
      attachment.file_url.includes('mega.io')
    );

    if (!isMegaUrl) {
      // For non-MEGA files, redirect to the URL
      return NextResponse.redirect(attachment.file_url);
    }

    // Parse Range header for partial content support
    const range = request.headers.get('range');
    
    try {
      // Load MEGA file
      const file = File.fromURL(attachment.file_url);
      await file.loadAttributes();

      const fileSize = file.size || 0;
      
      if (!fileSize) {
        return NextResponse.json(
          { error: 'Unable to determine file size' },
          { status: 500 }
        );
      }

      const mimeType = attachment.mime_type || 'video/mp4';

      // Handle Range requests for streaming (Progressive Loading)
      if (range) {
        const parts = range.replace(/bytes=/, '').split('-');
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
        const chunkSize = end - start + 1;

        // Validate range
        if (start >= fileSize || end >= fileSize || start > end) {
          return new NextResponse('Range Not Satisfiable', {
            status: 416,
            headers: {
              'Content-Range': `bytes */${fileSize}`,
            },
          });
        }

        try {
          // Download the requested range from MEGA
          const buffer = await file.download({ start, end });

          return new NextResponse(buffer, {
            status: 206, // Partial Content
            headers: {
              'Content-Range': `bytes ${start}-${end}/${fileSize}`,
              'Accept-Ranges': 'bytes',
              'Content-Length': chunkSize.toString(),
              'Content-Type': mimeType,
              'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
              'Access-Control-Allow-Origin': '*',
              'Access-Control-Expose-Headers': 'Content-Range, Accept-Ranges, Content-Length',
            },
          });
        } catch (rangeError) {
          console.error('Range download error:', rangeError);
          return NextResponse.json(
            { error: 'Failed to download range from MEGA' },
            { status: 500 }
          );
        }
      }

      // No range requested - stream entire file with progressive loading
      // Optimized chunk size for better streaming performance
      const CHUNK_SIZE = 1024 * 1024 * 5; // 5MB chunks for better throughput
      
      // Create a readable stream with progressive loading
      const stream = new ReadableStream({
        async start(controller) {
          try {
            let offset = 0;
            let consecutiveErrors = 0;
            const MAX_RETRIES = 3;
            
            while (offset < fileSize) {
              const end = Math.min(offset + CHUNK_SIZE - 1, fileSize - 1);
              
              try {
                const chunk = await file.download({ start: offset, end });
                controller.enqueue(new Uint8Array(chunk));
                offset = end + 1;
                consecutiveErrors = 0; // Reset error counter on success
                
                // Small delay to prevent overwhelming the connection
                await new Promise(resolve => setTimeout(resolve, 10));
              } catch (chunkError) {
                consecutiveErrors++;
                console.error(`Chunk download error at offset ${offset}:`, chunkError);
                
                if (consecutiveErrors >= MAX_RETRIES) {
                  throw new Error(`Failed to download chunk after ${MAX_RETRIES} retries`);
                }
                
                // Wait before retry (exponential backoff)
                await new Promise(resolve => setTimeout(resolve, 1000 * consecutiveErrors));
              }
            }
            
            controller.close();
          } catch (error) {
            console.error('Streaming error:', error);
            controller.error(error);
          }
        },
        cancel() {
          console.log('Stream cancelled by client');
        }
      });

      return new NextResponse(stream, {
        status: 200,
        headers: {
          'Content-Type': mimeType,
          'Content-Length': fileSize.toString(),
          'Accept-Ranges': 'bytes',
          'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
          'Content-Disposition': `inline; filename="${attachment.file_name}"`,
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Expose-Headers': 'Content-Range, Accept-Ranges, Content-Length',
        },
      });
    } catch (megaError) {
      console.error('MEGA streaming error:', megaError);
      return NextResponse.json(
        { error: 'Failed to stream from MEGA', details: megaError instanceof Error ? megaError.message : 'Unknown error' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Unexpected error in stream endpoint:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
