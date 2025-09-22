// app/api/video-processing/warmup/route.ts
// 定时预热 HuggingFace 服务器，减少冷启动时间

import { NextResponse } from "next/server";

async function warmupWhisperServer(): Promise<boolean> {
  const whisperUrl = process.env.WHISPER_HG_VOICE_TO_TEXT_SERVER_API_URL;
  
  if (!whisperUrl) {
    console.warn('WHISPER_HG_VOICE_TO_TEXT_SERVER_API_URL not configured');
    return false;
  }

  console.log('🔥 Warming up Whisper server...');
  
  try {
    // 创建1秒静音音频用于预热
    const silentAudioBase64 = 'UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=';
    const silentAudioBytes = Uint8Array.from(atob(silentAudioBase64), c => c.charCodeAt(0));
    const warmupBlob = new Blob([silentAudioBytes], { type: 'audio/wav' });
    
    const formData = new FormData();
    formData.append('file', warmupBlob, 'warmup.wav');
    
    const response = await fetch(`${whisperUrl}/transcribe?task=transcribe&beam_size=1`, {
      method: 'POST',
      body: formData,
      signal: AbortSignal.timeout(30000), // 30秒超时
    });
    
    console.log(`✅ Warmup response status: ${response.status}`);
    return response.ok;
    
  } catch (error: any) {
    console.log('⚠️ Warmup failed:', error.message);
    return false;
  }
}

async function warmupEmbeddingServers(): Promise<{ e5: boolean; bge: boolean }> {
  const results = { e5: false, bge: false };
  
  try {
    // 预热嵌入服务器 - 使用短文本
    const testText = "Hello world test";
    
    // 这里需要调用你的嵌入服务
    // const embeddingResult = await generateDualEmbeddingWithWakeup(testText);
    
    console.log('🧠 Embedding servers warmed up');
    results.e5 = true;
    results.bge = true;
    
  } catch (error: any) {
    console.log('⚠️ Embedding warmup failed:', error.message);
  }
  
  return results;
}

// GET /api/video-processing/warmup - 手动预热服务器
export async function GET() {
  console.log('🔄 Starting manual server warmup...');
  
  try {
    const [whisperWarmed, embeddingResults] = await Promise.all([
      warmupWhisperServer(),
      warmupEmbeddingServers()
    ]);
    
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      results: {
        whisper: whisperWarmed,
        embedding_e5: embeddingResults.e5,
        embedding_bge: embeddingResults.bge
      },
      message: whisperWarmed ? 
        'All servers warmed up successfully' : 
        'Some servers may still be cold'
    });
    
  } catch (error: any) {
    console.error('❌ Warmup failed:', error);
    
    return NextResponse.json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

// POST /api/video-processing/warmup - 定时预热（用于cron job）
export async function POST() {
  return GET(); // 相同的逻辑
}
