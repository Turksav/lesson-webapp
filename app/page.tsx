import TelegramInit from '@/components/TelegramInit';
import Link from 'next/link';

export default function Page() {
  return (
    <>
      <TelegramInit />
      <div className="container" style={{ textAlign: 'center' }}>
        <h1>Добро пожаловать на уроки саморазвития</h1>
        <p>Проходи уроки, отвечай на вопросы и развивай свои навыки!</p>
        <Link href="/lesson">
          <button>Посмотреть все уроки</button>
        </Link>
      </div>
    </>
  );
}
