import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { videoPath } = await request.json();

    if (!videoPath) {
      return NextResponse.json(
        { error: 'Video path is required' },
        { status: 400 }
      );
    }

    // TODO: Здесь будет интеграция с n8n для получения signed URL
    // Например:
     const n8nResponse = await fetch('https://maximilian-septal-hyperprophetically.ngrok-free.dev/webhook-test/generate-video-url', {
       method: 'POST',
       headers: {
         'Content-Type': 'application/json',
       },
       body: JSON.stringify({
         bucket: 'lesson-videos',
         path: videoPath,
         expiresIn: 3600, // 1 час
       }),
     });
    
     if (!n8nResponse.ok) {
       throw new Error('Failed to get signed URL from n8n');
     }
    
     const data = await n8nResponse.json();
     return NextResponse.json({ signedUrl: data.signedUrl });

    // Временная заглушка
    //return NextResponse.json(
    //  { error: 'n8n integration not configured yet' },
    //  { status: 501 }
    //);
    
  } catch (error) {
    console.error('Error in get-video-url API:', error);
    return NextResponse.json(
      { error: `Internal server error: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}