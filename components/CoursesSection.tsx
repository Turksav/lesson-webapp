'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function CoursesSection() {
  const [courses, setCourses] = useState<any[]>([]);

  useEffect(() => {
    supabase
      .from('courses')
      .select('*')
      .order('id')
      .then(({ data, error }) => {
        if (!error) setCourses(data || []);
      });
  }, []);

  const handleConsultation = () => {
    alert('Функция записи на личную консультацию будет доступна в ближайшее время.');
  };

  const handleDonate = () => {
    alert('Функция благодарности проекту будет доступна в ближайшее время.');
  };

  if (courses.length === 0) {
    return (
      <>
        <p className="page-subtitle">Пока нет ни одного курса.</p>
        <div className="courses-actions">
          <button className="btn btn-primary" onClick={handleConsultation}>
            Записаться на личную консультацию
          </button>
          <button className="btn btn-ghost" onClick={handleDonate}>
            Благодарить проект
          </button>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="courses-list">
        {courses.map((course) => (
          <div key={course.id} className="course-card">
            {course.image_url && (
              <div className="course-image">
                <img src={course.image_url} alt={course.title} />
              </div>
            )}
            <div className="course-content">
              <h2 className="course-title">{course.title}</h2>
              {course.description && (
                <p className="course-description">{course.description}</p>
              )}
              <Link href={`/courses/${course.id}`} className="btn btn-primary">
                Подробнее
              </Link>
            </div>
          </div>
        ))}
      </div>

      {/* Кнопки действий */}
      <div className="courses-actions">
        <button className="btn btn-primary" onClick={handleConsultation}>
          Записаться на личную консультацию
        </button>
        <button className="btn btn-ghost" onClick={handleDonate}>
          Благодарить проект
        </button>
      </div>
    </>
  );
}
