 'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function LessonPage() {
  const { id } = useParams<{ id: string }>();
  const [lesson, setLesson] = useState<any>(null);

  useEffect(() => {
    if (!id) return;

    supabase
      .from('lessons')
      .select('*')
      .eq('id', id)
      .single()
      .then(({ data }) => setLesson(data));
  }, [id]);

  const markCompleted = async () => {
    const tg = (window as any)?.Telegram?.WebApp;

    // Без Telegram WebApp / пользователя не пытаемся писать прогресс
    if (!tg || !tg.initDataUnsafe?.user?.id) {
      console.warn('Cannot mark lesson completed: no Telegram user context');
      alert('Завершение урока доступно только внутри Telegram WebApp.');
      return;
    }

    const { error } = await supabase
      .from('user_progress')
      .upsert(
        {
          lesson_id: Number(id),
          status: 'completed',
          telegram_user_id: 0, // значение валидируется RLS
        },
        {
          onConflict: 'telegram_user_id,lesson_id',
        }
      );

    if (error) {
      console.error('Supabase upsert error', {
        message: (error as any).message,
        details: (error as any).details,
        hint: (error as any).hint,
        code: (error as any).code,
        raw: error,
      });
      alert('Не удалось сохранить прогресс. Попробуй ещё раз позже.');
      return;
    }

    alert('Урок отмечен как завершён ✅');
  };

  if (!lesson) {
    return (
      <main className="container">
        <section className="surface">
          <p className="page-subtitle">Загружаем урок…</p>
        </section>
      </main>
    );
  }

  return (
    <main className="container">
      <section className="surface lesson-layout">
        <header className="lesson-header">
          <div>
            <h1 className="lesson-title">{lesson.title}</h1>
            <p className="page-subtitle">Отметь урок завершённым, когда будешь готов.</p>
          </div>
        </header>

        {lesson.content && (
          <div className="lesson-body">
            {lesson.content}
          </div>
        )}

        <div>
          <button className="btn btn-primary" onClick={markCompleted}>
            Завершить урок
          </button>
        </div>
      </section>
    </main>
  );
}
