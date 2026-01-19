'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function CourseLessonsPage() {
  const { id } = useParams<{ id: string }>();
  const [course, setCourse] = useState<any>(null);
  const [lessons, setLessons] = useState<any[]>([]);

  useEffect(() => {
    if (!id) return;

    supabase
      .from('courses')
      .select('*')
      .eq('id', id)
      .single()
      .then(({ data, error }) => {
        if (!error) setCourse(data);
      });

    supabase
      .from('lessons')
      .select('*')
      .eq('course_id', id)
      .order('order_index')
      .then(({ data, error }) => {
        if (!error) setLessons(data || []);
      });
  }, [id]);

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

        {lessons.length === 0 ? (
          <p className="page-subtitle">В этом курсе пока нет уроков.</p>
        ) : (
          <div className="lesson-grid">
            {lessons.map((l) => (
              <Link key={l.id} href={`/lesson/${l.id}`} className="lesson-card">
                <h2 className="lesson-card-title">{l.title}</h2>
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

