'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { formatCurrency } from '@/lib/currencyUtils';

interface Consultation {
  consultation_date: string;
  consultation_time: string;
  status: string;
}

interface UpcomingConsultation {
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
  users?: {
    first_name: string | null;
    last_name: string | null;
    username: string | null;
  } | null;
}

interface Slot {
  date: string;
  start_time: string;
  end_time: string;
  is_available: boolean;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    courses: 0,
    consultations: 0,
    pendingConsultations: 0,
    slots: 0,
  });
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [upcomingConsultations, setUpcomingConsultations] = useState<UpcomingConsultation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
    loadConsultations();
    loadSlots();
    loadUpcomingConsultations();
  }, []);

  const loadStats = async () => {
    try {
      const [coursesRes, consultationsRes, slotsRes] = await Promise.all([
        supabase.from('courses').select('id', { count: 'exact' }),
        supabase.from('consultations').select('id, status', { count: 'exact' }),
        supabase.from('consultation_slots').select('id', { count: 'exact' }),
      ]);

      const consultationsData = consultationsRes.data || [];
      const pendingConsultations = consultationsData.filter((c: any) => c.status === 'pending').length;

      setStats({
        courses: coursesRes.count || 0,
        consultations: consultationsRes.count || 0,
        pendingConsultations,
        slots: slotsRes.count || 0,
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadConsultations = async () => {
    try {
      const today = new Date();
      const tenDaysLater = new Date();
      tenDaysLater.setDate(today.getDate() + 10);

      const { data, error } = await supabase
        .from('consultations')
        .select('consultation_date, consultation_time, status')
        .gte('consultation_date', today.toISOString().split('T')[0])
        .lte('consultation_date', tenDaysLater.toISOString().split('T')[0])
        .in('status', ['pending', 'confirmed'])
        .order('consultation_date', { ascending: true })
        .order('consultation_time', { ascending: true });

      if (!error && data) {
        setConsultations(data);
      }
    } catch (error) {
      console.error('Error loading consultations:', error);
    }
  };

  const loadSlots = async () => {
    try {
      const today = new Date();
      const tenDaysLater = new Date();
      tenDaysLater.setDate(today.getDate() + 10);

      const { data, error } = await supabase
        .from('consultation_slots')
        .select('date, start_time, end_time, is_available')
        .gte('date', today.toISOString().split('T')[0])
        .lte('date', tenDaysLater.toISOString().split('T')[0])
        .eq('is_available', true)
        .order('date', { ascending: true })
        .order('start_time', { ascending: true });

      if (!error && data) {
        setSlots(data);
      }
    } catch (error) {
      console.error('Error loading slots:', error);
    }
  };

  const loadUpcomingConsultations = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('consultations')
        .select(`
          id,
          telegram_user_id,
          format,
          consultation_date,
          consultation_time,
          quantity,
          price,
          currency,
          comment,
          status,
          users (
            first_name,
            last_name,
            username
          )
        `)
        .gte('consultation_date', today)
        .in('status', ['pending', 'confirmed'])
        .order('consultation_date', { ascending: true })
        .order('consultation_time', { ascending: true });

      if (!error && data) {
        const now = new Date();
        const future = (data as UpcomingConsultation[]).filter(
          (c) => new Date(`${c.consultation_date}T${c.consultation_time}`) >= now
        );
        setUpcomingConsultations(future);
      } else if (error) {
        const { data: fallback } = await supabase
          .from('consultations')
          .select('id, telegram_user_id, format, consultation_date, consultation_time, quantity, price, currency, comment, status')
          .gte('consultation_date', today)
          .in('status', ['pending', 'confirmed'])
          .order('consultation_date', { ascending: true })
          .order('consultation_time', { ascending: true });
        if (fallback && fallback.length > 0) {
          const userIds = [...new Set(fallback.map((c: any) => c.telegram_user_id))];
          const { data: usersData } = await supabase
            .from('users')
            .select('telegram_user_id, first_name, last_name, username')
            .in('telegram_user_id', userIds);
          const usersMap = new Map((usersData || []).map((u: any) => [u.telegram_user_id, u]));
          const now = new Date();
          const merged = (fallback as UpcomingConsultation[]).filter(
            (c) => new Date(`${c.consultation_date}T${c.consultation_time}`) >= now
          ).map((c) => ({ ...c, users: usersMap.get(c.telegram_user_id) || null }));
          setUpcomingConsultations(merged);
        } else {
          setUpcomingConsultations([]);
        }
      }
    } catch (err) {
      console.error('Error loading upcoming consultations:', err);
      setUpcomingConsultations([]);
    }
  };

  const getDaysArray = () => {
    const days = [];
    const today = new Date();
    for (let i = 0; i < 10; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      days.push(date);
    }
    return days;
  };

  const getConsultationsForDate = (date: Date): Consultation[] => {
    const dateStr = date.toISOString().split('T')[0];
    return consultations.filter((c) => c.consultation_date === dateStr);
  };

  const getSlotsForDate = (date: Date): Slot[] => {
    const dateStr = date.toISOString().split('T')[0];
    return slots.filter((s) => s.date === dateStr && s.is_available);
  };

  const isHourInSlot = (date: Date, hour: number): boolean => {
    const slotsForDate = getSlotsForDate(date);
    const hourStr = hour.toString().padStart(2, '0') + ':00';
    
    return slotsForDate.some((slot) => {
      const startHour = parseInt(slot.start_time.split(':')[0]);
      const endHour = parseInt(slot.end_time.split(':')[0]);
      // Проверяем, попадает ли час в диапазон слота (не включая end_time)
      return hour >= startHour && hour < endHour;
    });
  };

  const getHourStatus = (date: Date, hour: number): 'busy' | 'free' | 'unavailable' => {
    const consultationsForDate = getConsultationsForDate(date);
    const hourStr = hour.toString().padStart(2, '0') + ':00';
    
    // Проверяем, есть ли консультация на этот час
    const hasConsultation = consultationsForDate.some((c) => c.consultation_time.startsWith(hourStr));
    if (hasConsultation) {
      return 'busy';
    }
    
    // Проверяем, есть ли этот час в слотах
    const inSlot = isHourInSlot(date, hour);
    if (inSlot) {
      return 'free';
    }
    
    // Если нет ни консультации, ни слота - недоступен
    return 'unavailable';
  };

  const getStatusLabel = (status: string): string => {
    switch (status) {
      case 'pending': return 'Ожидает подтверждения';
      case 'confirmed': return 'Подтверждена';
      case 'completed': return 'Завершена';
      case 'cancelled': return 'Отменена';
      default: return status;
    }
  };

  if (loading) {
    return (
      <div className="admin-page">
        <h1 className="admin-page-title">Загрузка...</h1>
      </div>
    );
  }

  const days = getDaysArray();

  return (
    <div className="admin-page">
      <h1 className="admin-page-title">Панель управления</h1>

  

      <div className="admin-calendar-section">
        <h2 className="admin-calendar-title">Календарь консультаций (ближайшие 10 дней)</h2>
        <div className="admin-calendar">
          {days.map((day, dayIndex) => {
            const consultationsForDay = getConsultationsForDate(day);
            const isToday = dayIndex === 0;
            
            return (
              <div key={dayIndex} className={`admin-calendar-day ${isToday ? 'today' : ''}`}>
                <div className="admin-calendar-day-header">
                  <div className="admin-calendar-day-name">
                    {day.toLocaleDateString('ru-RU', { weekday: 'short' })}
                  </div>
                  <div className="admin-calendar-day-date">
                    {day.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
                  </div>
                  {isToday && <span className="admin-calendar-today-badge">Сегодня</span>}
                </div>
                <div className="admin-calendar-hours">
                  {Array.from({ length: 24 }, (_, hour) => {
                    const status = getHourStatus(day, hour);
                    const statusLabels = {
                      busy: 'Занято',
                      free: 'Свободно',
                      unavailable: 'Недоступно',
                    };
                    return (
                      <div
                        key={hour}
                        className={`admin-calendar-hour ${status}`}
                        title={`${hour.toString().padStart(2, '0')}:00 - ${statusLabels[status]}`}
                      >
                        {hour.toString().padStart(2, '0')}
                      </div>
                    );
                  })}
                </div>
                {consultationsForDay.length > 0 && (
                  <div className="admin-calendar-consultations-count">
                    {consultationsForDay.length} консультация(ий)
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="admin-table-card" style={{ marginTop: '24px' }}>
        <h2 className="admin-calendar-title" style={{ marginBottom: '12px' }}>Предстоящие консультации</h2>
        <table className="admin-table">
          <thead>
            <tr>
              <th>User ID</th>
              <th>Имя</th>
              <th>Дата</th>
              <th>Время</th>
              <th>Формат</th>
              <th>Цена</th>
              <th>Комментарий</th>
              <th>Статус</th>
              <th>Telegram</th>
            </tr>
          </thead>
          <tbody>
            {upcomingConsultations.length === 0 ? (
              <tr>
                <td colSpan={9} style={{ textAlign: 'center', padding: '16px', color: '#6b7280' }}>
                  Нет предстоящих консультаций
                </td>
              </tr>
            ) : (
              upcomingConsultations.map((c) => {
                const userName = c.users
                  ? [c.users.first_name, c.users.last_name].filter(Boolean).join(' ') || c.users.username || '—'
                  : '—';
                const chatHref = c.users?.username
                  ? `https://t.me/${String(c.users.username).replace('@', '')}`
                  : null;
                return (
                  <tr key={c.id}>
                    <td>{c.telegram_user_id}</td>
                    <td>{userName}</td>
                    <td>{new Date(c.consultation_date).toLocaleDateString('ru-RU')}</td>
                    <td>{c.consultation_time.slice(0, 5)}</td>
                    <td>{c.format}</td>
                    <td>{formatCurrency(c.price * c.quantity, c.currency)}</td>
                    <td>{c.comment || '—'}</td>
                    <td>
                      <span className={`status-badge status-${c.status}`}>
                        {getStatusLabel(c.status)}
                      </span>
                    </td>
                    <td>
                      {chatHref ? (
                        <a href={chatHref} target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-ghost" style={{ textDecoration: 'none' }}>
                          Чат
                        </a>
                      ) : (
                        <span style={{ color: '#9ca3af', fontSize: '12px' }}>—</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
