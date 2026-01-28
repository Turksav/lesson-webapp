 'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import VideoPlayer from '@/components/VideoPlayer';
import LessonCompletionModal from '@/components/LessonCompletionModal';

export default function LessonPage() {
  const { id } = useParams<{ id: string }>();
  const [lesson, setLesson] = useState<any>(null);
  const [sessions, setSessions] = useState<any[]>([]);
  const [isUnlocked, setIsUnlocked] = useState<{ unlocked: boolean; message: string } | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState<any>(null);

  useEffect(() => {
    if (!id) return;
    loadLessonData();
  }, [id]);

  const loadLessonData = async () => {
    setLoading(true);
    const tg = (window as any)?.Telegram?.WebApp;
    const telegramUserId =
      (window as any).__telegramUserId ?? tg?.initDataUnsafe?.user?.id;

    // Загружаем урок
    const { data: lessonData } = await supabase
      .from('lessons')
      .select('*')
      .eq('id', id)
      .single();

    if (lessonData) {
      setLesson(lessonData);

      // Проверяем доступность урока
      if (telegramUserId) {
        const { data: unlockData } = await supabase.rpc('is_lesson_unlocked', {
          p_telegram_user_id: Number(telegramUserId),
          p_lesson_id: Number(id),
        });

        if (unlockData) {
          setIsUnlocked(unlockData);
        }

        // Загружаем прогресс пользователя по этому уроку
        const { data: progressData } = await supabase
          .from('user_progress')
          .select('*')
          .eq('telegram_user_id', Number(telegramUserId))
          .eq('lesson_id', Number(id))
          .maybeSingle();

        setProgress(progressData || null);
        // Устанавливаем редактируемый ответ, если есть неодобренный ответ
        if (progressData && progressData.status !== 'completed') {
          setEditableAnswer(progressData.user_answer || '');
        } else {
          setEditableAnswer('');
        }
      } else {
        setIsUnlocked({ unlocked: false, message: 'Требуется авторизация' });
      }
    }

    // Загружаем занятия
    const { data: sessionsData, error: sessionsError } = await supabase
      .from('lesson_sessions')
      .select('*')
      .eq('lesson_id', id)
      .order('order_index');

    if (!sessionsError) setSessions(sessionsData || []);
    setLoading(false);
  };

  const handleCompleteClick = () => {
    const tg = (window as any)?.Telegram?.WebApp;
    const telegramUserId =
      (window as any).__telegramUserId ?? tg?.initDataUnsafe?.user?.id;

    if (!telegramUserId) {
      alert('Завершение урока доступно только внутри Telegram WebApp.');
      return;
    }

    if (!lesson?.question) {
      alert('У этого урока нет вопроса для завершения.');
      return;
    }

    setIsModalOpen(true);
  };

  const handleModalSuccess = () => {
    loadLessonData();
  };

  const handleSubmitAnswer = async () => {
    if (!editableAnswer.trim()) {
      alert('Пожалуйста, введите ответ на вопрос');
      return;
    }

    setIsSubmitting(true);

    const tg = (window as any)?.Telegram?.WebApp;
    const telegramUserId =
      (window as any).__telegramUserId ?? tg?.initDataUnsafe?.user?.id;

    if (!telegramUserId) {
      alert('Требуется авторизация Telegram');
      setIsSubmitting(false);
      return;
    }

    try {
      const response = await fetch('/api/check-lesson-answer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          lesson_id: lesson.id,
          user_answer: editableAnswer,
          photo_url: progress?.photo_url || null,
          telegram_user_id: Number(telegramUserId),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Ошибка при проверке ответа');
      }

      if (data.approved) {
        alert('Ваш ответ принят. Завтра можете приступить к выполнению следующего урока.');
        loadLessonData();
      } else {
        alert(data.message || 'Ответ не подходит. Посмотрите видео ещё раз и попробуйте ответить снова.');
        loadLessonData();
      }
    } catch (error: any) {
      console.error('Error submitting answer:', error);
      alert('Ошибка: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading || !lesson) {
    return (
      <main className="container">
        <section className="surface">
          <p className="page-subtitle">Загружаем урок…</p>
        </section>
      </main>
    );
  }

  const canComplete = isUnlocked?.unlocked && lesson.question;
  const isAnswerApproved = progress?.status === 'completed';
  const hasAnswer = progress?.user_answer;
  const [editableAnswer, setEditableAnswer] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  return (
    <main className="container">
      <section className="surface lesson-layout">
        <header className="lesson-header">
          <div>
            <Link href={lesson?.course_id ? `/courses/${lesson.course_id}` : '/courses'} className="btn-back">
              ← Назад
            </Link>
            <h1 className="lesson-title">{lesson.title}</h1>
            {isAnswerApproved && (
              <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '8px', color: '#16a34a', fontSize: '14px' }}>
                <span style={{ fontSize: '20px' }}>✓</span>
                <span>Ответ принят</span>
              </div>
            )}
            {!isUnlocked?.unlocked && (
              <div style={{ marginTop: '12px', padding: '12px', background: '#fef2f2', borderRadius: '8px', color: '#dc2626' }}>
                {isUnlocked?.message || 'Урок недоступен'}
              </div>
            )}
          </div>
        </header>

        {lesson.kinescope_video_id && isUnlocked?.unlocked && (
          <div className="lesson-video-section">
            <VideoPlayer kinescopeVideoId={lesson.kinescope_video_id} title={lesson.title} />
          </div>
        )}

        {lesson.lesson_description && isUnlocked?.unlocked && (
          <div className="lesson-description" style={{ marginTop: '24px', padding: '16px', background: '#f9fafb', borderRadius: '8px' }}>
            <p style={{ margin: 0, lineHeight: '1.6' }}>{lesson.lesson_description}</p>
          </div>
        )}

        {isUnlocked?.unlocked && sessions.length > 0 ? (
          <div className="lesson-layout">
            {sessions.map((s) => (
              <div key={s.id} className="lesson-card">
                <div className="badge">Занятие</div>
                <h2 className="lesson-card-title">{s.title}</h2>
                {s.content && <div className="lesson-body">{s.content}</div>}
              </div>
            ))}
          </div>
        ) : isUnlocked?.unlocked && lesson.content ? (
          <div className="lesson-body">
            {lesson.content}
          </div>
        ) : isUnlocked?.unlocked ? (
          <p className="page-subtitle">В этом уроке пока нет занятий.</p>
        ) : null}

        {/* Отображение вопроса и ответа */}
        {isUnlocked?.unlocked && lesson.question && (
          <div style={{ marginTop: '24px', padding: '20px', background: '#f9fafb', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
            <h3 style={{ marginTop: 0, marginBottom: '12px', fontSize: '18px', fontWeight: '600' }}>Вопрос к уроку:</h3>
            <p style={{ marginBottom: '20px', padding: '12px', background: 'white', borderRadius: '6px', lineHeight: '1.6' }}>
              {lesson.question}
            </p>
            
            {hasAnswer ? (
              <div>
                <h4 style={{ marginBottom: '12px', fontSize: '16px', fontWeight: '600' }}>Ваш ответ:</h4>
                {isAnswerApproved ? (
                  <>
                    <div style={{ padding: '12px', background: 'white', borderRadius: '6px', lineHeight: '1.6', color: '#374151', marginBottom: '12px' }}>
                      {progress.user_answer}
                    </div>
                    {progress.photo_url && (
                      <div style={{ marginTop: '12px', marginBottom: '12px' }}>
                        <img 
                          src={progress.photo_url} 
                          alt="Ответ" 
                          style={{ maxWidth: '100%', borderRadius: '6px', border: '1px solid #e5e7eb' }} 
                        />
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <textarea
                      value={editableAnswer}
                      onChange={(e) => setEditableAnswer(e.target.value)}
                      className="form-textarea"
                      rows={5}
                      style={{ width: '100%', marginBottom: '12px' }}
                      placeholder="Введите ваш ответ на вопрос..."
                    />
                    {progress.photo_url && (
                      <div style={{ marginTop: '12px', marginBottom: '12px' }}>
                        <img 
                          src={progress.photo_url} 
                          alt="Ответ" 
                          style={{ maxWidth: '100%', borderRadius: '6px', border: '1px solid #e5e7eb' }} 
                        />
                      </div>
                    )}
                    <div style={{ padding: '12px', background: '#fef3c7', borderRadius: '6px', marginBottom: '12px', color: '#92400e', fontSize: '14px' }}>
                      Ответ не был принят. Вы можете отредактировать его и отправить заново.
                    </div>
                    <button
                      className="btn btn-primary"
                      onClick={handleSubmitAnswer}
                      disabled={isSubmitting || !editableAnswer.trim()}
                    >
                      {isSubmitting ? 'Отправляем...' : 'Отправить ответ заново'}
                    </button>
                  </>
                )}
              </div>
            ) : canComplete && (
              <div>
                <button className="btn btn-primary" onClick={handleCompleteClick}>
                  Ответить на вопрос
                </button>
              </div>
            )}
          </div>
        )}

        <LessonCompletionModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          lesson={lesson}
          onSuccess={handleModalSuccess}
          initialAnswer={hasAnswer && !isAnswerApproved ? progress.user_answer : undefined}
          initialPhotoUrl={hasAnswer && !isAnswerApproved ? progress.photo_url : undefined}
        />
      </section>
    </main>
  );
}
