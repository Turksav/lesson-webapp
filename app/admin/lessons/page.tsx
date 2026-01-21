'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

interface Lesson {
  id: number;
  title: string;
  course_id: number | null;
  order_index: number;
}

interface Course {
  id: number;
  title: string;
}

export default function AdminLessonsPage() {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    course_id: '',
    order_index: 0,
  });

  useEffect(() => {
    loadLessons();
    loadCourses();
  }, []);

  const loadLessons = async () => {
    const { data, error } = await supabase
      .from('lessons')
      .select('*')
      .order('course_id', { ascending: true })
      .order('order_index', { ascending: true });

    if (!error && data) {
      setLessons(data);
    }
    setLoading(false);
  };

  const loadCourses = async () => {
    const { data, error } = await supabase
      .from('courses')
      .select('id, title')
      .order('id');

    if (!error && data) {
      setCourses(data);
    }
  };

  const handleEdit = (lesson: Lesson) => {
    setEditingId(lesson.id);
    setIsCreating(false);
    setFormData({
      title: lesson.title,
      course_id: lesson.course_id?.toString() || '',
      order_index: lesson.order_index,
    });
  };

  const handleCancel = () => {
    setEditingId(null);
    setIsCreating(false);
    setFormData({ title: '', course_id: '', order_index: 0 });
  };

  const handleSave = async () => {
    if (!formData.title.trim()) {
      alert('Название урока обязательно');
      return;
    }

    if (!formData.course_id) {
      alert('Выберите курс');
      return;
    }

    try {
      const { error } = await supabase.rpc('create_or_update_lesson', {
        p_id: editingId || null,
        p_title: formData.title,
        p_course_id: formData.course_id ? Number(formData.course_id) : null,
        p_order_index: formData.order_index,
      });

      if (error) throw error;

      handleCancel();
      loadLessons();
    } catch (error: any) {
      alert('Ошибка: ' + error.message);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Удалить урок? Все связанные занятия также будут удалены.')) return;

    try {
      const { error } = await supabase.rpc('delete_lesson', {
        p_id: id,
      });
      if (error) throw error;
      loadLessons();
    } catch (error: any) {
      alert('Ошибка: ' + error.message);
    }
  };

  const getCourseTitle = (courseId: number | null): string => {
    if (!courseId) return 'Без курса';
    const course = courses.find((c) => c.id === courseId);
    return course?.title || 'Неизвестный курс';
  };

  if (loading) {
    return (
      <div className="admin-page">
        <h1 className="admin-page-title">Загрузка...</h1>
      </div>
    );
  }

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <h1 className="admin-page-title">Управление уроками</h1>
        <button
          className="btn btn-primary"
          onClick={() => {
            setEditingId(null);
            setIsCreating(true);
            setFormData({ title: '', course_id: '', order_index: 0 });
          }}
        >
          + Создать урок
        </button>
      </div>

      {(isCreating || editingId !== null) && (
        <div className="admin-form-card">
          <h2>{editingId ? 'Редактировать урок' : 'Создать урок'}</h2>
          <div className="form-group">
            <label>Название *</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="form-input"
              required
            />
          </div>
          <div className="form-group">
            <label>Курс *</label>
            <select
              value={formData.course_id}
              onChange={(e) => setFormData({ ...formData, course_id: e.target.value })}
              className="form-select"
              required
            >
              <option value="">Выберите курс</option>
              {courses.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.title}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Порядок сортировки</label>
            <input
              type="number"
              value={formData.order_index}
              onChange={(e) =>
                setFormData({ ...formData, order_index: Number(e.target.value) })
              }
              className="form-input"
              min="0"
            />
          </div>
          <div className="admin-form-actions">
            <button className="btn btn-ghost" onClick={handleCancel}>
              Отмена
            </button>
            <button className="btn btn-primary" onClick={handleSave}>
              Сохранить
            </button>
          </div>
        </div>
      )}

      <div className="admin-table-card">
        <table className="admin-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Название</th>
              <th>Курс</th>
              <th>Порядок</th>
              <th>Действия</th>
            </tr>
          </thead>
          <tbody>
            {lessons.map((lesson) => (
              <tr key={lesson.id}>
                <td>{lesson.id}</td>
                <td>{lesson.title}</td>
                <td>{getCourseTitle(lesson.course_id)}</td>
                <td>{lesson.order_index}</td>
                <td>
                  <button
                    className="btn btn-sm btn-ghost"
                    onClick={() => handleEdit(lesson)}
                  >
                    Редактировать
                  </button>
                  <button
                    className="btn btn-sm btn-ghost"
                    onClick={() => handleDelete(lesson.id)}
                    style={{ color: '#dc2626' }}
                  >
                    Удалить
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
