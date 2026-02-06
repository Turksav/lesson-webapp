'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { formatCurrency } from '@/lib/currencyUtils';

interface Consultation {
  id: number;
  telegram_user_id: number;
  format: string;
  consultation_date: string;
  consultation_time: string;
  quantity: number;
  price: number;
  currency: string;
  comment: string | null;
  status: string;
  created_at: string;
  users?: {
    first_name: string | null;
    last_name: string | null;
    username: string | null;
    admin_note?: string | null;
  };
}

export default function AdminConsultationsPage() {
  const [allConsultations, setAllConsultations] = useState<Consultation[]>([]);
  const [filteredConsultations, setFilteredConsultations] = useState<Consultation[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState<Record<string, Set<string>>>({});
  const [filterMenus, setFilterMenus] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [savingNoteUserId, setSavingNoteUserId] = useState<number | null>(null);
  const [noteDraft, setNoteDraft] = useState<Record<number, string>>({});
  const itemsPerPage = 10;

  useEffect(() => {
    loadConsultations();
  }, []);

  const loadConsultations = async () => {
    // Загружаем консультации с данными пользователей
    const { data, error } = await supabase
      .from('consultations')
      .select(`
        *,
        users (
          first_name,
          last_name,
          username,
          admin_note
        )
      `)
      .order('consultation_date', { ascending: false })
      .order('consultation_time', { ascending: false });

    if (!error && data) {
      setAllConsultations(data);
    } else if (error) {
      console.error('Error loading consultations:', error);
      // Fallback: загружаем без JOIN и получаем данные пользователей отдельно
      const { data: fallbackData, error: fallbackError } = await supabase
        .from('consultations')
        .select('*')
        .order('consultation_date', { ascending: false })
        .order('consultation_time', { ascending: false });
      
      if (!fallbackError && fallbackData) {
        // Загружаем данные пользователей для каждой консультации
        const userIds = [...new Set(fallbackData.map(c => c.telegram_user_id))];
        const { data: usersData } = await supabase
          .from('users')
          .select('telegram_user_id, first_name, last_name, username, admin_note')
          .in('telegram_user_id', userIds);
        
        const usersMap = new Map(
          (usersData || []).map(u => [u.telegram_user_id, u])
        );
        
        const consultationsWithUsers = fallbackData.map(c => ({
          ...c,
          users: usersMap.get(c.telegram_user_id) || null,
        }));
        
        setAllConsultations(consultationsWithUsers);
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    applyFilters();
  }, [allConsultations, filters]);

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
    let filtered = [...allConsultations];

    // Применяем фильтры
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
          } else if (key === 'date') {
            value = new Date(item.consultation_date).toLocaleDateString('ru-RU');
          } else if (key === 'time') {
            value = item.consultation_time.slice(0, 5);
          } else if (key === 'format') {
            value = item.format;
          } else if (key === 'price') {
            value = formatCurrency(item.price * item.quantity, item.currency);
          } else if (key === 'comment') {
            value = (item.comment || '-').toLowerCase();
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

    // Сортировка по дате и времени (по убыванию)
    filtered.sort((a, b) => {
      const dateA = new Date(`${a.consultation_date}T${a.consultation_time}`);
      const dateB = new Date(`${b.consultation_date}T${b.consultation_time}`);
      return dateB.getTime() - dateA.getTime();
    });

    setFilteredConsultations(filtered);
    setCurrentPage(1); // Сбрасываем на первую страницу при изменении фильтров
  };

  const getUniqueValues = (key: string): string[] => {
    const values = new Set<string>();
    allConsultations.forEach((item) => {
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
      } else if (key === 'date') {
        value = new Date(item.consultation_date).toLocaleDateString('ru-RU');
      } else if (key === 'time') {
        value = item.consultation_time.slice(0, 5);
      } else if (key === 'format') {
        value = item.format;
      } else if (key === 'price') {
        value = formatCurrency(item.price * item.quantity, item.currency);
      } else if (key === 'comment') {
        value = item.comment || '-';
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
    return filteredConsultations.slice(startIndex, endIndex);
  };

  const totalPages = Math.ceil(filteredConsultations.length / itemsPerPage);

  const isConsultationPast = (consultation: Consultation): boolean => {
    const consultationDateTime = new Date(
      `${consultation.consultation_date}T${consultation.consultation_time}`
    );
    return consultationDateTime < new Date();
  };

  const handleCancelConsultation = async (consultationId: number) => {
    if (!confirm('Отменить консультацию? Средства будут возвращены на баланс клиента.')) {
      return;
    }

    try {
      const { error } = await supabase.rpc('admin_cancel_consultation', {
        p_consultation_id: consultationId,
      });

      if (error) throw error;

      alert('Консультация отменена. Средства возвращены на баланс клиента.');
      loadConsultations();
    } catch (error: any) {
      alert('Ошибка: ' + error.message);
    }
  };

  const handleDeleteConsultation = async (consultationId: number) => {
    if (!confirm('Удалить консультацию? Это действие нельзя отменить.')) {
      return;
    }

    try {
      const { error } = await supabase.rpc('admin_delete_consultation', {
        p_consultation_id: consultationId,
      });

      if (error) throw error;

      alert('Консультация удалена.');
      loadConsultations();
    } catch (error: any) {
      alert('Ошибка: ' + error.message);
    }
  };

  const getStatusLabel = (status: string): string => {
    switch (status) {
      case 'pending':
        return 'Ожидает подтверждения';
      case 'confirmed':
        return 'Подтверждена';
      case 'completed':
        return 'Завершена';
      case 'cancelled':
        return 'Отменена';
      default:
        return status;
    }
  };

  // Список клиентов: уникальные пользователи из консультаций + агрегаты
  const getClientsList = (): Array<{
    telegram_user_id: number;
    name: string;
    admin_note: string | null;
    completedCount: number;
    totalPaidText: string;
    username: string | null;
  }> => {
    const userIds = [...new Set(allConsultations.map(c => c.telegram_user_id))];
    return userIds.map(telegram_user_id => {
      const cons = allConsultations.filter(c => c.telegram_user_id === telegram_user_id);
      const first = cons[0];
      const u = first?.users;
      const name = u
        ? [u.first_name, u.last_name].filter(Boolean).join(' ') || u.username || `ID ${telegram_user_id}`
        : `ID ${telegram_user_id}`;
      const completedCount = cons.filter(c => c.status !== 'cancelled').length;
      const paidByCurrency: Record<string, number> = {};
      cons.filter(c => c.status !== 'cancelled').forEach(c => {
        const key = c.currency || 'RUB';
        paidByCurrency[key] = (paidByCurrency[key] || 0) + c.price * c.quantity;
      });
      const totalPaidText = Object.entries(paidByCurrency)
        .map(([cur, sum]) => formatCurrency(sum, cur))
        .join(' / ') || '—';
      return {
        telegram_user_id,
        name,
        admin_note: u?.admin_note ?? null,
        completedCount,
        totalPaidText,
        username: u?.username ?? null,
      };
    }).sort((a, b) => a.name.localeCompare(b.name, 'ru'));
  };

  const handleSaveClientNote = async (telegramUserId: number, newNote: string | null) => {
    setSavingNoteUserId(telegramUserId);
    try {
      const { error } = await supabase.rpc('update_user_admin_note', {
        p_telegram_user_id: telegramUserId,
        p_admin_note: newNote || '',
      });
      if (error) throw error;
      setAllConsultations(prev =>
        prev.map(c =>
          c.telegram_user_id === telegramUserId && c.users
            ? { ...c, users: { ...c.users, admin_note: newNote || null } }
            : c
        )
      );
      setNoteDraft(prev => {
        const next = { ...prev };
        delete next[telegramUserId];
        return next;
      });
    } catch (err: any) {
      alert('Ошибка сохранения примечания: ' + err?.message);
    } finally {
      setSavingNoteUserId(null);
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
        <h1 className="admin-page-title">Консультации</h1>
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

      <div className="admin-table-card" style={{ marginBottom: '24px' }}>
        <h2 style={{ marginBottom: '12px', fontSize: '1.1rem' }}>Клиенты</h2>
        <table className="admin-table">
          <thead>
            <tr>
              <th>Имя</th>
              <th>Примечание</th>
              <th>Прошло консультаций</th>
              <th>Оплачено за консультации</th>
              <th>Чат</th>
            </tr>
          </thead>
          <tbody>
            {getClientsList().map((client) => {
              const chatHref = client.username
                ? `https://t.me/${client.username.replace('@', '')}`
                : null;
              const noteValue = noteDraft[client.telegram_user_id] ?? client.admin_note ?? '';
              const isSaving = savingNoteUserId === client.telegram_user_id;
              return (
                <tr key={client.telegram_user_id}>
                  <td>{client.name}</td>
                  <td style={{ minWidth: '200px' }}>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                      <input
                        type="text"
                        value={noteValue}
                        onChange={(e) => setNoteDraft((prev) => ({ ...prev, [client.telegram_user_id]: e.target.value }))}
                        className="form-input"
                        placeholder="Примечание..."
                        style={{ flex: 1, minWidth: '120px' }}
                        disabled={isSaving}
                      />
                      <button
                        type="button"
                        className="btn btn-sm btn-ghost"
                        onClick={() => handleSaveClientNote(client.telegram_user_id, noteValue.trim() || null)}
                        disabled={isSaving}
                      >
                        {isSaving ? '…' : 'Сохранить'}
                      </button>
                    </div>
                  </td>
                  <td>{client.completedCount}</td>
                  <td>{client.totalPaidText}</td>
                  <td>
                    {chatHref ? (
                      <a
                        href={chatHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-sm btn-ghost"
                        style={{ textDecoration: 'none' }}
                      >
                        Чат
                      </a>
                    ) : (
                      <span style={{ color: '#9ca3af', fontSize: '12px' }}>Нет username</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="admin-table-card">
        <table className="admin-table">
          <thead>
            <tr>
              <th>
                <div className="admin-table-header">
                  <span>User ID</span>
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
                      placeholder="Поиск..."
                      className="admin-filter-search"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && e.currentTarget.value) {
                          toggleFilter('user_id', e.currentTarget.value);
                          e.currentTarget.value = '';
                        }
                      }}
                    />
                    <div className="admin-filter-options">
                      {getUniqueValues('user_id').map((val) => (
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
                  <span>Имя пользователя</span>
                  <button
                    className="admin-filter-btn"
                    onClick={() => setFilterMenus({ ...filterMenus, user_name: !filterMenus.user_name })}
                  >
                    🔽
                  </button>
                </div>
                {filterMenus.user_name && (
                  <div className="admin-filter-menu">
                    <input
                      type="text"
                      placeholder="Поиск..."
                      className="admin-filter-search"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && e.currentTarget.value) {
                          toggleFilter('user_name', e.currentTarget.value);
                          e.currentTarget.value = '';
                        }
                      }}
                    />
                    <div className="admin-filter-options">
                      {getUniqueValues('user_name').map((val) => (
                        <label key={val} className="admin-filter-option">
                          <input
                            type="checkbox"
                            checked={filters.user_name?.has(val) || false}
                            onChange={() => toggleFilter('user_name', val)}
                          />
                          <span>{val || 'Не указано'}</span>
                        </label>
                      ))}
                    </div>
                    {filters.user_name && filters.user_name.size > 0 && (
                      <button
                        className="admin-filter-clear"
                        onClick={() => clearFilter('user_name')}
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
                  <span>Время</span>
                  <button
                    className="admin-filter-btn"
                    onClick={() => setFilterMenus({ ...filterMenus, time: !filterMenus.time })}
                  >
                    🔽
                  </button>
                </div>
                {filterMenus.time && (
                  <div className="admin-filter-menu">
                    <input
                      type="text"
                      placeholder="Поиск..."
                      className="admin-filter-search"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && e.currentTarget.value) {
                          toggleFilter('time', e.currentTarget.value);
                          e.currentTarget.value = '';
                        }
                      }}
                    />
                    <div className="admin-filter-options">
                      {getUniqueValues('time').map((val) => (
                        <label key={val} className="admin-filter-option">
                          <input
                            type="checkbox"
                            checked={filters.time?.has(val) || false}
                            onChange={() => toggleFilter('time', val)}
                          />
                          <span>{val}</span>
                        </label>
                      ))}
                    </div>
                    {filters.time && filters.time.size > 0 && (
                      <button
                        className="admin-filter-clear"
                        onClick={() => clearFilter('time')}
                      >
                        Очистить
                      </button>
                    )}
                  </div>
                )}
              </th>
              <th>
                <div className="admin-table-header">
                  <span>Формат</span>
                  <button
                    className="admin-filter-btn"
                    onClick={() => setFilterMenus({ ...filterMenus, format: !filterMenus.format })}
                  >
                    🔽
                  </button>
                </div>
                {filterMenus.format && (
                  <div className="admin-filter-menu">
                    <input
                      type="text"
                      placeholder="Поиск..."
                      className="admin-filter-search"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && e.currentTarget.value) {
                          toggleFilter('format', e.currentTarget.value);
                          e.currentTarget.value = '';
                        }
                      }}
                    />
                    <div className="admin-filter-options">
                      {getUniqueValues('format').map((val) => (
                        <label key={val} className="admin-filter-option">
                          <input
                            type="checkbox"
                            checked={filters.format?.has(val) || false}
                            onChange={() => toggleFilter('format', val)}
                          />
                          <span>{val}</span>
                        </label>
                      ))}
                    </div>
                    {filters.format && filters.format.size > 0 && (
                      <button
                        className="admin-filter-clear"
                        onClick={() => clearFilter('format')}
                      >
                        Очистить
                      </button>
                    )}
                  </div>
                )}
              </th>
              <th>
                <div className="admin-table-header">
                  <span>Цена</span>
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
              <th>
                <div className="admin-table-header">
                  <span>Комментарий</span>
                  <button
                    className="admin-filter-btn"
                    onClick={() => setFilterMenus({ ...filterMenus, comment: !filterMenus.comment })}
                  >
                    🔽
                  </button>
                </div>
                {filterMenus.comment && (
                  <div className="admin-filter-menu">
                    <input
                      type="text"
                      placeholder="Поиск..."
                      className="admin-filter-search"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && e.currentTarget.value) {
                          toggleFilter('comment', e.currentTarget.value);
                          e.currentTarget.value = '';
                        }
                      }}
                    />
                    {filters.comment && filters.comment.size > 0 && (
                      <button
                        className="admin-filter-clear"
                        onClick={() => clearFilter('comment')}
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
                    <input
                      type="text"
                      placeholder="Поиск..."
                      className="admin-filter-search"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && e.currentTarget.value) {
                          toggleFilter('status', e.currentTarget.value);
                          e.currentTarget.value = '';
                        }
                      }}
                    />
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
              <th>Telegram</th>
              <th>Действия</th>
            </tr>
          </thead>
          <tbody>
            {getPaginatedData().map((consultation) => {
              const userName = consultation.users
                ? [consultation.users.first_name, consultation.users.last_name]
                    .filter(Boolean)
                    .join(' ') || consultation.users.username || 'Не указано'
                : 'Не указано';
              
              const telegramUsername = consultation.users?.username;
              const telegramLink = telegramUsername 
                ? `https://t.me/${telegramUsername.replace('@', '')}`
                : null;
              
              const isPast = isConsultationPast(consultation);
              
              return (
                <tr key={consultation.id} style={isPast ? { color: '#6b7280' } : {}}>
                  <td>{consultation.telegram_user_id}</td>
                  <td>{userName}</td>
                  <td>{new Date(consultation.consultation_date).toLocaleDateString('ru-RU')}</td>
                  <td>{consultation.consultation_time.slice(0, 5)}</td>
                  <td>{consultation.format}</td>
                  <td>{formatCurrency(consultation.price * consultation.quantity, consultation.currency)}</td>
                  <td>{consultation.comment || '-'}</td>
                  <td>
                    <span className={`status-badge status-${consultation.status}`}>
                      {getStatusLabel(consultation.status)}
                    </span>
                  </td>
                  <td>
                    {telegramLink ? (
                      <a
                        href={telegramLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-sm btn-ghost"
                        style={{ textDecoration: 'none' }}
                      >
                        💬 Чат
                      </a>
                    ) : (
                      <span style={{ color: '#9ca3af', fontSize: '12px' }}>Нет username</span>
                    )}
                  </td>
                  <td>
                    {consultation.status !== 'cancelled' && !isPast && (
                      <button
                        className="btn btn-sm btn-ghost"
                        onClick={() => handleCancelConsultation(consultation.id)}
                        style={{ color: '#dc2626' }}
                      >
                        Отменить
                      </button>
                    )}
                    {consultation.status === 'cancelled' && (
                      <button
                        className="btn btn-sm btn-ghost"
                        onClick={() => handleDeleteConsultation(consultation.id)}
                        style={{ color: '#000000' }}
                      >
                        Del
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
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
