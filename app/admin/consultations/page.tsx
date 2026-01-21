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
  };
}

export default function AdminConsultationsPage() {
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    status: 'pending',
  });

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
          username
        )
      `)
      .order('consultation_date', { ascending: false })
      .order('consultation_time', { ascending: false });

    if (!error && data) {
      setConsultations(data);
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
          .select('telegram_user_id, first_name, last_name, username')
          .in('telegram_user_id', userIds);
        
        const usersMap = new Map(
          (usersData || []).map(u => [u.telegram_user_id, u])
        );
        
        const consultationsWithUsers = fallbackData.map(c => ({
          ...c,
          users: usersMap.get(c.telegram_user_id) || null,
        }));
        
        setConsultations(consultationsWithUsers);
      }
    }
    setLoading(false);
  };

  const handleEdit = (consultation: Consultation) => {
    setEditingId(consultation.id);
    setFormData({ status: consultation.status });
  };

  const handleCancel = () => {
    setEditingId(null);
    setFormData({ status: 'pending' });
  };

  const handleSave = async () => {
    if (!editingId) return;

    try {
      const { error } = await supabase
        .from('consultations')
        .update({ status: formData.status })
        .eq('id', editingId);

      if (error) throw error;

      handleCancel();
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

  if (loading) {
    return (
      <div className="admin-page">
        <h1 className="admin-page-title">Загрузка...</h1>
      </div>
    );
  }

  return (
    <div className="admin-page">
      <h1 className="admin-page-title">Консультации</h1>

      {editingId !== null && (
        <div className="admin-form-card">
          <h2>Редактировать статус консультации</h2>
          <div className="form-group">
            <label>Статус</label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              className="form-select"
            >
              <option value="pending">Ожидает подтверждения</option>
              <option value="confirmed">Подтверждена</option>
              <option value="completed">Завершена</option>
              <option value="cancelled">Отменена</option>
            </select>
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
              <th>ID</th>
              <th>User ID</th>
              <th>Имя пользователя</th>
              <th>Дата</th>
              <th>Время</th>
              <th>Формат</th>
              <th>Количество</th>
              <th>Цена</th>
              <th>Комментарий</th>
              <th>Статус</th>
              <th>Действия</th>
            </tr>
          </thead>
          <tbody>
            {consultations.map((consultation) => {
              const userName = consultation.users
                ? [consultation.users.first_name, consultation.users.last_name]
                    .filter(Boolean)
                    .join(' ') || consultation.users.username || 'Не указано'
                : 'Не указано';
              
              return (
                <tr key={consultation.id}>
                  <td>{consultation.id}</td>
                  <td>{consultation.telegram_user_id}</td>
                  <td>{userName}</td>
                  <td>{new Date(consultation.consultation_date).toLocaleDateString('ru-RU')}</td>
                <td>{consultation.consultation_time.slice(0, 5)}</td>
                <td>{consultation.format}</td>
                <td>{consultation.quantity}</td>
                <td>{formatCurrency(consultation.price * consultation.quantity, consultation.currency)}</td>
                <td>{consultation.comment || '-'}</td>
                <td>
                  <span className={`status-badge status-${consultation.status}`}>
                    {getStatusLabel(consultation.status)}
                  </span>
                </td>
                <td>
                  <button
                    className="btn btn-sm btn-ghost"
                    onClick={() => handleEdit(consultation)}
                  >
                    Редактировать
                  </button>
                </td>
              </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
