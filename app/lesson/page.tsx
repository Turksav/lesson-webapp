 'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function LessonsPage() {
  const [lessons, setLessons] = useState<any[]>([]);

  useEffect(() => {
    supabase
      .from('lessons')
      .select('*')
      .order('id')
      .then(({ data, error }) => {
        if (!error) setLessons(data || []);
      });
  }, []);

  return (
    <main className="container">
      <section className="surface">
        <header className="page-header">
          <div>
            <h1 className="page-title">Все уроки</h1>
            <p className="page-subtitle">Выбери урок, чтобы начать проходить материал.</p>
          </div>
          <Link href="/" className="btn btn-ghost btn-sm">
            На главную
          </Link>
        </header>

        {lessons.length === 0 ? (
          <p className="page-subtitle">Пока нет ни одного урока.</p>
        ) : (
          <div className="lesson-grid">
            {lessons.map((l) => (
              <Link
                key={l.id}
                href={`/lesson/${l.id}`}
                className="lesson-card"
              >
                <h2 className="lesson-card-title">{l.title}</h2>
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
