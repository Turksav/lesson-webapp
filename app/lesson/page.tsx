import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export default function Home() {
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
    <div>
      {lessons.map((l) => (
        <div key={l.id}>
          <a href={`/lesson/${l.id}`}>{l.title}</a>
        </div>
      ))}
    </div>
  );
}
