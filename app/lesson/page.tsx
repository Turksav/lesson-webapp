import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';

export default async function LessonList() {
  const { data: lessons } = await supabase
    .from('lessons')
    .select('id, title');

  if (!lessons || lessons.length === 0) {
    return <p>Уроки не найдены</p>;
  }

  return (
    <div>
      <h1>Список уроков</h1>
      <ul>
        {lessons.map((lesson: any) => (
          <li key={lesson.id}>
            <Link href={`/lesson/${lesson.id}`}>{lesson.title}</Link>
          </li>
        ))}
      </ul>
    </div>
  );
}