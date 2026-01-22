'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

interface Slot {
  id: number;
  date: string;
  start_time: string;
  end_time: string;
  is_available: boolean;
}

export default function AdminSlotsPage() {
  const [allSlots, setAllSlots] = useState<Slot[]>([]);
  const [filteredSlots, setFilteredSlots] = useState<Slot[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState<Record<string, Set<string>>>({});
  const [filterMenus, setFilterMenus] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({
    date: '',
    start_time: '',
    end_time: '',
    is_available: true,
  });
  const itemsPerPage = 10;

  useEffect(() => {
    loadSlots();
  }, []);

  const loadSlots = async () => {
    const { data, error } = await supabase
      .from('consultation_slots')
      .select('*')
      .order('id', { ascending: false });

    if (!error && data) {
      setAllSlots(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    applyFilters();
  }, [allSlots, filters]);

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
    let filtered = [...allSlots];

    Object.keys(filters).forEach((key) => {
      const filterValues = filters[key];
      if (filterValues.size > 0) {
        filtered = filtered.filter((item) => {
          let value: string;
          if (key === 'id') {
            value = item.id.toString();
          } else if (key === 'date') {
            value = new Date(item.date).toLocaleDateString('ru-RU');
          } else if (key === 'start_time') {
            value = item.start_time.slice(0, 5);
          } else if (key === 'end_time') {
            value = item.end_time.slice(0, 5);
          } else if (key === 'is_available') {
            value = item.is_available ? 'Да' : 'Нет';
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
    setFilteredSlots(filtered);
    setCurrentPage(1);
  };

  const getUniqueValues = (key: string): string[] => {
    const values = new Set<string>();
    allSlots.forEach((item) => {
      let value: string;
      if (key === 'id') {
        value = item.id.toString();
      } else if (key === 'date') {
        value = new Date(item.date).toLocaleDateString('ru-RU');
      } else if (key === 'start_time') {
        value = item.start_time.slice(0, 5);
      } else if (key === 'end_time') {
        value = item.end_time.slice(0, 5);
      } else if (key === 'is_available') {
        value = item.is_available ? 'Да' : 'Нет';
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
    return filteredSlots.slice(startIndex, endIndex);
  };

  const totalPages = Math.ceil(filteredSlots.length / itemsPerPage);

  const handleEdit = (slot: Slot) => {
    setEditingId(slot.id);
    setIsCreating(false);
    // Обрезаем минуты, оставляем только часы (HH:00)
    const startTime = slot.start_time.slice(0, 2) + ':00';
    const endTime = slot.end_time.slice(0, 2) + ':00';
    setFormData({
      date: slot.date,
      start_time: startTime,
      end_time: endTime,
      is_available: slot.is_available,
    });
  };

  const handleCancel = () => {
    setEditingId(null);
    setIsCreating(false);
    setFormData({ date: '', start_time: '', end_time: '', is_available: true });
  };

  const handleSave = async () => {
    if (!formData.date || !formData.start_time || !formData.end_time) {
      alert('Заполните все поля');
      return;
    }

    try {
      const { error } = await supabase.rpc('create_or_update_consultation_slot', {
        p_id: editingId || null,
        p_date: formData.date,
        p_start_time: formData.start_time,
        p_end_time: formData.end_time,
        p_is_available: formData.is_available,
      });

      if (error) throw error;

      handleCancel();
      loadSlots();
    } catch (error: any) {
      alert('Ошибка: ' + error.message);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Удалить слот?')) return;

    try {
      const { error } = await supabase.rpc('delete_consultation_slot', {
        p_id: id,
      });
      if (error) throw error;
      loadSlots();
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
        <h1 className="admin-page-title">Управление слотами</h1>
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
              setFormData({ date: '', start_time: '', end_time: '', is_available: true });
            }}
          >
            + Добавить слот
          </button>
        </div>
      </div>

      {(isCreating || editingId !== null) && (
        <div className="admin-form-card">
          <h2>{editingId ? 'Редактировать слот' : 'Создать слот'}</h2>
          <div className="form-group">
            <label>Дата *</label>
            <input
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              className="form-input"
              required
            />
          </div>
          <div className="form-group">
            <label>Время начала *</label>
            <select
              value={formData.start_time}
              onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
              className="form-select"
              required
            >
              <option value="">Выберите время</option>
              {Array.from({ length: 24 }, (_, i) => {
                const hour = i.toString().padStart(2, '0');
                return (
                  <option key={i} value={`${hour}:00`}>
                    {hour}:00
                  </option>
                );
              })}
            </select>
          </div>
          <div className="form-group">
            <label>Время окончания *</label>
            <select
              value={formData.end_time}
              onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
              className="form-select"
              required
            >
              <option value="">Выберите время</option>
              {Array.from({ length: 24 }, (_, i) => {
                const hour = i.toString().padStart(2, '0');
                return (
                  <option key={i} value={`${hour}:00`}>
                    {hour}:00
                  </option>
                );
              })}
            </select>
          </div>
          <div className="form-group">
            <label>
              <input
                type="checkbox"
                checked={formData.is_available}
                onChange={(e) => setFormData({ ...formData, is_available: e.target.checked })}
              />
              Доступен для записи
            </label>
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
                  <span>Дата</span>
                  <button
                    className="admin-filter-btn"
                    onClick={() => setFilterMenus({ ...filterMenus, date: !filterMenus.date })}
                  >
                    🔽
                  </button>
                </div>
                {filterMenus.date && (
                  <div className="admin-filter-menu">
                    <input
                      type="text"
                      placeholder="Поиск..."
                      className="admin-filter-search"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && e.currentTarget.value) {
                          toggleFilter('date', e.currentTarget.value);
                          e.currentTarget.value = '';
                        }
                      }}
                    />
                    <div className="admin-filter-options">
                      {getUniqueValues('date').map((val) => (
                        <label key={val} className="admin-filter-option">
                          <input
                            type="checkbox"
                            checked={filters.date?.has(val) || false}
                            onChange={() => toggleFilter('date', val)}
                          />
                          <span>{val}</span>
                        </label>
                      ))}
                    </div>
                    {filters.date && filters.date.size > 0 && (
                      <button
                        className="admin-filter-clear"
                        onClick={() => clearFilter('date')}
                      >
                        Очистить
                      </button>
                    )}
                  </div>
                )}
              </th>
              <th>
                <div className="admin-table-header">
                  <span>Время начала</span>
                  <button
                    className="admin-filter-btn"
                    onClick={() => setFilterMenus({ ...filterMenus, start_time: !filterMenus.start_time })}
                  >
                    🔽
                  </button>
                </div>
                {filterMenus.start_time && (
                  <div className="admin-filter-menu">
                    <input
                      type="text"
                      placeholder="Поиск..."
                      className="admin-filter-search"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && e.currentTarget.value) {
                          toggleFilter('start_time', e.currentTarget.value);
                          e.currentTarget.value = '';
                        }
                      }}
                    />
                    <div className="admin-filter-options">
                      {getUniqueValues('start_time').map((val) => (
                        <label key={val} className="admin-filter-option">
                          <input
                            type="checkbox"
                            checked={filters.start_time?.has(val) || false}
                            onChange={() => toggleFilter('start_time', val)}
                          />
                          <span>{val}</span>
                        </label>
                      ))}
                    </div>
                    {filters.start_time && filters.start_time.size > 0 && (
                      <button
                        className="admin-filter-clear"
                        onClick={() => clearFilter('start_time')}
                      >
                        Очистить
                      </button>
                    )}
                  </div>
                )}
              </th>
              <th>
                <div className="admin-table-header">
                  <span>Время окончания</span>
                  <button
                    className="admin-filter-btn"
                    onClick={() => setFilterMenus({ ...filterMenus, end_time: !filterMenus.end_time })}
                  >
                    🔽
                  </button>
                </div>
                {filterMenus.end_time && (
                  <div className="admin-filter-menu">
                    <input
                      type="text"
                      placeholder="Поиск..."
                      className="admin-filter-search"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && e.currentTarget.value) {
                          toggleFilter('end_time', e.currentTarget.value);
                          e.currentTarget.value = '';
                        }
                      }}
                    />
                    <div className="admin-filter-options">
                      {getUniqueValues('end_time').map((val) => (
                        <label key={val} className="admin-filter-option">
                          <input
                            type="checkbox"
                            checked={filters.end_time?.has(val) || false}
                            onChange={() => toggleFilter('end_time', val)}
                          />
                          <span>{val}</span>
                        </label>
                      ))}
                    </div>
                    {filters.end_time && filters.end_time.size > 0 && (
                      <button
                        className="admin-filter-clear"
                        onClick={() => clearFilter('end_time')}
                      >
                        Очистить
                      </button>
                    )}
                  </div>
                )}
              </th>
              <th>
                <div className="admin-table-header">
                  <span>Доступен</span>
                  <button
                    className="admin-filter-btn"
                    onClick={() => setFilterMenus({ ...filterMenus, is_available: !filterMenus.is_available })}
                  >
                    🔽
                  </button>
                </div>
                {filterMenus.is_available && (
                  <div className="admin-filter-menu">
                    <div className="admin-filter-options">
                      {getUniqueValues('is_available').map((val) => (
                        <label key={val} className="admin-filter-option">
                          <input
                            type="checkbox"
                            checked={filters.is_available?.has(val) || false}
                            onChange={() => toggleFilter('is_available', val)}
                          />
                          <span>{val}</span>
                        </label>
                      ))}
                    </div>
                    {filters.is_available && filters.is_available.size > 0 && (
                      <button
                        className="admin-filter-clear"
                        onClick={() => clearFilter('is_available')}
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
            {getPaginatedData().map((slot) => (
              <tr key={slot.id}>
                <td>{slot.id}</td>
                <td>{new Date(slot.date).toLocaleDateString('ru-RU')}</td>
                <td>{slot.start_time.slice(0, 5)}</td>
                <td>{slot.end_time.slice(0, 5)}</td>
                <td>{slot.is_available ? 'Да' : 'Нет'}</td>
                <td>
                  <button
                    className="btn btn-sm btn-ghost"
                    onClick={() => handleEdit(slot)}
                  >
                    Редактировать
                  </button>
                  <button
                    className="btn btn-sm btn-ghost"
                    onClick={() => handleDelete(slot.id)}
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
