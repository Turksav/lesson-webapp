'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import ConsultationBookingModal from './ConsultationBookingModal';
import { formatCurrency } from '@/lib/currencyUtils';

export default function CoursesSection() {
  const [courses, setCourses] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [balance, setBalance] = useState<number>(0);
  const [currency, setCurrency] = useState<string>('RUB');
  const [activeCourse, setActiveCourse] = useState<any>(null);

  useEffect(() => {
    loadCourses();
    loadUserData();
    loadActiveCourse();
  }, []);

  const loadCourses = async () => {
    const { data, error } = await supabase
      .from('courses')
      .select('*')
      .order('id');
    if (!error) setCourses(data || []);
  };

  const loadUserData = async () => {
    const tg = (window as any)?.Telegram?.WebApp;
    const telegramUserId =
      (window as any).__telegramUserId ?? tg?.initDataUnsafe?.user?.id;

    if (!telegramUserId) {
      console.log('No telegram user ID, skipping balance load');
      return;
    }

    console.log('Loading balance for user:', telegramUserId);

    const { data: balanceData, error: balanceError } = await supabase
      .from('user_balance')
      .select('balance')
      .eq('telegram_user_id', Number(telegramUserId))
      .single();

    if (balanceError) {
      console.error('Error loading balance:', balanceError);
    } else {
      console.log('Balance data received:', balanceData);
      const balanceValue = balanceData?.balance ? Number(balanceData.balance) : 0;
      console.log('Setting balance to:', balanceValue);
      setBalance(balanceValue);
    }

    const { data: settingsData, error: settingsError } = await supabase
      .from('user_settings')
      .select('currency')
      .eq('telegram_user_id', Number(telegramUserId))
      .single();

    if (settingsError) {
      console.error('Error loading settings:', settingsError);
    } else if (settingsData) {
      setCurrency(settingsData.currency || 'RUB');
    }
  };

  const handleConsultation = () => {
    setIsModalOpen(true);
  };

  const handleDonate = () => {
    alert('Функция благодарности проекту будет доступна в ближайшее время.');
  };

  const handleModalSuccess = () => {
    loadUserData();
  };

  const loadActiveCourse = async () => {
    const tg = (window as any)?.Telegram?.WebApp;
    const telegramUserId =
      (window as any).__telegramUserId ?? tg?.initDataUnsafe?.user?.id;

    if (!telegramUserId) {
      return;
    }

    const { data, error } = await supabase
      .from('user_course_enrollments')
      .select('course_id, courses(title)')
      .eq('telegram_user_id', Number(telegramUserId))
      .eq('status', 'active')
      .single();

    if (!error && data) {
      setActiveCourse(data);
    }
  };

  if (courses.length === 0) {
    return (
      <>
        <p className="page-subtitle">Пока нет ни одного курса.</p>
        <div className="courses-actions">
          <button className="btn btn-primary" onClick={handleConsultation}>
            Записаться на личную консультацию
          </button>
          <button className="btn btn-ghost" onClick={handleDonate}>
            Благодарить проект
          </button>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="courses-list">
        {courses.map((course) => (
          <div key={course.id} className="course-card">
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
              {course.price !== undefined && course.price !== null && (
                <p className="course-price" style={{ marginTop: '8px', fontWeight: '600', color: '#6366f1' }}>
                  {formatCurrency(course.price, currency)}
                </p>
              )}
              {activeCourse && activeCourse.course_id !== course.id ? (
                <div style={{ marginTop: '12px', padding: '12px', background: '#fef2f2', borderRadius: '8px', color: '#dc2626' }}>
                  Вы уже проходите курс "{activeCourse.courses?.title}". Завершите его, чтобы начать новый.
                </div>
              ) : (
                <Link href={`/courses/${course.id}`} className="btn btn-primary" style={{ marginTop: '12px' }}>
                  Подробнее
                </Link>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Кнопки действий */}
      <div className="courses-actions">
        <button className="btn btn-primary" onClick={handleConsultation}>
          Записаться на личную консультацию
        </button>
        <button className="btn btn-ghost" onClick={handleDonate}>
          Благодарить проект
        </button>
      </div>

      {/* Модальное окно записи на консультацию */}
      <ConsultationBookingModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={handleModalSuccess}
        userBalance={balance}
        userCurrency={currency}
      />
    </>
  );
}
