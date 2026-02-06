'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    courses: pathname?.startsWith('/admin/courses') || pathname?.startsWith('/admin/lessons') || pathname?.startsWith('/admin/progress'),
    consultations: pathname?.startsWith('/admin/slots') || pathname?.startsWith('/admin/consultations'),
  });

  useEffect(() => {
    // Пропускаем проверку для страницы входа
    if (pathname === '/admin/login') {
      setLoading(false);
      return;
    }

    checkAuth();

    // Слушаем изменения аутентификации
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (pathname === '/admin/login') return;
      
      if (event === 'SIGNED_OUT' || !session) {
        router.push('/admin/login');
      } else {
        setUser(session.user);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [pathname, router]);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      router.push('/admin/login');
      return;
    }
    setUser(session.user);
    setLoading(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/admin/login');
  };

  // Пропускаем layout для страницы входа
  if (pathname === '/admin/login') {
    return <>{children}</>;
  }

  if (loading) {
    return (
      <main className="container">
        <section className="surface">
          <p>Загрузка...</p>
        </section>
      </main>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="admin-layout">
      <nav className="admin-nav">
        <div className="admin-nav-header">
          <h2>Админ-панель</h2>
          <button className="btn btn-sm btn-ghost" onClick={handleLogout}>
            Выйти
          </button>
        </div>
        <div className="admin-nav-links">
          <Link
            href="/admin"
            className={`admin-nav-link ${pathname === '/admin' ? 'active' : ''}`}
          >
            Главная
          </Link>
          
          <div className="admin-nav-section">
            <button
              className={`admin-nav-section-toggle ${expandedSections.courses ? 'expanded' : ''}`}
              onClick={() => setExpandedSections({ ...expandedSections, courses: !expandedSections.courses })}
            >
              <span>Курсы</span>
              <span className="admin-nav-arrow">{expandedSections.courses ? '▼' : '▶'}</span>
            </button>
            {expandedSections.courses && (
              <div className="admin-nav-submenu">
                <Link
                  href="/admin/courses"
                  className={`admin-nav-link admin-nav-submenu-link ${pathname === '/admin/courses' ? 'active' : ''}`}
                >
                  Список курсов
                </Link>
                <Link
                  href="/admin/lessons"
                  className={`admin-nav-link admin-nav-submenu-link ${pathname === '/admin/lessons' ? 'active' : ''}`}
                >
                  Список уроков
                </Link>
                <Link
                  href="/admin/progress"
                  className={`admin-nav-link admin-nav-submenu-link ${pathname === '/admin/progress' ? 'active' : ''}`}
                >
                  Прохождения
                </Link>
              </div>
            )}
          </div>

          <div className="admin-nav-section">
            <button
              className={`admin-nav-section-toggle ${expandedSections.consultations ? 'expanded' : ''}`}
              onClick={() => setExpandedSections({ ...expandedSections, consultations: !expandedSections.consultations })}
            >
              <span>Консультации</span>
              <span className="admin-nav-arrow">{expandedSections.consultations ? '▼' : '▶'}</span>
            </button>
            {expandedSections.consultations && (
              <div className="admin-nav-submenu">
                <Link
                  href="/admin/slots"
                  className={`admin-nav-link admin-nav-submenu-link ${pathname === '/admin/slots' ? 'active' : ''}`}
                >
                  Слоты
                </Link>
                <Link
                  href="/admin/consultations"
                  className={`admin-nav-link admin-nav-submenu-link ${pathname === '/admin/consultations' ? 'active' : ''}`}
                >
                  Записи
                </Link>
              </div>
            )}
          </div>
        </div>
      </nav>
      <main className="admin-content">
        {children}
      </main>
    </div>
  );
}
