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
    // Если ответ не одобрен, сохраняем ответ, но не меняем статус на 'completed'
    
    // Сначала проверяем существующую запись
    const { data: existingProgress, error: checkError } = await supabase
      .from('user_progress')
      .select('status, completed_at')
      .eq('telegram_user_id', Number(telegramUserId))
      .eq('lesson_id', lesson_id)
      .maybeSingle();

    if (checkError) {
      console.error('Error checking existing progress:', checkError);
      // Не прерываем выполнение, продолжаем с upsert
    }

    // Определяем статус для сохранения
    let statusToSave: string;
    if (approved) {
      // Если ответ одобрен - всегда ставим 'completed'
      statusToSave = 'completed';
    } else {
      // Если ответ не одобрен - сохраняем существующий статус или 'skipped' если записи нет
      statusToSave = existingProgress?.status || 'skipped';
    }

    // Подготавливаем данные для upsert
    const progressData: any = {
      telegram_user_id: Number(telegramUserId),
      lesson_id: lesson_id,
      status: statusToSave,
      user_answer: user_answer,
      photo_url: photo_url || null,
    };

    // completed_at устанавливаем только если ответ одобрен
    if (approved) {
      progressData.completed_at = new Date().toISOString();
    } else if (existingProgress && existingProgress.completed_at) {
      // Если ответ не одобрен, но запись уже существует с completed_at - сохраняем его
      // Это важно для случаев, когда пользователь повторно отправляет неодобренный ответ
      // после того, как ответ был ранее одобрен
      progressData.completed_at = existingProgress.completed_at;
    }
    // Если ответ не одобрен и записи нет - не устанавливаем completed_at (будет null)

    console.log('Saving progress:', {
      approved,
      existingStatus: existingProgress?.status,
      statusToSave,
      hasExistingProgress: !!existingProgress,
    });

    // Используем upsert для создания или обновления записи
    const { error: progressError } = await supabase
      .from('user_progress')
      .upsert(progressData, {
        onConflict: 'telegram_user_id,lesson_id',
      });

    if (progressError) {
      console.error('Error saving progress:', progressError);
      console.error('Error details:', {
        message: progressError.message,
        details: progressError.details,
        hint: progressError.hint,
        code: progressError.code,
      });
      console.error('Progress data:', JSON.stringify(progressData, null, 2));
      return NextResponse.json(
        { 
          error: 'Не удалось сохранить прогресс',
          details: progressError.message || JSON.stringify(progressError)
        },
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
