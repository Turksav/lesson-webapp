'use client';

import { useState } from 'react';

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

  const toggleRule = (index: number) => {
    setExpandedIndex(expandedIndex === index ? null : index);
  };

  return (
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
  );
}
