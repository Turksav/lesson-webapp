'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import ConsultationBookingModal from './ConsultationBookingModal';

interface RuleItem {
  title: string;
  short: string;
  full: string;
}

const rules: RuleItem[] = [
  {
    title: 'Регистрация и доступ',
    short: 'Для доступа к курсам необходимо быть авторизованным через Telegram.',
    full: 'Для доступа к курсам необходимо быть авторизованным через Telegram. Все данные о прогрессе сохраняются автоматически и привязаны к вашему Telegram аккаунту. При первом входе система автоматически создаст ваш профиль.',
  },
  {
    title: 'Прохождение уроков',
    short: 'Уроки можно проходить в любом порядке, но рекомендуется следовать последовательности курса.',
    full: 'Уроки можно проходить в любом порядке, но рекомендуется следовать последовательности курса. Каждый урок состоит из нескольких занятий. Вы можете отмечать уроки как завершённые после изучения всех материалов. Прогресс сохраняется автоматически.',
  },
  {
    title: 'Оценка и сертификаты',
    short: 'После завершения всех уроков курса вы получите сертификат о прохождении.',
    full: 'После завершения всех уроков курса вы получите сертификат о прохождении. Сертификат будет доступен в разделе "Кабинет". Для получения сертификата необходимо завершить все уроки курса и пройти финальное тестирование, если оно предусмотрено.',
  },
  {
    title: 'Техническая поддержка',
    short: 'При возникновении проблем обращайтесь в поддержку через Telegram.',
    full: 'При возникновении проблем обращайтесь в поддержку через Telegram. Мы отвечаем в течение 24 часов в рабочие дни. Также вы можете найти ответы на частые вопросы в разделе FAQ или написать нам напрямую через бота.',
  },
];

export default function RulesSection() {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [balance, setBalance] = useState<number>(0);
  const [currency, setCurrency] = useState<string>('RUB');

  useEffect(() => {
    loadUserData();
  }, []);

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

  const toggleRule = (index: number) => {
    setExpandedIndex(expandedIndex === index ? null : index);
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

  return (
    <div className="about-section">
      {/* Текстовый блок "Цель и польза" */}
      <div className="about-goal">
        <h2 className="about-goal-title">Цель и польза</h2>
        <div className="about-goal-content">
          <p>
            Наш проект создан для того, чтобы помочь вам развиваться и достигать своих целей. 
            Мы предлагаем структурированные курсы по саморазвитию, которые помогут вам:
          </p>
          <ul>
            <li>Развить навыки планирования и управления временем</li>
            <li>Улучшить коммуникативные способности</li>
            <li>Повысить личную эффективность</li>
            <li>Достигать поставленных целей</li>
            <li>Формировать полезные привычки</li>
          </ul>
          <p>
            Все материалы разработаны практикующими экспертами и основаны на проверенных методиках. 
            Вы можете проходить уроки в удобном для вас темпе и отслеживать свой прогресс в личном кабинете.
          </p>
        </div>
      </div>

      {/* Существующий блок правил */}
      <div>
        <h2 className="rules-title">Правила</h2>
        <div className="rules-list">
          {rules.map((rule, index) => (
          <div key={index} className="rule-item">
            <button
              className={`rule-header ${expandedIndex === index ? 'expanded' : ''}`}
              onClick={() => toggleRule(index)}
            >
              <span className="rule-title">{rule.title}</span>
              <span className="rule-icon">{expandedIndex === index ? '−' : '+'}</span>
            </button>
            <div className={`rule-content ${expandedIndex === index ? 'expanded' : ''}`}>
              <p className="rule-short">{rule.short}</p>
              {expandedIndex === index && <p className="rule-full">{rule.full}</p>}
            </div>
          </div>
        ))}
        </div>
      </div>

      {/* Кнопки действий */}
      <div className="about-actions">
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
    </div>
  );
}
