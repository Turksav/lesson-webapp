import { supabase } from '@/lib/supabaseClient';

interface Props {
  params: { id: string };
}

export default async function LessonPage({ params }: Props) {
  const resolvedParams = await params;
  const lessonId = resolvedParams.id;

  const { data: lesson, error } = await supabase
    .from('lessons')
    .select('id, title, description')
    .eq('id', Number(lessonId))
    .single();

  if (!lesson || error) return <p className="container">Урок не найден</p>;

  return (
    <div className="container">
      <h1>{lesson.title}</h1>
      <p>{lesson.description}</p>
    </div>
  );
}
