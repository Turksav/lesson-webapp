import { NextRequest, NextResponse } from 'next/server';

interface KinescopeVideoData {
  id: string;
  title: string;
  status: string;
  duration: number;
  embed_url: string;
  thumbnail: {
    url: string;
  };
}

export async function POST(request: NextRequest) {
  try {
    console.log('🎬 Kinescope API /get-video-url called');
    
    const { videoId } = await request.json();
    console.log('📁 Kinescope Video ID requested:', videoId);

    if (!videoId) {
      console.log('❌ No video ID provided');
      return NextResponse.json(
        { error: 'Kinescope video ID is required' },
        { status: 400 }
      );
    }

    // Проверяем переменные окружения
    const kinescopeApiKey = process.env.KINESCOPE_API_KEY;
    const kinescopeProjectId = process.env.KINESCOPE_PROJECT_ID;
    
    console.log('🔍 Environment check:', {
      hasApiKey: !!kinescopeApiKey,
      hasProjectId: !!kinescopeProjectId,
      apiKeyLength: kinescopeApiKey?.length || 0,
      projectIdLength: kinescopeProjectId?.length || 0,
    });
    
    if (!kinescopeApiKey || !kinescopeProjectId) {
      console.error('❌ Missing Kinescope credentials');
      console.error('❌ KINESCOPE_API_KEY:', kinescopeApiKey ? 'SET' : 'NOT SET');
      console.error('❌ KINESCOPE_PROJECT_ID:', kinescopeProjectId ? 'SET' : 'NOT SET');
      throw new Error('Kinescope API credentials not configured. Please check .env.local file and restart the server.');
    }

    console.log('🔗 Using Kinescope API integration');
    console.log('📤 Project ID:', kinescopeProjectId);
    console.log('📤 Video ID:', videoId);

    // Получаем данные о видео из Kinescope API
    const kinescopeApiUrl = `https://api.kinescope.io/v1/projects/${kinescopeProjectId}/videos/${videoId}`;
    
    const kinescopeResponse = await fetch(kinescopeApiUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${kinescopeApiKey}`,
        'Content-Type': 'application/json',
      },
    });
    
    console.log('📥 Kinescope API response status:', kinescopeResponse.status);
    
    if (!kinescopeResponse.ok) {
      const errorText = await kinescopeResponse.text();
      console.error('❌ Kinescope API error:', errorText);
      
      if (kinescopeResponse.status === 404) {
        throw new Error(`Video not found: ${videoId}`);
      } else if (kinescopeResponse.status === 401) {
        throw new Error('Invalid Kinescope API credentials');
      } else {
        throw new Error(`Kinescope API failed with status ${kinescopeResponse.status}: ${errorText}`);
      }
    }
    
    const videoData: { data: KinescopeVideoData } = await kinescopeResponse.json();
    console.log('✅ Kinescope video data received:', videoData.data.title);
    
    const video = videoData.data;
    
    // Проверяем статус видео
    if (video.status !== 'ready') {
      console.log('⚠️ Video not ready, status:', video.status);
      return NextResponse.json({
        error: 'Video is not ready for playback',
        status: video.status,
        videoId: videoId
      }, { status: 202 }); // 202 Accepted - processing
    }
    
    // Генерируем secure embed URL с настройками плеера
    const embedUrl = new URL(video.embed_url);
    
    // Добавляем параметры для адаптивного качества и кастомизации плеера
    embedUrl.searchParams.set('auto', '1'); // Автопроигрывание (можно отключить)
    embedUrl.searchParams.set('muted', '0'); // Не мутить по умолчанию
    embedUrl.searchParams.set('loop', '0'); // Не зацикливать
    embedUrl.searchParams.set('controls', '1'); // Показывать контролы
    embedUrl.searchParams.set('title', '0'); // Скрыть заголовок
    embedUrl.searchParams.set('speed', '1'); // Разрешить изменение скорости
    embedUrl.searchParams.set('pip', '1'); // Picture-in-picture
    embedUrl.searchParams.set('dnt', '1'); // Do not track
    
    const finalEmbedUrl = embedUrl.toString();
    console.log('🎉 Generated secure embed URL');
    
    return NextResponse.json({
      embedUrl: finalEmbedUrl,
      videoId: video.id,
      title: video.title,
      duration: video.duration,
      thumbnail: video.thumbnail?.url || null,
      status: video.status
    });
    
  } catch (error) {
    console.error('💥 Error in Kinescope get-video-url API:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('💥 Error message:', errorMessage);
    
    return NextResponse.json(
      { error: `Internal server error: ${errorMessage}` },
      { status: 500 }
    );
  }
}