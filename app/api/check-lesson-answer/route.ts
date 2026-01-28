import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { lesson_id, user_answer, photo_url, telegram_user_id } = body;

    if (!lesson_id || !user_answer) {
      return NextResponse.json(
        { error: 'lesson_id и user_answer обязательны' },
        { status: 400 }
      );
    }

    // Получаем telegram_user_id из тела запроса или заголовков
    const telegramUserId = telegram_user_id || request.headers.get('x-telegram-user-id');
    
    if (!telegramUserId) {
      return NextResponse.json(
        { error: 'Требуется аутентификация Telegram' },
        { status: 401 }
      );
    }

    // Получаем данные урока из БД
    const { data: lesson, error: lessonError } = await supabase
      .from('lessons')
      .select('question, video_description')
      .eq('id', lesson_id)
      .single();

    if (lessonError || !lesson) {
      return NextResponse.json(
        { error: 'Урок не найден' },
        { status: 404 }
      );
    }

    // Отправляем данные в n8n webhook
    const n8nWebhookUrl = process.env.N8N_WEBHOOK_URL;
    if (!n8nWebhookUrl) {
      return NextResponse.json(
        { error: 'N8N webhook URL не настроен' },
        { status: 500 }
      );
    }

    const n8nPayload = {
      lesson_id: lesson_id,
      question: lesson.question,
      user_answer: user_answer,
      video_description: lesson.video_description,
      photo_url: photo_url || null,
      telegram_user_id: Number(telegramUserId),
    };

    console.log('Sending to n8n:', n8nPayload);

    const n8nResponse = await fetch(n8nWebhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(n8nPayload),
    });

    if (!n8nResponse.ok) {
      console.error('N8N error:', await n8nResponse.text());
      return NextResponse.json(
        { error: 'Ошибка при проверке ответа через AI' },
        { status: 500 }
      );
    }

    const n8nData = await n8nResponse.json();
    console.log('N8N response:', n8nData);

    // Ожидаем ответ от n8n: { approved: boolean, message: string }
    const approved = n8nData.approved === true;
    const message = n8nData.message || (approved ? 'Ответ принят' : 'Ответ не подходит');

    // Сохраняем ответ в user_progress всегда (для возможности редактирования)
    // Но статус 'completed' устанавливаем только если ответ одобрен
    const { error: progressError } = await supabase
      .from('user_progress')
      .upsert(
        {
          telegram_user_id: Number(telegramUserId),
          lesson_id: lesson_id,
          status: approved ? 'completed' : null,
          completed_at: approved ? new Date().toISOString() : null,
          user_answer: user_answer,
          photo_url: photo_url || null,
        },
        {
          onConflict: 'telegram_user_id,lesson_id',
        }
      );

    if (progressError) {
      console.error('Error saving progress:', progressError);
      return NextResponse.json(
        { error: 'Не удалось сохранить прогресс' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      approved: approved,
      message: message,
    });
  } catch (error: any) {
    console.error('Error in check-lesson-answer:', error);
    return NextResponse.json(
      { error: error.message || 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}
