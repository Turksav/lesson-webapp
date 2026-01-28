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
  const [enrollments, setEnrollments] = useState<Map<number, any>>(new Map());

  useEffect(() => {
    loadCourses();
    loadUserData();
    loadActiveCourse();
    loadEnrollments();
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
    loadEnrollments();
    loadActiveCourse();
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
      .maybeSingle();

    // Если строки нет — maybeSingle вернёт data=null; это нормальный кейс.
    if (error) {
      console.warn('loadActiveCourse error:', error);
      setActiveCourse(null);
      return;
    }

    if (data) {
      setActiveCourse(data);
    } else {
      setActiveCourse(null);
    }
  };

  const loadEnrollments = async () => {
    const tg = (window as any)?.Telegram?.WebApp;
    const telegramUserId =
      (window as any).__telegramUserId ?? tg?.initDataUnsafe?.user?.id;

    if (!telegramUserId) {
      return;
    }

    const { data, error } = await supabase
      .from('user_course_enrollments')
      .select('course_id, status')
      .eq('telegram_user_id', Number(telegramUserId));

    if (error) {
      console.warn('loadEnrollments error:', error);
      return;
    }

    if (data) {
      const enrollmentMap = new Map(
        data.map((e: any) => [e.course_id, e])
      );
      setEnrollments(enrollmentMap);
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
        {courses.map((course) => {
          const enrollment = enrollments.get(course.id);
          const isPaid = enrollment !== undefined;
          const isCompleted = enrollment?.status === 'completed';

          return (
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
                  <p 
                    className="course-price" 
                    style={{ 
                      marginTop: '8px', 
                      fontWeight: '600', 
                      color: isPaid ? '#16a34a' : '#6366f1',
                      textDecoration: isPaid ? 'line-through' : 'none',
                      opacity: isPaid ? 0.7 : 1
                    }}
                  >
                    {formatCurrency(course.price, currency)}
                  </p>
                )}
                {isPaid ? (
                  <Link 
                    href={`/courses/${course.id}`} 
                    className={`btn ${isCompleted ? 'btn-ghost' : 'btn-primary'}`} 
                    style={{ marginTop: '12px' }}
                  >
                    {isCompleted ? 'Посмотреть результаты' : 'Продолжить'}
                  </Link>
                ) : (
                  <Link href={`/courses/${course.id}`} className="btn btn-primary" style={{ marginTop: '12px' }}>
                    Подробнее
                  </Link>
                )}
              </div>
            </div>
          );
        })}
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
