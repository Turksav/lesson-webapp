import { supabase } from '@/lib/supabaseClient';

interface Props {
  params: { id: string };
}

// "async" остаётся, потому что мы делаем запрос к Supabase
export default async function LessonPage({ params }: Props) {
  // Разворачиваем Promise
  const resolvedParams = await params;
  const lessonId = resolvedParams.id;

  // Если id в базе числовой, нужно привести к Number
  const { data: lesson, error } = await supabase
    .from('lessons')
    .select('id, title, description')
    .eq('id', Number(lessonId))
    .single();

  if (!lesson || error) return <p>Урок не найден</p>;

  return (
    <div>
      <h1>{lesson.title}</h1>
      <p>{lesson.description}</p>
    </div>
  );
}
