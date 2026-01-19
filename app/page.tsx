import TelegramInit from '@/components/TelegramInit';
import TelegramUserGate from '@/components/TelegramUserGate';
import Link from 'next/link';

export default function Page() {
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

          <div>
            <Link href="/lesson" className="btn btn-primary">
              Посмотреть все уроки
            </Link>
          </div>
        </section>
      </main>
    </TelegramUserGate>
  );
}
