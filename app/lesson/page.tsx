import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';

export default async function LessonsList() {
  const { data: lessons, error } = await supabase
    .from('lessons')
    .select('id, title');

  if (error) {
    console.error('Supabase error:', error);
  }

  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
      <h1>Список уроков</h1>
      {lessons && lessons.length > 0 ? (
        <ul>
          {lessons.map((lesson) => (
            <li key={lesson.id}>
              <Link href={`/lesson/${lesson.id}`}>{lesson.title}</Link>
            </li>
          ))}
        </ul>
      ) : (
        <p>Уроки не найдены</p>
      )}
    </div>
  );
}
