'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { formatCurrency } from '@/lib/currencyUtils';

export default function CourseLessonsPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [course, setCourse] = useState<any>(null);
  const [lessons, setLessons] = useState<any[]>([]);
  const [enrollment, setEnrollment] = useState<any>(null);
  const [balance, setBalance] = useState<number>(0);
  const [currency, setCurrency] = useState<string>('RUB');
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [lessonsProgress, setLessonsProgress] = useState<Map<number, any>>(new Map());

  useEffect(() => {
    if (!id) return;
    loadData();
  }, [id]);

  const loadData = async () => {
    setLoading(true);
    const tg = (window as any)?.Telegram?.WebApp;
    const telegramUserId =
      (window as any).__telegramUserId ?? tg?.initDataUnsafe?.user?.id;

    // Загружаем курс
    const { data: courseData, error: courseError } = await supabase
      .from('courses')
      .select('*')
      .eq('id', id)
      .single();

    if (!courseError) setCourse(courseData);

    // Загружаем уроки
    const { data: lessonsData, error: lessonsError } = await supabase
      .from('lessons')
      .select('*')
      .eq('course_id', id)
      .order('order_index');

    if (!lessonsError) setLessons(lessonsData || []);

    if (telegramUserId) {
      // Загружаем enrollment
      const { data: enrollmentData, error: enrollmentError } = await supabase
        .from('user_course_enrollments')
        .select('*')
        .eq('telegram_user_id', Number(telegramUserId))
        .eq('course_id', Number(id))
        .eq('status', 'active')
        .maybeSingle();

      if (!enrollmentError && enrollmentData) {
        setEnrollment(enrollmentData);
      } else {
        setEnrollment(null);
      }

      // Загружаем прогресс по урокам курса
      if (lessonsData && lessonsData.length > 0) {
        const lessonIds = lessonsData.map(l => l.id);
        const { data: progressData } = await supabase
          .from('user_progress')
          .select('*')
          .eq('telegram_user_id', Number(telegramUserId))
          .in('lesson_id', lessonIds);

        if (progressData) {
          const progressMap = new Map(
            progressData.map((p: any) => [p.lesson_id, p])
          );
          setLessonsProgress(progressMap);
        }
      }

      // Загружаем баланс и валюту
      const { data: balanceData } = await supabase
        .from('user_balance')
        .select('balance')
        .eq('telegram_user_id', Number(telegramUserId))
        .single();

      if (balanceData) setBalance(Number(balanceData.balance) || 0);

      const { data: settingsData } = await supabase
        .from('user_settings')
        .select('currency')
        .eq('telegram_user_id', Number(telegramUserId))
        .single();

      if (settingsData) setCurrency(settingsData.currency || 'RUB');
    }

    setLoading(false);
  };

  const handleStartCourse = async () => {
    const tg = (window as any)?.Telegram?.WebApp;
    const telegramUserId =
      (window as any).__telegramUserId ?? tg?.initDataUnsafe?.user?.id;

    if (!telegramUserId) {
      alert('Доступно только в Telegram WebApp');
      return;
    }

    if (!course) return;

    setStarting(true);

    try {
      console.log('Starting course:', { telegramUserId, courseId: id });
      
      // Вызываем RPC функцию
      const { data, error } = await supabase.rpc('start_course', {
        p_telegram_user_id: Number(telegramUserId),
        p_course_id: Number(id),
      });

      if (error) {
        console.error('RPC error:', error);
        console.error('Error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
        });
        
        // Если ошибка 406, это может быть проблема с форматом ответа или правами доступа
        // Пробуем альтернативный способ - создаем enrollment напрямую
        if (error.message?.includes('406') || (error as any).code === 'PGRST116') {
          console.log('Trying alternative method: direct enrollment creation');
          
          // Проверяем активный курс
          const { data: activeCourses } = await supabase
            .from('user_course_enrollments')
            .select('course_id')
            .eq('telegram_user_id', Number(telegramUserId))
            .eq('status', 'active');
          
          if (activeCourses && activeCourses.length > 0) {
            throw new Error('У вас уже есть активный курс. Завершите его, чтобы начать новый.');
          }
          
          // Проверяем баланс
          const { data: balanceData } = await supabase
            .from('user_balance')
            .select('balance')
            .eq('telegram_user_id', Number(telegramUserId))
            .single();
          
          const currentBalance = Number(balanceData?.balance || 0);
          const coursePrice = course.price || 0;
          
          if (currentBalance < coursePrice) {
            throw new Error(`Недостаточно средств на балансе. Требуется: ${coursePrice}, доступно: ${currentBalance}`);
          }
          
          // Создаем enrollment
          const { data: newEnrollmentData, error: enrollError } = await supabase
            .from('user_course_enrollments')
            .insert({
              telegram_user_id: Number(telegramUserId),
              course_id: Number(id),
              status: 'active',
            })
            .select()
            .single();
          
          if (enrollError) {
            throw enrollError;
          }
          
          // Списываем баланс
          const { error: balanceError } = await supabase
            .from('user_balance')
            .update({ balance: currentBalance - coursePrice })
            .eq('telegram_user_id', Number(telegramUserId));
          
          if (balanceError) {
            console.error('Balance update error:', balanceError);
            // Не прерываем процесс, так как enrollment уже создан
          }
          
          // Устанавливаем enrollment и обновляем данные
          if (newEnrollmentData) {
            setEnrollment(newEnrollmentData);
            setBalance(currentBalance - coursePrice);
            // Обновляем остальные данные
            await loadData();
          }
          
          return; // Выходим из функции, так как уже обработали альтернативным способом
        } else {
          throw error;
        }
      }

      console.log('Course started successfully:', data);

      // Загружаем enrollment сразу после успешного начала курса (если использовали RPC)
      const { data: newEnrollment } = await supabase
        .from('user_course_enrollments')
        .select('*')
        .eq('telegram_user_id', Number(telegramUserId))
        .eq('course_id', Number(id))
        .eq('status', 'active')
        .maybeSingle();
      
      if (newEnrollment) {
        setEnrollment(newEnrollment);
        // Обновляем остальные данные
        await loadData();
      } else {
        // Если enrollment не найден сразу, перезагружаем все данные
        await loadData();
      }
    } catch (error: any) {
      console.error('Error starting course:', error);
      alert(error.message || 'Не удалось начать курс. Попробуйте позже.');
    } finally {
      setStarting(false);
    }
  };

  if (loading) {
    return (
      <main className="container">
        <section className="surface">
          <p className="page-subtitle">Загружаем курс…</p>
        </section>
      </main>
    );
  }

  const canStartCourse = !enrollment && course && balance >= (course.price || 0);
  const hasInsufficientBalance = course && balance < (course.price || 0);

  return (
    <main className="container">
      <section className="surface">
        <header className="page-header">
          <div>
            <Link href="/courses" className="btn-back">
              ← Назад к курсам
            </Link>
            <h1 className="page-title">{course?.title ?? 'Курс'}</h1>
            {course?.description && (
              <p className="page-subtitle">{course.description}</p>
            )}
          </div>
        </header>

        {!enrollment ? (
          <div>
            {hasInsufficientBalance && (
              <div style={{ marginBottom: '16px', padding: '12px', background: '#fef2f2', borderRadius: '8px', color: '#dc2626' }}>
                Недостаточно средств на балансе. Требуется: {formatCurrency(course.price, currency)}, доступно: {formatCurrency(balance, currency)}
              </div>
            )}
            <button
              className="btn btn-primary"
              onClick={handleStartCourse}
              disabled={starting || !canStartCourse}
              style={{ marginBottom: '24px' }}
            >
              {starting ? 'Начинаем курс...' : 'Начать курс'}
            </button>
            {lessons.length > 0 && (
              <div style={{ marginTop: '24px', padding: '12px', background: '#f3f4f6', borderRadius: '8px' }}>
                <p style={{ margin: 0, color: '#6b7280' }}>
                  После начала курса вы сможете просмотреть уроки
                </p>
              </div>
            )}
          </div>
        ) : (
          <>
            {lessons.length === 0 ? (
              <p className="page-subtitle">В этом курсе пока нет уроков.</p>
            ) : (
              <div className="lesson-grid">
                {lessons.map((l, index) => {
                  // Первый урок всегда доступен, остальные проверяем через API
                  const isFirstLesson = index === 0;
                  const lessonProgress = lessonsProgress.get(l.id);
                  const isCompleted = lessonProgress?.status === 'completed';
                  return (
                    <div key={l.id} className="lesson-card" style={{ position: 'relative' }}>
                      {!isFirstLesson && !isCompleted && (
                        <div style={{ position: 'absolute', top: '8px', right: '8px', padding: '4px 8px', background: '#f3f4f6', borderRadius: '4px', fontSize: '12px', color: '#6b7280' }}>
                          🔒
                        </div>
                      )}
                      {isCompleted && (
                        <div style={{ position: 'absolute', top: '8px', right: '8px', padding: '4px 8px', background: '#dcfce7', borderRadius: '4px', fontSize: '16px', color: '#16a34a' }}>
                          ✓
                        </div>
                      )}
                      <Link href={`/lesson/${l.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                        <h2 className="lesson-card-title">{l.title}</h2>
                      </Link>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </section>
    </main>
  );
}

