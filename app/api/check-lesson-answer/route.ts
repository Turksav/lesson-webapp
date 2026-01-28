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
    
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/f72a766d-ed91-493a-a672-e106452a1c03',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'route.ts:87',message:'Checking existing progress',data:{telegramUserId:Number(telegramUserId),lesson_id},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    
    // Сначала проверяем существующую запись
    const { data: existingProgress, error: checkError } = await supabase
      .from('user_progress')
      .select('status, completed_at')
      .eq('telegram_user_id', Number(telegramUserId))
      .eq('lesson_id', lesson_id)
      .maybeSingle();

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/f72a766d-ed91-493a-a672-e106452a1c03',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'route.ts:95',message:'Existing progress check result',data:{existingProgress,checkError:checkError?.message,hasProgress:!!existingProgress},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion

    // Определяем статус для сохранения
    let statusToSave: string;
    if (approved) {
      // Если ответ одобрен - всегда ставим 'completed'
      statusToSave = 'completed';
    } else {
      // Если ответ не одобрен - сохраняем существующий статус или 'skipped' если записи нет
      statusToSave = existingProgress?.status || 'skipped';
    }

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/f72a766d-ed91-493a-a672-e106452a1c03',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'route.ts:100',message:'Status determination',data:{approved,existingStatus:existingProgress?.status,statusToSave},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion

    // Подготавливаем данные для сохранения
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
    } else if (existingProgress?.completed_at) {
      // Если ответ не одобрен, но запись уже существует с completed_at - сохраняем его
      progressData.completed_at = existingProgress.completed_at;
    }

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/f72a766d-ed91-493a-a672-e106452a1c03',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'route.ts:120',message:'Progress data prepared',data:{progressDataKeys:Object.keys(progressData),hasCompletedAt:!!progressData.completed_at,status:progressData.status},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
    // #endregion

    console.log('Saving progress:', {
      approved,
      existingStatus: existingProgress?.status,
      statusToSave,
      hasExistingProgress: !!existingProgress,
      progressDataKeys: Object.keys(progressData),
    });

    // Используем более явный подход: сначала пытаемся обновить, если не получилось - создаём
    // Важно: не передаем updated_at - триггер должен его установить автоматически
    let progressError: any = null;
    let operationType = '';
    
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/f72a766d-ed91-493a-a672-e106452a1c03',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'route.ts:145',message:'Before DB operation',data:{hasExistingProgress:!!existingProgress,willUpdate:!!existingProgress,willInsert:!existingProgress,progressDataKeys:Object.keys(progressData)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
    // #endregion
    
    // Используем RPC функцию для безопасного обновления прогресса
    // Это решает проблему с триггером updated_at
    operationType = 'RPC';
    
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/f72a766d-ed91-493a-a672-e106452a1c03',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'route.ts:154',message:'Executing RPC update_user_progress',data:{telegramUserId:Number(telegramUserId),lesson_id,status:statusToSave,hasCompletedAt:!!progressData.completed_at},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
    // #endregion
    
    const { error: rpcError } = await supabase.rpc('update_user_progress', {
      p_telegram_user_id: Number(telegramUserId),
      p_lesson_id: lesson_id,
      p_status: statusToSave,
      p_user_answer: user_answer,
      p_photo_url: photo_url || null,
      p_completed_at: progressData.completed_at || null,
    });
    
    // Если RPC функция не существует или произошла ошибка, используем fallback
    if (rpcError) {
      // Проверяем, является ли ошибка отсутствием функции
      const isFunctionNotFound = rpcError.message?.includes('function') || rpcError.code === '42883';
      
      if (isFunctionNotFound) {
        // RPC функция не существует - используем прямой подход с явным updated_at
        operationType = existingProgress ? 'UPDATE_FALLBACK' : 'INSERT_FALLBACK';
        
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/f72a766d-ed91-493a-a672-e106452a1c03',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'route.ts:170',message:'RPC function not found, using fallback',data:{willUpdate:!!existingProgress},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'F'})}).catch(()=>{});
        // #endregion
        
        // Добавляем updated_at явно для избежания проблем с триггером
        const fallbackData = {
          ...progressData,
          updated_at: new Date().toISOString(),
        };
        
        if (existingProgress) {
          const { error: updateError } = await supabase
            .from('user_progress')
            .update(fallbackData)
            .eq('telegram_user_id', Number(telegramUserId))
            .eq('lesson_id', lesson_id);
          
          progressError = updateError;
        } else {
          const { error: insertError } = await supabase
            .from('user_progress')
            .insert(fallbackData);
          
          progressError = insertError;
        }
      } else {
        // Другая ошибка RPC функции
        progressError = rpcError;
      }
    }

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/f72a766d-ed91-493a-a672-e106452a1c03',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'route.ts:152',message:'After DB operation',data:{operationType,hasError:!!progressError,errorMessage:progressError?.message,errorCode:progressError?.code,errorDetails:progressError?.details},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
    // #endregion

    if (progressError) {
      console.error('Error saving progress:', progressError);
      console.error('Error details:', {
        message: progressError.message,
        details: progressError.details,
        hint: progressError.hint,
        code: progressError.code,
      });
      console.error('Progress data:', JSON.stringify(progressData, null, 2));
      console.error('Existing progress:', existingProgress);
      
      // Возвращаем более детальную информацию для отладки (в продакшене можно убрать)
      return NextResponse.json(
        { 
          error: 'Не удалось сохранить прогресс',
          details: progressError.message || 'Unknown error',
          code: progressError.code || 'UNKNOWN'
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
