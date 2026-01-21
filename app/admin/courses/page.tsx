'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

interface Course {
  id: number;
  title: string;
  description: string | null;
  image_url: string | null;
}

export default function AdminCoursesPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    image_url: '',
  });

  useEffect(() => {
    loadCourses();
  }, []);

  const loadCourses = async () => {
    const { data, error } = await supabase
      .from('courses')
      .select('*')
      .order('id');

    if (!error && data) {
      setCourses(data);
    }
    setLoading(false);
  };

  const handleEdit = (course: Course) => {
    setEditingId(course.id);
    setFormData({
      title: course.title,
      description: course.description || '',
      image_url: course.image_url || '',
    });
  };

  const handleCancel = () => {
    setEditingId(null);
    setFormData({ title: '', description: '', image_url: '' });
  };

  const handleSave = async () => {
    if (!formData.title.trim()) {
      alert('Название курса обязательно');
      return;
    }

    try {
      if (editingId) {
        const { error } = await supabase
          .from('courses')
          .update({
            title: formData.title,
            description: formData.description || null,
            image_url: formData.image_url || null,
          })
          .eq('id', editingId);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('courses')
          .insert({
            title: formData.title,
            description: formData.description || null,
            image_url: formData.image_url || null,
          });

        if (error) throw error;
      }

      handleCancel();
      loadCourses();
    } catch (error: any) {
      alert('Ошибка: ' + error.message);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Удалить курс?')) return;

    try {
      const { error } = await supabase.from('courses').delete().eq('id', id);
      if (error) throw error;
      loadCourses();
    } catch (error: any) {
      alert('Ошибка: ' + error.message);
    }
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
        <h1 className="admin-page-title">Управление курсами</h1>
        <button
          className="btn btn-primary"
          onClick={() => {
            setEditingId(null);
            setFormData({ title: '', description: '', image_url: '' });
          }}
        >
          + Создать курс
        </button>
      </div>

      {(editingId === null && !formData.title) || editingId !== null ? (
        <div className="admin-form-card">
          <h2>{editingId ? 'Редактировать курс' : 'Создать курс'}</h2>
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
            <label>Описание</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="form-textarea"
              rows={3}
            />
          </div>
          <div className="form-group">
            <label>URL изображения</label>
            <input
              type="url"
              value={formData.image_url}
              onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
              className="form-input"
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
      ) : null}

      <div className="admin-table-card">
        <table className="admin-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Название</th>
              <th>Описание</th>
              <th>Действия</th>
            </tr>
          </thead>
          <tbody>
            {courses.map((course) => (
              <tr key={course.id}>
                <td>{course.id}</td>
                <td>{course.title}</td>
                <td>{course.description || '-'}</td>
                <td>
                  <button
                    className="btn btn-sm btn-ghost"
                    onClick={() => handleEdit(course)}
                  >
                    Редактировать
                  </button>
                  <button
                    className="btn btn-sm btn-ghost"
                    onClick={() => handleDelete(course.id)}
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
