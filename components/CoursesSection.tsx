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

  if (courses.length === 0) {
    return <p className="page-subtitle">Пока нет ни одного курса.</p>;
  }

  return (
    <div className="courses-list">
      {courses.map((course, index) => (
        <div key={course.id} className="course-card">
          <div className="course-number">{index + 1}</div>
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
  );
}
