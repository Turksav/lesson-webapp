import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    console.log('🎬 API /get-video-url called');
    
    const { videoPath } = await request.json();
    console.log('📁 Video path requested:', videoPath);

    if (!videoPath) {
      console.log('❌ No video path provided');
      return NextResponse.json(
        { error: 'Video path is required' },
        { status: 400 }
      );
    }

    const n8nWebhookUrl = 'https://maximilian-septal-hyperprophetically.ngrok-free.dev/webhook-test/generate-video-url';
    
    // Временная заглушка для тестирования - удалите когда n8n будет работать
    console.log('🧪 Using test stub - generating fake signed URL');
    const fakeSignedUrl = `https://lesson-webapp.vercel.app/object/sign/lesson-videos/${videoPath}?token=test-token-${Date.now()}`;
    return NextResponse.json({ signedUrl: fakeSignedUrl });
    console.log('🔗 Making request to n8n webhook:', n8nWebhookUrl);

    const requestBody = {
      bucket: 'lesson-videos',
      path: videoPath,
      expiresIn: 3600, // 1 час
    };
    console.log('📤 Request body:', JSON.stringify(requestBody));

    const n8nResponse = await fetch(n8nWebhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });
    
    console.log('📥 n8n response status:', n8nResponse.status);
    console.log('📥 n8n response headers:', Object.fromEntries(n8nResponse.headers.entries()));
    
    if (!n8nResponse.ok) {
      const errorText = await n8nResponse.text();
      console.error('❌ n8n response error:', errorText);
      throw new Error(`n8n webhook failed with status ${n8nResponse.status}: ${errorText}`);
    }
    
    const responseText = await n8nResponse.text();
    console.log('📄 Raw n8n response:', responseText);
    
    let data;
    try {
      data = JSON.parse(responseText);
      console.log('✅ Parsed n8n response:', data);
    } catch (parseError) {
      console.error('❌ Failed to parse n8n response as JSON:', parseError);
      throw new Error(`Invalid JSON response from n8n: ${responseText}`);
    }
    
    if (!data.signedUrl) {
      console.error('❌ No signedUrl in response:', data);
      throw new Error('No signedUrl in n8n response');
    }
    
    console.log('🎉 Returning signed URL:', data.signedUrl);
    return NextResponse.json({ signedUrl: data.signedUrl });
    
  } catch (error) {
    console.error('💥 Error in get-video-url API:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('💥 Error message:', errorMessage);
    
    return NextResponse.json(
      { error: `Internal server error: ${errorMessage}` },
      { status: 500 }
    );
  }
}