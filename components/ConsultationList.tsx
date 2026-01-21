'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

interface Consultation {
  id: number;
  format: string;
  consultation_date: string;
  consultation_time: string;
  quantity: number;
  price: number;
  currency: string;
  comment: string | null;
  status: string;
  created_at: string;
}

interface ConsultationListProps {
  onUpdate?: () => void;
}

export default function ConsultationList({ onUpdate }: ConsultationListProps = {}) {
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState<number | null>(null);

  useEffect(() => {
    loadConsultations();
  }, []);

  const loadConsultations = async () => {
    const tg = (window as any)?.Telegram?.WebApp;
    const telegramUserId =
      (window as any).__telegramUserId ?? tg?.initDataUnsafe?.user?.id;

    if (!telegramUserId) {
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('consultations')
      .select('*')
      .eq('telegram_user_id', Number(telegramUserId))
      .order('consultation_date', { ascending: false })
      .order('consultation_time', { ascending: false });

    if (!error && data) {
      setConsultations(data);
    }
    setLoading(false);
  };

  const canCancel = (consultation: Consultation): boolean => {
    const consultationDateTime = new Date(
      `${consultation.consultation_date}T${consultation.consultation_time}`
    );
    const now = new Date();
    const hoursUntil = (consultationDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);
    return hoursUntil > 24 && consultation.status === 'pending';
  };

  const handleCancel = async (consultationId: number) => {
    if (!confirm('Вы уверены, что хотите отменить консультацию?')) {
      return;
    }

    setCancellingId(consultationId);

    try {
      const tg = (window as any)?.Telegram?.WebApp;
      const telegramUserId =
        (window as any).__telegramUserId ?? tg?.initDataUnsafe?.user?.id;

      if (!telegramUserId) {
        throw new Error('Пользователь не авторизован');
      }

      const { error } = await supabase.rpc('cancel_consultation', {
        p_consultation_id: consultationId,
        p_telegram_user_id: Number(telegramUserId),
      });

      if (error) {
        throw error;
      }

      alert('Консультация отменена. Средства возвращены на баланс.');
      loadConsultations();
      if (onUpdate) onUpdate();
    } catch (err: any) {
      alert(err.message || 'Ошибка при отмене консультации');
    } finally {
      setCancellingId(null);
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

  const getStatusClass = (status: string): string => {
    switch (status) {
      case 'pending':
        return 'status-pending';
      case 'confirmed':
        return 'status-completed';
      case 'completed':
        return 'status-completed';
      case 'cancelled':
        return 'status-skipped';
      default:
        return '';
    }
  };

  const getFormatIcon = (format: string): string => {
    switch (format) {
      case 'Zoom':
        return '📹';
      case 'Telegram':
        return '✈️';
      default:
        return '📞';
    }
  };

  if (loading) {
    return <p className="page-subtitle">Загружаем консультации…</p>;
  }

  if (consultations.length === 0) {
    return (
      <div className="consultations-empty">
        <p className="page-subtitle">У вас пока нет записей на консультации.</p>
      </div>
    );
  }

  return (
    <div className="consultations-list">
      <h2 className="consultations-title">Мои консультации</h2>
      <div className="consultations-table">
        <table className="progress-table">
          <thead>
            <tr>
              <th>Дата и время</th>
              <th></th>
              <th>Статус</th>
              <th>Действия</th>
            </tr>
          </thead>
          <tbody>
            {consultations.map((consultation) => (
              <tr key={consultation.id}>
                <td>
                  {new Date(consultation.consultation_date).toLocaleDateString('ru-RU', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                  })}{' '}
                  {consultation.consultation_time.slice(0, 5)}
                </td>
                <td className="format-icon-cell">
                  <span className="format-icon" title={consultation.format}>
                    {getFormatIcon(consultation.format)}
                  </span>
                </td>
                <td>
                  <span className={`status-badge ${getStatusClass(consultation.status)}`}>
                    {getStatusLabel(consultation.status)}
                  </span>
                </td>
                <td>
                  {canCancel(consultation) && (
                    <button
                      className="btn btn-sm btn-ghost"
                      onClick={() => handleCancel(consultation.id)}
                      disabled={cancellingId === consultation.id}
                    >
                      {cancellingId === consultation.id ? 'Отмена...' : 'Отменить'}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
