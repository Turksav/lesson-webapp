 'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import VideoPlayer from '@/components/VideoPlayer';

export default function LessonPage() {
  const { id } = useParams<{ id: string }>();
  const [lesson, setLesson] = useState<any>(null);
  const [sessions, setSessions] = useState<any[]>([]);

  useEffect(() => {
    if (!id) return;

    supabase
      .from('lessons')
      .select('*')
      .eq('id', id)
      .single()
      .then(({ data }) => setLesson(data));

    supabase
      .from('lesson_sessions')
      .select('*')
      .eq('lesson_id', id)
      .order('order_index')
      .then(({ data, error }) => {
        if (!error) setSessions(data || []);
      });
  }, [id]);

  const markCompleted = async () => {
    const tg = (window as any)?.Telegram?.WebApp;
    const telegramUserId =
      (window as any).__telegramUserId ?? tg?.initDataUnsafe?.user?.id;

    // Без Telegram пользователя не пытаемся писать прогресс
    if (!telegramUserId) {
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
          telegram_user_id: Number(telegramUserId),
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
            <Link href={lesson?.course_id ? `/courses/${lesson.course_id}` : '/courses'} className="btn-back">
              ← Назад
            </Link>
            <h1 className="lesson-title">{lesson.title}</h1>
            <p className="page-subtitle">Отметь урок завершённым, когда будешь готов.</p>
          </div>
        </header>

        {lesson.kinescope_video_id && (
          <div className="lesson-video-section">
            <VideoPlayer kinescopeVideoId={lesson.kinescope_video_id} title={lesson.title} />
          </div>
        )}

        {sessions.length > 0 ? (
          <div className="lesson-layout">
            {sessions.map((s) => (
              <div key={s.id} className="lesson-card">
                <div className="badge">Занятие</div>
                <h2 className="lesson-card-title">{s.title}</h2>
                {s.content && <div className="lesson-body">{s.content}</div>}
              </div>
            ))}
          </div>
        ) : lesson.content ? (
          <div className="lesson-body">
            {lesson.content}
          </div>
        ) : (
          <p className="page-subtitle">В этом уроке пока нет занятий.</p>
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
