import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

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

    // Выбор между n8n и прямой интеграцией с Supabase
    const USE_N8N = true; // Измените на true для использования n8n

    if (USE_N8N) {
      // n8n интеграция
      const n8nWebhookUrl = 'https://maximilian-septal-hyperprophetically.ngrok-free.dev';
      console.log('🔗 Using n8n webhook:', n8nWebhookUrl);

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
      
      if (!n8nResponse.ok) {
        const errorText = await n8nResponse.text();
        console.error('❌ n8n response error:', errorText);
        throw new Error(`n8n webhook failed with status ${n8nResponse.status}: ${errorText}`);
      }
      
      const data = await n8nResponse.json();
      console.log('✅ n8n response:', data);
      
      if (!data.signedUrl) {
        throw new Error('No signedUrl in n8n response');
      }
      
      return NextResponse.json({ signedUrl: data.signedUrl });
      
    } else {
      // Прямая интеграция с Supabase
      console.log('🔗 Using direct Supabase integration');
      
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      
      if (!supabaseUrl || !supabaseServiceKey) {
        throw new Error('Missing Supabase credentials in environment variables');
      }
      
      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      
      console.log('📤 Creating signed URL for:', videoPath);
      
      const { data, error } = await supabase.storage
        .from('lesson-videos')
        .createSignedUrl(videoPath, 3600); // 1 час
      
      if (error) {
        console.error('❌ Supabase error:', error);
        throw new Error(`Supabase Storage error: ${error.message}`);
      }
      
      if (!data?.signedUrl) {
        throw new Error('No signed URL returned from Supabase');
      }
      
      console.log('✅ Generated signed URL:', data.signedUrl);
      return NextResponse.json({ signedUrl: data.signedUrl });
    }
    
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