'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

interface CourseStats {
  course_id: number;
  course_title: string;
  total: number;
  completed: number;
  skipped: number;
  remaining: number;
}

interface LessonProgress {
  lesson_id: number;
  lesson_title: string;
  course_title: string;
  status: 'completed' | 'skipped' | null;
}

export default function CabinetSection() {
  const [stats, setStats] = useState<CourseStats[]>([]);
  const [progress, setProgress] = useState<LessonProgress[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadCabinetData = async () => {
      const tg = (window as any)?.Telegram?.WebApp;
      const telegramUserId =
        (window as any).__telegramUserId ?? tg?.initDataUnsafe?.user?.id;

      if (!telegramUserId) {
        setLoading(false);
        return;
      }

      try {
        // Загружаем все уроки с их курсами
        const { data: lessonsData, error: lessonsError } = await supabase
          .from('lessons')
          .select(`
            id,
            title,
            course_id,
            courses (
              id,
              title
            )
          `);

        if (lessonsError) {
          console.error('Error loading lessons:', lessonsError);
          setLoading(false);
          return;
        }

        // Загружаем прогресс пользователя
        const { data: progressData, error: progressError } = await supabase
          .from('user_progress')
          .select('lesson_id, status')
          .eq('telegram_user_id', Number(telegramUserId));

        if (progressError) {
          console.error('Error loading progress:', progressError);
          setLoading(false);
          return;
        }

        // Создаём мапу прогресса для быстрого поиска
        const progressMap = new Map(
          (progressData || []).map((p: any) => [p.lesson_id, p.status])
        );

        // Формируем данные для таблицы (только уроки с прогрессом)
        const progressList: LessonProgress[] = (lessonsData || [])
          .filter((lesson: any) => progressMap.has(lesson.id))
          .map((lesson: any) => ({
            lesson_id: lesson.id,
            lesson_title: lesson.title || 'Неизвестный урок',
            course_title: lesson.courses?.title || 'Неизвестный курс',
            status: progressMap.get(lesson.id) === 'completed' ? 'completed' : progressMap.get(lesson.id) === 'skipped' ? 'skipped' : null,
          }));

        setProgress(progressList);

        // Загружаем все курсы с уроками для статистики
        const { data: coursesData, error: coursesError } = await supabase
          .from('courses')
          .select(`
            id,
            title,
            lessons (
              id
            )
          `);

        if (coursesError) {
          console.error('Error loading courses:', coursesError);
          setLoading(false);
          return;
        }

        // Подсчитываем статистику по каждому курсу
        const statsList: CourseStats[] = (coursesData || []).map((course: any) => {
          // Находим уроки этого курса
          const courseLessonIds = (lessonsData || [])
            .filter((l: any) => l.course_id === course.id)
            .map((l: any) => l.id);

          // Находим прогресс по урокам этого курса
          const courseProgress = courseLessonIds
            .map((lessonId: number) => progressMap.get(lessonId))
            .filter(Boolean);

          const completed = courseProgress.filter((s: string) => s === 'completed').length;
          const skipped = courseProgress.filter((s: string) => s === 'skipped').length;
          const total = courseLessonIds.length;
          const remaining = total - completed - skipped;

          return {
            course_id: course.id,
            course_title: course.title,
            total,
            completed,
            skipped,
            remaining,
          };
        });

        setStats(statsList);
      } catch (error) {
        console.error('Error loading cabinet data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadCabinetData();
  }, []);

  if (loading) {
    return <p className="page-subtitle">Загружаем данные кабинета…</p>;
  }

  const currentCourse = stats.length > 0 ? stats[0] : null;

  return (
    <div className="cabinet-content">
      {/* Статистика текущего курса */}
      {currentCourse ? (
        <div className="cabinet-stats">
          <h2 className="cabinet-stats-title">Текущий курс: {currentCourse.course_title}</h2>
          <div className="stats-grid">
            <div className="stat-card stat-completed">
              <div className="stat-value">{currentCourse.completed}</div>
              <div className="stat-label">Пройдено</div>
            </div>
            <div className="stat-card stat-skipped">
              <div className="stat-value">{currentCourse.skipped}</div>
              <div className="stat-label">Пропущено</div>
            </div>
            <div className="stat-card stat-remaining">
              <div className="stat-value">{currentCourse.remaining}</div>
              <div className="stat-label">Осталось</div>
            </div>
          </div>
        </div>
      ) : (
        <p className="page-subtitle">У вас пока нет активных курсов.</p>
      )}

      {/* Таблица прогресса */}
      {progress.length > 0 ? (
        <div className="cabinet-table">
          <h2 className="cabinet-table-title">Прогресс по урокам</h2>
          <table className="progress-table">
            <thead>
              <tr>
                <th>Курс</th>
                <th>Урок</th>
                <th>Статус</th>
              </tr>
            </thead>
            <tbody>
              {progress.map((p) => (
                <tr key={p.lesson_id}>
                  <td>{p.course_title}</td>
                  <td>{p.lesson_title}</td>
                  <td>
                    <span className={`status-badge status-${p.status || 'pending'}`}>
                      {p.status === 'completed'
                        ? 'Пройдено'
                        : p.status === 'skipped'
                        ? 'Пропущено'
                        : 'Не начато'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="page-subtitle">У вас пока нет записей о прогрессе.</p>
      )}
    </div>
  );
}
