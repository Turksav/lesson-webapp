'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    courses: 0,
    consultations: 0,
    pendingConsultations: 0,
    slots: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const [coursesRes, consultationsRes, slotsRes] = await Promise.all([
        supabase.from('courses').select('id', { count: 'exact' }),
        supabase.from('consultations').select('id, status', { count: 'exact' }),
        supabase.from('consultation_slots').select('id', { count: 'exact' }),
      ]);

      const consultations = consultationsRes.data || [];
      const pendingConsultations = consultations.filter((c: any) => c.status === 'pending').length;

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

  if (loading) {
    return (
      <div className="admin-page">
        <h1 className="admin-page-title">Загрузка...</h1>
      </div>
    );
  }

  return (
    <div className="admin-page">
      <h1 className="admin-page-title">Панель управления</h1>

      <div className="admin-stats-grid">
        <div className="admin-stat-card">
          <h3>Курсы</h3>
          <p className="admin-stat-value">{stats.courses}</p>
          <Link href="/admin/courses" className="btn btn-sm btn-primary">
            Управление
          </Link>
        </div>

        <div className="admin-stat-card">
          <h3>Консультации</h3>
          <p className="admin-stat-value">{stats.consultations}</p>
          <p className="admin-stat-subvalue">Ожидают: {stats.pendingConsultations}</p>
          <Link href="/admin/consultations" className="btn btn-sm btn-primary">
            Управление
          </Link>
        </div>

        <div className="admin-stat-card">
          <h3>Слоты</h3>
          <p className="admin-stat-value">{stats.slots}</p>
          <Link href="/admin/slots" className="btn btn-sm btn-primary">
            Управление
          </Link>
        </div>
      </div>
    </div>
  );
}
