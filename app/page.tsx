import TelegramInit from '@/components/TelegramInit';
import Link from 'next/link';

export default function Page() {
  return (
    <>
      <TelegramInit />
      <h1>Добро пожаловать на уроки</h1>
      <p>Выбирай урок и проходи тесты для саморазвития</p>
      <Link href="/lesson">
        <button>Посмотреть все уроки</button>
      </Link>
    </>
  );
}
