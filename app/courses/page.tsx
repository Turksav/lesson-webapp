'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function CoursesPage() {
  const [courses, setCourses] = useState<any[]>([]);

  useEffect(() => {
    supabase
      .from('courses')
      .select('*')
      .order('id')
      .then(({ data, error }) => {
        if (!error) setCourses(data || []);
      });
  }, []);

  return (
    <main className="container">
      <section className="surface">
        <header className="page-header">
          <div>
            <Link href="/" className="btn-back">
              ← На главную
            </Link>
            <h1 className="page-title">Курсы</h1>
            <p className="page-subtitle">Выбери курс, чтобы посмотреть уроки.</p>
          </div>
        </header>

        {courses.length === 0 ? (
          <p className="page-subtitle">Пока нет ни одного курса.</p>
        ) : (
          <div className="lesson-grid">
            {courses.map((c) => (
              <Link key={c.id} href={`/courses/${c.id}`} className="lesson-card">
                <h2 className="lesson-card-title">{c.title}</h2>
                {c.description && <p className="page-subtitle">{c.description}</p>}
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

