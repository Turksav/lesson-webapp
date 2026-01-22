'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

interface Consultation {
  consultation_date: string;
  consultation_time: string;
  status: string;
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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
    loadConsultations();
    loadSlots();
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
    </div>
  );
}
