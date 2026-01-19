import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

export default function LessonPage() {
  const router = useRouter();
  const { id } = router.query;
  const [lesson, setLesson] = useState<any>(null);

  useEffect(() => {
    if (!id) return;

    supabase
      .from('lessons')
      .select('*')
      .eq('id', id)
      .single()
      .then(({ data }) => setLesson(data));
  }, [id]);

  const markCompleted = async () => {
  const { error } = await supabase
    .from('user_progress')
    .upsert(
      {
        lesson_id: Number(id),
        status: 'completed',
        telegram_user_id: 0, // значение валидируется RLS
      },
      {
        onConflict: 'telegram_user_id,lesson_id',
      }
    );

  if (error) {
    console.error(error);
  }
};

  if (!lesson) return <div>Загрузка…</div>;

  return (
    <div>
      <h1>{lesson.title}</h1>
      <button onClick={markCompleted}>Завершить урок</button>
    </div>
  );
}
