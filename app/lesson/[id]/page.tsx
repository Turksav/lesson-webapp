import { supabase } from '@/lib/supabaseClient';

interface Props {
  params: { id: string };
}

export default async function LessonPage({ params }: Props) {
  const lessonId = params.id;

  const { data: lesson } = await supabase
    .from('lessons')
    .select('id, title, description')
    .eq('id', lessonId)
    .single();

  if (!lesson) return <p>Урок не найден</p>;

  return (
    <div>
      <h1>{lesson.title}</h1>
      <p>{lesson.description}</p>
    </div>
  );
}