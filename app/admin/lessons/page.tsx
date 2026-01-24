'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

interface Lesson {
  id: number;
  title: string;
  course_id: number | null;
  order_index: number;
  video_path: string | null;
}

interface Course {
  id: number;
  title: string;
}

export default function AdminLessonsPage() {
  const [allLessons, setAllLessons] = useState<Lesson[]>([]);
  const [filteredLessons, setFilteredLessons] = useState<Lesson[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState<Record<string, Set<string>>>({});
  const [filterMenus, setFilterMenus] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    course_id: '',
    order_index: 0,
    video_path: '',
  });
  const itemsPerPage = 10;

  useEffect(() => {
    loadLessons();
    loadCourses();
  }, []);

  const loadLessons = async () => {
    const { data, error } = await supabase
      .from('lessons')
      .select('*')
      .order('id', { ascending: false });

    if (!error && data) {
      setAllLessons(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    applyFilters();
  }, [allLessons, filters, courses]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.admin-filter-menu') && !target.closest('.admin-filter-btn')) {
        setFilterMenus({});
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const clearAllFilters = () => {
    setFilters({});
  };

  const hasActiveFilters = () => {
    return Object.keys(filters).length > 0;
  };

  const applyFilters = () => {
    let filtered = [...allLessons];

    Object.keys(filters).forEach((key) => {
      const filterValues = filters[key];
      if (filterValues.size > 0) {
        filtered = filtered.filter((item) => {
          let value: string;
          if (key === 'id') {
            value = item.id.toString();
          } else if (key === 'title') {
            value = item.title.toLowerCase();
          } else if (key === 'course') {
            value = getCourseTitle(item.course_id).toLowerCase();
          } else if (key === 'order_index') {
            value = item.order_index.toString();
          } else if (key === 'video_path') {
            value = item.video_path ? 'Есть видео' : 'Нет видео';
          } else {
            value = String((item as any)[key] || '').toLowerCase();
          }

          return Array.from(filterValues).some((filterVal) =>
            value.toLowerCase().includes(filterVal.toLowerCase())
          );
        });
      }
    });

    filtered.sort((a, b) => b.id - a.id);
    setFilteredLessons(filtered);
    setCurrentPage(1);
  };

  const getUniqueValues = (key: string): string[] => {
    const values = new Set<string>();
    allLessons.forEach((item) => {
      let value: string;
      if (key === 'id') {
        value = item.id.toString();
      } else if (key === 'title') {
        value = item.title;
      } else if (key === 'course') {
        value = getCourseTitle(item.course_id);
      } else if (key === 'order_index') {
        value = item.order_index.toString();
      } else if (key === 'video_path') {
        value = item.video_path ? 'Есть видео' : 'Нет видео';
      } else {
        value = String((item as any)[key] || '');
      }
      if (value) values.add(value);
    });
    return Array.from(values).sort();
  };

  const toggleFilter = (key: string, value: string) => {
    setFilters((prev) => {
      const newFilters = { ...prev };
      if (!newFilters[key]) {
        newFilters[key] = new Set();
      }
      const filterSet = new Set(newFilters[key]);
      if (filterSet.has(value)) {
        filterSet.delete(value);
      } else {
        filterSet.add(value);
      }
      if (filterSet.size === 0) {
        delete newFilters[key];
      } else {
        newFilters[key] = filterSet;
      }
      return newFilters;
    });
  };

  const clearFilter = (key: string) => {
    setFilters((prev) => {
      const newFilters = { ...prev };
      delete newFilters[key];
      return newFilters;
    });
  };

  const getPaginatedData = () => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredLessons.slice(startIndex, endIndex);
  };

  const totalPages = Math.ceil(filteredLessons.length / itemsPerPage);

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
      video_path: lesson.video_path || '',
    });
  };

  const handleCancel = () => {
    setEditingId(null);
    setIsCreating(false);
    setFormData({ title: '', course_id: '', order_index: 0, video_path: '' });
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
        p_video_path: formData.video_path || null,
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
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <button
            className="btn btn-sm btn-ghost"
            onClick={clearAllFilters}
            disabled={!hasActiveFilters()}
            style={{
              opacity: hasActiveFilters() ? 1 : 0.5,
              cursor: hasActiveFilters() ? 'pointer' : 'not-allowed',
            }}
          >
            Очистить фильтры
          </button>
          <button
            className="btn btn-primary"
            onClick={() => {
              setEditingId(null);
              setIsCreating(true);
              setFormData({ title: '', course_id: '', order_index: 0, video_path: '' });
            }}
          >
            + Создать урок
          </button>
        </div>
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
          <div className="form-group">
            <label>Путь к видео (необязательно)</label>
            <input
              type="text"
              value={formData.video_path}
              onChange={(e) => setFormData({ ...formData, video_path: e.target.value })}
              className="form-input"
              placeholder="Путь к файлу в bucket lesson-videos"
            />
            <small style={{ color: '#6b7280', fontSize: '12px', marginTop: '4px', display: 'block' }}>
              Например: lesson-1/intro.mp4
            </small>
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
              <th>
                <div className="admin-table-header">
                  <span>ID</span>
                  <button
                    className="admin-filter-btn"
                    onClick={() => setFilterMenus({ ...filterMenus, id: !filterMenus.id })}
                  >
                    🔽
                  </button>
                </div>
                {filterMenus.id && (
                  <div className="admin-filter-menu">
                    <input
                      type="text"
                      placeholder="Поиск..."
                      className="admin-filter-search"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && e.currentTarget.value) {
                          toggleFilter('id', e.currentTarget.value);
                          e.currentTarget.value = '';
                        }
                      }}
                    />
                    <div className="admin-filter-options">
                      {getUniqueValues('id').map((val) => (
                        <label key={val} className="admin-filter-option">
                          <input
                            type="checkbox"
                            checked={filters.id?.has(val) || false}
                            onChange={() => toggleFilter('id', val)}
                          />
                          <span>{val}</span>
                        </label>
                      ))}
                    </div>
                    {filters.id && filters.id.size > 0 && (
                      <button
                        className="admin-filter-clear"
                        onClick={() => clearFilter('id')}
                      >
                        Очистить
                      </button>
                    )}
                  </div>
                )}
              </th>
              <th>
                <div className="admin-table-header">
                  <span>Название</span>
                  <button
                    className="admin-filter-btn"
                    onClick={() => setFilterMenus({ ...filterMenus, title: !filterMenus.title })}
                  >
                    🔽
                  </button>
                </div>
                {filterMenus.title && (
                  <div className="admin-filter-menu">
                    <input
                      type="text"
                      placeholder="Поиск..."
                      className="admin-filter-search"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && e.currentTarget.value) {
                          toggleFilter('title', e.currentTarget.value);
                          e.currentTarget.value = '';
                        }
                      }}
                    />
                    <div className="admin-filter-options">
                      {getUniqueValues('title').map((val) => (
                        <label key={val} className="admin-filter-option">
                          <input
                            type="checkbox"
                            checked={filters.title?.has(val) || false}
                            onChange={() => toggleFilter('title', val)}
                          />
                          <span>{val}</span>
                        </label>
                      ))}
                    </div>
                    {filters.title && filters.title.size > 0 && (
                      <button
                        className="admin-filter-clear"
                        onClick={() => clearFilter('title')}
                      >
                        Очистить
                      </button>
                    )}
                  </div>
                )}
              </th>
              <th>
                <div className="admin-table-header">
                  <span>Курс</span>
                  <button
                    className="admin-filter-btn"
                    onClick={() => setFilterMenus({ ...filterMenus, course: !filterMenus.course })}
                  >
                    🔽
                  </button>
                </div>
                {filterMenus.course && (
                  <div className="admin-filter-menu">
                    <input
                      type="text"
                      placeholder="Поиск..."
                      className="admin-filter-search"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && e.currentTarget.value) {
                          toggleFilter('course', e.currentTarget.value);
                          e.currentTarget.value = '';
                        }
                      }}
                    />
                    <div className="admin-filter-options">
                      {getUniqueValues('course').map((val) => (
                        <label key={val} className="admin-filter-option">
                          <input
                            type="checkbox"
                            checked={filters.course?.has(val) || false}
                            onChange={() => toggleFilter('course', val)}
                          />
                          <span>{val}</span>
                        </label>
                      ))}
                    </div>
                    {filters.course && filters.course.size > 0 && (
                      <button
                        className="admin-filter-clear"
                        onClick={() => clearFilter('course')}
                      >
                        Очистить
                      </button>
                    )}
                  </div>
                )}
              </th>
              <th>
                <div className="admin-table-header">
                  <span>Порядок</span>
                  <button
                    className="admin-filter-btn"
                    onClick={() => setFilterMenus({ ...filterMenus, order_index: !filterMenus.order_index })}
                  >
                    🔽
                  </button>
                </div>
                {filterMenus.order_index && (
                  <div className="admin-filter-menu">
                    <input
                      type="text"
                      placeholder="Поиск..."
                      className="admin-filter-search"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && e.currentTarget.value) {
                          toggleFilter('order_index', e.currentTarget.value);
                          e.currentTarget.value = '';
                        }
                      }}
                    />
                    <div className="admin-filter-options">
                      {getUniqueValues('order_index').map((val) => (
                        <label key={val} className="admin-filter-option">
                          <input
                            type="checkbox"
                            checked={filters.order_index?.has(val) || false}
                            onChange={() => toggleFilter('order_index', val)}
                          />
                          <span>{val}</span>
                        </label>
                      ))}
                    </div>
                    {filters.order_index && filters.order_index.size > 0 && (
                      <button
                        className="admin-filter-clear"
                        onClick={() => clearFilter('order_index')}
                      >
                        Очистить
                      </button>
                    )}
                  </div>
                )}
              </th>
              <th>
                <div className="admin-table-header">
                  <span>Видео</span>
                  <button
                    className="admin-filter-btn"
                    onClick={() => setFilterMenus({ ...filterMenus, video_path: !filterMenus.video_path })}
                  >
                    🔽
                  </button>
                </div>
                {filterMenus.video_path && (
                  <div className="admin-filter-menu">
                    <input
                      type="text"
                      placeholder="Поиск..."
                      className="admin-filter-search"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && e.currentTarget.value) {
                          toggleFilter('video_path', e.currentTarget.value);
                          e.currentTarget.value = '';
                        }
                      }}
                    />
                    {filters.video_path && filters.video_path.size > 0 && (
                      <button
                        className="admin-filter-clear"
                        onClick={() => clearFilter('video_path')}
                      >
                        Очистить
                      </button>
                    )}
                  </div>
                )}
              </th>
              <th>Действия</th>
            </tr>
          </thead>
          <tbody>
            {getPaginatedData().map((lesson) => (
              <tr key={lesson.id}>
                <td>{lesson.id}</td>
                <td>{lesson.title}</td>
                <td>{getCourseTitle(lesson.course_id)}</td>
                <td>{lesson.order_index}</td>
                <td>
                  {lesson.video_path ? (
                    <span style={{ color: '#16a34a', fontSize: '12px' }}>✓ Есть видео</span>
                  ) : (
                    <span style={{ color: '#dc2626', fontSize: '12px' }}>✗ Нет видео</span>
                  )}
                </td>
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
        {totalPages > 1 && (
          <div className="admin-pagination">
            <button
              className="btn btn-sm btn-ghost"
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
            >
              ««
            </button>
            <button
              className="btn btn-sm btn-ghost"
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
            >
              ‹
            </button>
            <span className="admin-pagination-info">
              Страница {currentPage} из {totalPages}
            </span>
            <button
              className="btn btn-sm btn-ghost"
              onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
            >
              ›
            </button>
            <button
              className="btn btn-sm btn-ghost"
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages}
            >
              »»
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
