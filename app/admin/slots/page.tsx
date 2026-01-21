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
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({
    date: '',
    start_time: '',
    end_time: '',
    is_available: true,
  });

  useEffect(() => {
    loadSlots();
  }, []);

  const loadSlots = async () => {
    const { data, error } = await supabase
      .from('consultation_slots')
      .select('*')
      .order('date', { ascending: true })
      .order('start_time', { ascending: true });

    if (!error && data) {
      setSlots(data);
    }
    setLoading(false);
  };

  const handleEdit = (slot: Slot) => {
    setEditingId(slot.id);
    setIsCreating(false);
    setFormData({
      date: slot.date,
      start_time: slot.start_time,
      end_time: slot.end_time,
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
                  <React.Fragment key={i}>
                    <option value={`${hour}:00`}>{hour}:00</option>
                    <option value={`${hour}:30`}>{hour}:30</option>
                  </React.Fragment>
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
                  <React.Fragment key={i}>
                    <option value={`${hour}:00`}>{hour}:00</option>
                    <option value={`${hour}:30`}>{hour}:30</option>
                  </React.Fragment>
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
              <th>ID</th>
              <th>Дата</th>
              <th>Время начала</th>
              <th>Время окончания</th>
              <th>Доступен</th>
              <th>Действия</th>
            </tr>
          </thead>
          <tbody>
            {slots.map((slot) => (
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
      </div>
    </div>
  );
}
