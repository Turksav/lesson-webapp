'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

interface Course {
  id: number;
  title: string;
  description: string | null;
  image_url: string | null;
  price: number;
}

export default function AdminCoursesPage() {
  const [allCourses, setAllCourses] = useState<Course[]>([]);
  const [filteredCourses, setFilteredCourses] = useState<Course[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState<Record<string, Set<string>>>({});
  const [filterMenus, setFilterMenus] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    image_url: '',
    price: 0,
  });
  const itemsPerPage = 10;

  useEffect(() => {
    loadCourses();
  }, []);

  const loadCourses = async () => {
    const { data, error } = await supabase
      .from('courses')
      .select('*')
      .order('id', { ascending: false });

    if (!error && data) {
      setAllCourses(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    applyFilters();
  }, [allCourses, filters]);

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
    let filtered = [...allCourses];

    Object.keys(filters).forEach((key) => {
      const filterValues = filters[key];
      if (filterValues.size > 0) {
        filtered = filtered.filter((item) => {
          let value: string;
          if (key === 'id') {
            value = item.id.toString();
          } else if (key === 'title') {
            value = item.title.toLowerCase();
          } else if (key === 'description') {
            value = (item.description || '-').toLowerCase();
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
    setFilteredCourses(filtered);
    setCurrentPage(1);
  };

  const getUniqueValues = (key: string): string[] => {
    const values = new Set<string>();
    allCourses.forEach((item) => {
      let value: string;
      if (key === 'id') {
        value = item.id.toString();
      } else if (key === 'title') {
        value = item.title;
      } else if (key === 'description') {
        value = item.description || '-';
      } else if (key === 'price') {
        value = item.price?.toString() || '0';
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
    return filteredCourses.slice(startIndex, endIndex);
  };

  const totalPages = Math.ceil(filteredCourses.length / itemsPerPage);

  const handleEdit = (course: Course) => {
    setEditingId(course.id);
    setFormData({
      title: course.title,
      description: course.description || '',
      image_url: course.image_url || '',
      price: course.price || 0,
    });
  };

  const handleCancel = () => {
    setEditingId(null);
    setFormData({ title: '', description: '', image_url: '', price: 0 });
  };

  const handleSave = async () => {
    if (!formData.title.trim()) {
      alert('Название курса обязательно');
      return;
    }

    try {
      const { error } = await supabase.rpc('create_or_update_course', {
        p_id: editingId || null,
        p_title: formData.title,
        p_description: formData.description || null,
        p_image_url: formData.image_url || null,
        p_price: formData.price || 0,
      });

      if (error) throw error;

      handleCancel();
      loadCourses();
    } catch (error: any) {
      alert('Ошибка: ' + error.message);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Удалить курс?')) return;

    try {
      const { error } = await supabase.rpc('delete_course', {
        p_id: id,
      });
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
              setFormData({ title: '', description: '', image_url: '', price: 0 });
            }}
          >
            + Создать курс
          </button>
        </div>
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
          <div className="form-group">
            <label>Стоимость</label>
            <input
              type="number"
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) || 0 })}
              className="form-input"
              min="0"
              step="0.01"
            />
            <small style={{ color: '#6b7280', fontSize: '12px', marginTop: '4px', display: 'block' }}>
              Стоимость курса. Может быть нулевой.
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
      ) : null}

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
                  <span>Описание</span>
                  <button
                    className="admin-filter-btn"
                    onClick={() => setFilterMenus({ ...filterMenus, description: !filterMenus.description })}
                  >
                    🔽
                  </button>
                </div>
                {filterMenus.description && (
                  <div className="admin-filter-menu">
                    <input
                      type="text"
                      placeholder="Поиск..."
                      className="admin-filter-search"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && e.currentTarget.value) {
                          toggleFilter('description', e.currentTarget.value);
                          e.currentTarget.value = '';
                        }
                      }}
                    />
                    {filters.description && filters.description.size > 0 && (
                      <button
                        className="admin-filter-clear"
                        onClick={() => clearFilter('description')}
                      >
                        Очистить
                      </button>
                    )}
                  </div>
                )}
              </th>
              <th>
                <div className="admin-table-header">
                  <span>Стоимость</span>
                  <button
                    className="admin-filter-btn"
                    onClick={() => setFilterMenus({ ...filterMenus, price: !filterMenus.price })}
                  >
                    🔽
                  </button>
                </div>
                {filterMenus.price && (
                  <div className="admin-filter-menu">
                    <input
                      type="text"
                      placeholder="Поиск..."
                      className="admin-filter-search"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && e.currentTarget.value) {
                          toggleFilter('price', e.currentTarget.value);
                          e.currentTarget.value = '';
                        }
                      }}
                    />
                    <div className="admin-filter-options">
                      {getUniqueValues('price').map((val) => (
                        <label key={val} className="admin-filter-option">
                          <input
                            type="checkbox"
                            checked={filters.price?.has(val) || false}
                            onChange={() => toggleFilter('price', val)}
                          />
                          <span>{val}</span>
                        </label>
                      ))}
                    </div>
                    {filters.price && filters.price.size > 0 && (
                      <button
                        className="admin-filter-clear"
                        onClick={() => clearFilter('price')}
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
            {getPaginatedData().map((course) => (
              <tr key={course.id}>
                <td>{course.id}</td>
                <td>{course.title}</td>
                <td>{course.description || '-'}</td>
                <td>{course.price || 0}</td>
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
