import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';

export default async function LessonList() {
  const { data: lessons } = await supabase
    .from('lessons')
    .select('id, title, description');

  if (!lessons || lessons.length === 0) {
    return <p className="container">Уроки не найдены</p>;
  }

  return (
    <div className="container">
      <h1>Список уроков</h1>
      <div className="lesson-grid">
        {lessons.map((lesson: any) => (
          <Link key={lesson.id} href={`/lesson/${lesson.id}`} className="lesson-card">
            <h2>{lesson.title}</h2>
            <p>{lesson.description?.slice(0, 80)}...</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
