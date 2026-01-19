'use client';

import { useState } from 'react';
import TelegramInit from '@/components/TelegramInit';
import TelegramUserGate from '@/components/TelegramUserGate';
import CoursesSection from '@/components/CoursesSection';
import RulesSection from '@/components/RulesSection';
import CabinetSection from '@/components/CabinetSection';

export default function Page() {
  const [activeTab, setActiveTab] = useState<'courses' | 'rules' | 'cabinet'>('courses');

  return (
    <TelegramUserGate>
      <TelegramInit />
      <main className="container">
        <section className="surface">
          <header className="page-header">
            <div>
              <h1 className="page-title">Уроки саморазвития</h1>
              <p className="page-subtitle">
                Короткие практические уроки, которые двигают тебя вперёд каждый день.
              </p>
            </div>
            <span className="badge">Телеграм-мини‑приложение</span>
          </header>

          {/* Навигационные табы */}
          <nav className="main-nav">
            <button
              className={`nav-tab ${activeTab === 'courses' ? 'active' : ''}`}
              onClick={() => setActiveTab('courses')}
            >
              Курсы
            </button>
            <button
              className={`nav-tab ${activeTab === 'rules' ? 'active' : ''}`}
              onClick={() => setActiveTab('rules')}
            >
              Правила
            </button>
            <button
              className={`nav-tab ${activeTab === 'cabinet' ? 'active' : ''}`}
              onClick={() => setActiveTab('cabinet')}
            >
              Кабинет
            </button>
          </nav>

          {/* Контент секций */}
          <div className="tab-content">
            {activeTab === 'courses' && <CoursesSection />}
            {activeTab === 'rules' && <RulesSection />}
            {activeTab === 'cabinet' && <CabinetSection />}
          </div>
        </section>
      </main>
    </TelegramUserGate>
  );
}
