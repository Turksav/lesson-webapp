'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import ConsultationBookingModal from './ConsultationBookingModal';

export default function CoursesSection() {
  const [courses, setCourses] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [balance, setBalance] = useState<number>(0);
  const [currency, setCurrency] = useState<string>('RUB');

  useEffect(() => {
    loadCourses();
    loadUserData();
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
              <Link href={`/courses/${course.id}`} className="btn btn-primary">
                Подробнее
              </Link>
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
