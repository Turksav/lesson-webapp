import { supabase } from '@/lib/supabaseClient';
import { notFound } from 'next/navigation';

interface Lesson {
  id: number;
  title: string;
  description: string;
}

interface Option {
  id: number;
  option_text: string;
}

interface Question {
  id: number;
  question_text: string;
  order: number;
  options: Option[];
}

// В новых версиях params может быть Promise
interface Props {
  params: Promise<{ id: string }>;
}

export default async function LessonPage({ params }: Props) {
  // Разворачиваем params
  const { id: lessonId } = await params;

  // Получаем данные урока
  const { data: lessonData, error: lessonError } = await supabase
    .from('lessons')
    .select('id, title, description')
    .eq('id', lessonId)
    .single();

  if (!lessonData || lessonError) {
    return notFound();
  }

  // Получаем вопросы и варианты
  const { data: questionsData, error: questionsError } = await supabase
    .from<Question>('questions')
    .select(`
      id,
      question_text,
      order,
      options(id, option_text)
    `)
    .eq('lesson_id', lessonId)
    .order('order', { ascending: true });

  if (!questionsData || questionsError) {
    return <div>Вопросы не найдены</div>;
  }

  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
      <h1>{lessonData.title}</h1>
      <p>{lessonData.description}</p>

      <h2>Вопросы:</h2>
      <ul>
        {questionsData.map((q) => (
          <li key={q.id} style={{ marginBottom: '1rem' }}>
            <b>{q.question_text}</b>
            <ul>
              {q.options.map((opt) => (
                <li key={opt.id}>{opt.option_text}</li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </div>
  );
}
