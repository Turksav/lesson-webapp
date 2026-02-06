'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import ReactMarkdown from 'react-markdown';
import remarkBreaks from 'remark-breaks';

interface UserProgress {
  telegram_user_id: number;
  lesson_id: number;
  status: 'completed' | 'skipped';
  user_answer: string | null;
  photo_url: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  lessons?: {
    id: number;
    title: string;
    course_id: number | null;
    courses?: {
      id: number;
      title: string;
    } | null;
  } | null;
  users?: {
    telegram_user_id: number;
    username: string | null;
    first_name: string | null;
    last_name: string | null;
  } | null;
}

export default function AdminProgressPage() {
  const [allProgress, setAllProgress] = useState<UserProgress[]>([]);
  const [filteredProgress, setFilteredProgress] = useState<UserProgress[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [lessons, setLessons] = useState<any[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState<Record<string, Set<string>>>({});
  const [filterMenus, setFilterMenus] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [selectedPhotoUrl, setSelectedPhotoUrl] = useState<string | null>(null);
  const itemsPerPage = 10;

  useEffect(() => {
    loadProgress();
    loadCourses();
    loadLessons();
  }, []);

  const loadProgress = async () => {
    try {
      // Загружаем user_progress с JOIN только для lessons и courses (у них есть foreign key)
      // users загружаем отдельно, так как нет foreign key между user_progress и users
      const { data: progressData, error: progressError } = await supabase
        .from('user_progress')
        .select(`
          *,
          lessons (
            id,
            title,
            course_id,
            courses (
              id,
              title
            )
          )
        `)
        .order('completed_at', { ascending: false, nullsLast: true })
        .order('created_at', { ascending: false });

      if (!progressError && progressData) {
        // Загружаем users отдельно (нет foreign key для JOIN)
        const userIds = [...new Set(progressData.map(p => p.telegram_user_id))];

        const { data: usersData } = await supabase
          .from('users')
          .select('telegram_user_id, username, first_name, last_name')
          .in('telegram_user_id', userIds);

        const usersMap = new Map((usersData || []).map(u => [u.telegram_user_id, u]));

        // Объединяем данные: lessons и courses уже загружены через JOIN, добавляем users
        const progressWithRelations = progressData.map(p => ({
          ...p,
          users: usersMap.get(p.telegram_user_id) || null,
        }));

        setAllProgress(progressWithRelations as UserProgress[]);
      } else {
        console.error('Error loading progress:', progressError);
      }
    } catch (error) {
      console.error('Unexpected error loading progress:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCourses = async () => {
    const { data } = await supabase
      .from('courses')
      .select('id, title')
      .order('id');
    if (data) setCourses(data);
  };

  const loadLessons = async () => {
    const { data } = await supabase
      .from('lessons')
      .select('id, title, course_id')
      .order('id');
    if (data) setLessons(data);
  };

  useEffect(() => {
    applyFilters();
  }, [allProgress, filters]);

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
    let filtered = [...allProgress];

    Object.keys(filters).forEach((key) => {
      const filterValues = filters[key];
      if (filterValues.size > 0) {
        filtered = filtered.filter((item) => {
          let value: string;
          if (key === 'user_id') {
            value = item.telegram_user_id.toString();
          } else if (key === 'user_name') {
            const userName = item.users
              ? [item.users.first_name, item.users.last_name]
                  .filter(Boolean)
                  .join(' ') || item.users.username || ''
              : '';
            value = userName.toLowerCase();
          } else if (key === 'course') {
            value = item.lessons?.courses?.title || '';
          } else if (key === 'lesson') {
            value = item.lessons?.title || '';
          } else if (key === 'status') {
            value = item.status;
          } else {
            value = String((item as any)[key] || '').toLowerCase();
          }

          return Array.from(filterValues).some((filterVal) =>
            value.toLowerCase().includes(filterVal.toLowerCase())
          );
        });
      }
    });

    filtered.sort((a, b) => {
      const dateA = a.completed_at ? new Date(a.completed_at).getTime() : 0;
      const dateB = b.completed_at ? new Date(b.completed_at).getTime() : 0;
      if (dateB !== dateA) return dateB - dateA;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    setFilteredProgress(filtered);
    setCurrentPage(1);
  };

  const getUniqueValues = (key: string): string[] => {
    const values = new Set<string>();
    allProgress.forEach((item) => {
      let value: string;
      if (key === 'user_id') {
        value = item.telegram_user_id.toString();
      } else if (key === 'user_name') {
        const userName = item.users
          ? [item.users.first_name, item.users.last_name]
              .filter(Boolean)
              .join(' ') || item.users.username || ''
          : '';
        value = userName;
      } else if (key === 'course') {
        value = item.lessons?.courses?.title || '';
      } else if (key === 'lesson') {
        value = item.lessons?.title || '';
      } else if (key === 'status') {
        value = item.status;
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
    return filteredProgress.slice(startIndex, endIndex);
  };

  const totalPages = Math.ceil(filteredProgress.length / itemsPerPage);

  const getStatusLabel = (status: string): string => {
    switch (status) {
      case 'completed':
        return 'Завершён';
      case 'skipped':
        return 'Пропущен';
      default:
        return status;
    }
  };

  const formatDate = (dateString: string | null): string => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString('ru-RU', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const truncateText = (text: string | null, maxLength: number = 100): string => {
    if (!text) return 'Нет ответа';
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength) + '...';
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
        <h1 className="admin-page-title">Прохождения курсов и уроков</h1>
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
      </div>

      <div className="admin-table-card">
        <table className="admin-table">
          <thead>
            <tr>
              <th>
                <div className="admin-table-header">
                  <span>Пользователь</span>
                  <button
                    className="admin-filter-btn"
                    onClick={() => setFilterMenus({ ...filterMenus, user_id: !filterMenus.user_id })}
                  >
                    🔽
                  </button>
                </div>
                {filterMenus.user_id && (
                  <div className="admin-filter-menu">
                    <input
                      type="text"
                      placeholder="Поиск по ID..."
                      className="admin-filter-search"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && e.currentTarget.value) {
                          toggleFilter('user_id', e.currentTarget.value);
                          e.currentTarget.value = '';
                        }
                      }}
                    />
                    <div className="admin-filter-options">
                      {getUniqueValues('user_id').slice(0, 20).map((val) => (
                        <label key={val} className="admin-filter-option">
                          <input
                            type="checkbox"
                            checked={filters.user_id?.has(val) || false}
                            onChange={() => toggleFilter('user_id', val)}
                          />
                          <span>{val}</span>
                        </label>
                      ))}
                    </div>
                    {filters.user_id && filters.user_id.size > 0 && (
                      <button
                        className="admin-filter-clear"
                        onClick={() => clearFilter('user_id')}
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
                      {courses.map((course) => (
                        <label key={course.id} className="admin-filter-option">
                          <input
                            type="checkbox"
                            checked={filters.course?.has(course.title) || false}
                            onChange={() => toggleFilter('course', course.title)}
                          />
                          <span>{course.title}</span>
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
                  <span>Урок</span>
                  <button
                    className="admin-filter-btn"
                    onClick={() => setFilterMenus({ ...filterMenus, lesson: !filterMenus.lesson })}
                  >
                    🔽
                  </button>
                </div>
                {filterMenus.lesson && (
                  <div className="admin-filter-menu">
                    <input
                      type="text"
                      placeholder="Поиск..."
                      className="admin-filter-search"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && e.currentTarget.value) {
                          toggleFilter('lesson', e.currentTarget.value);
                          e.currentTarget.value = '';
                        }
                      }}
                    />
                    <div className="admin-filter-options">
                      {lessons.map((lesson) => (
                        <label key={lesson.id} className="admin-filter-option">
                          <input
                            type="checkbox"
                            checked={filters.lesson?.has(lesson.title) || false}
                            onChange={() => toggleFilter('lesson', lesson.title)}
                          />
                          <span>{lesson.title}</span>
                        </label>
                      ))}
                    </div>
                    {filters.lesson && filters.lesson.size > 0 && (
                      <button
                        className="admin-filter-clear"
                        onClick={() => clearFilter('lesson')}
                      >
                        Очистить
                      </button>
                    )}
                  </div>
                )}
              </th>
              <th>
                <div className="admin-table-header">
                  <span>Статус</span>
                  <button
                    className="admin-filter-btn"
                    onClick={() => setFilterMenus({ ...filterMenus, status: !filterMenus.status })}
                  >
                    🔽
                  </button>
                </div>
                {filterMenus.status && (
                  <div className="admin-filter-menu">
                    <div className="admin-filter-options">
                      {getUniqueValues('status').map((val) => (
                        <label key={val} className="admin-filter-option">
                          <input
                            type="checkbox"
                            checked={filters.status?.has(val) || false}
                            onChange={() => toggleFilter('status', val)}
                          />
                          <span>{getStatusLabel(val)}</span>
                        </label>
                      ))}
                    </div>
                    {filters.status && filters.status.size > 0 && (
                      <button
                        className="admin-filter-clear"
                        onClick={() => clearFilter('status')}
                      >
                        Очистить
                      </button>
                    )}
                  </div>
                )}
              </th>
              <th>Ответ</th>
              <th>Фото</th>
              <th>Дата завершения</th>
              <th>Обновлено</th>
            </tr>
          </thead>
          <tbody>
            {getPaginatedData().length === 0 ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
                  {allProgress.length === 0 ? 'Нет данных о прохождениях' : 'Нет данных, соответствующих фильтрам'}
                </td>
              </tr>
            ) : (
              getPaginatedData().map((progress) => {
              const userName = progress.users
                ? [progress.users.first_name, progress.users.last_name]
                    .filter(Boolean)
                    .join(' ') || progress.users.username || `ID: ${progress.telegram_user_id}`
                : `ID: ${progress.telegram_user_id}`;

              const courseTitle = progress.lessons?.courses?.title || '-';
              const lessonTitle = progress.lessons?.title || '-';
              const hasAnswer = progress.user_answer && progress.user_answer.trim().length > 0;
              const answerPreview = truncateText(progress.user_answer, 100);

              return (
                <tr key={`${progress.telegram_user_id}-${progress.lesson_id}`}>
                  <td>{userName}</td>
                  <td>{courseTitle}</td>
                  <td>{lessonTitle}</td>
                  <td>
                    <span className={`status-badge status-${progress.status}`}>
                      {getStatusLabel(progress.status)}
                    </span>
                  </td>
                  <td>
                    {hasAnswer ? (
                      <div style={{ maxWidth: '300px' }}>
                        <div style={{ marginBottom: '4px' }}>{answerPreview}</div>
                        {progress.user_answer && progress.user_answer.length > 100 && (
                          <button
                            className="btn btn-sm btn-ghost"
                            onClick={() => setSelectedAnswer(progress.user_answer)}
                            style={{ fontSize: '12px', padding: '2px 8px' }}
                          >
                            Показать полностью
                          </button>
                        )}
                      </div>
                    ) : (
                      <span style={{ color: '#9ca3af' }}>Нет ответа</span>
                    )}
                  </td>
                  <td>
                    {progress.photo_url ? (
                      <div>
                        <img
                          src={progress.photo_url}
                          alt="Фото ответа"
                          style={{
                            width: '60px',
                            height: '60px',
                            objectFit: 'cover',
                            borderRadius: '4px',
                            cursor: 'pointer',
                          }}
                          onClick={() => setSelectedPhotoUrl(progress.photo_url!)}
                        />
                      </div>
                    ) : (
                      <span style={{ color: '#9ca3af' }}>-</span>
                    )}
                  </td>
                  <td>{formatDate(progress.completed_at)}</td>
                  <td>{formatDate(progress.updated_at)}</td>
                </tr>
              );
            })
            )}
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

      {/* Модальное окно для просмотра полного ответа */}
      {selectedAnswer && (
        <div className="modal-overlay" onClick={() => setSelectedAnswer(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '800px' }}>
            <div className="modal-header">
              <h2>Ответ пользователя</h2>
              <button className="modal-close" onClick={() => setSelectedAnswer(null)}>×</button>
            </div>
            <div className="modal-body">
              <div className="lesson-text-block" style={{ padding: '16px', background: '#f9fafb', borderRadius: '8px' }}>
                <ReactMarkdown remarkPlugins={[remarkBreaks]}>{selectedAnswer}</ReactMarkdown>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-primary" onClick={() => setSelectedAnswer(null)}>
                Закрыть
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Модальное окно для просмотра фото */}
      {selectedPhotoUrl && (
        <div className="modal-overlay" onClick={() => setSelectedPhotoUrl(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '90vw', maxHeight: '90vh', padding: '20px' }}>
            <div className="modal-header">
              <h2>Фото ответа</h2>
              <button className="modal-close" onClick={() => setSelectedPhotoUrl(null)}>×</button>
            </div>
            <div className="modal-body" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px' }}>
              <img
                src={selectedPhotoUrl}
                alt="Фото ответа"
                style={{
                  maxWidth: '100%',
                  maxHeight: '70vh',
                  borderRadius: '8px',
                  objectFit: 'contain',
                }}
              />
            </div>
            <div className="modal-footer">
              <button className="btn btn-primary" onClick={() => setSelectedPhotoUrl(null)}>
                Закрыть
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
