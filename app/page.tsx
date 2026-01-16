'use client';

export default function Home() {
  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f9fafb',
        fontFamily: 'Arial, sans-serif',
      }}
    >
      <div
        style={{
          maxWidth: 600,
          textAlign: 'center',
          padding: 40,
          backgroundColor: '#ffffff',
          borderRadius: 8,
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
        }}
      >
        <h1 style={{ fontSize: 32, marginBottom: 16 }}>
          Развитие без перегруза
        </h1>

        <p
          style={{
            fontSize: 18,
            color: '#555',
            marginBottom: 32,
            lineHeight: 1.5,
          }}
        >
          Короткие уроки для осознанного роста.  
          Читай, отвечай на вопросы и двигайся вперёд шаг за шагом.
        </p>

        <button
          style={{
            padding: '14px 28px',
            fontSize: 16,
            borderRadius: 6,
            border: 'none',
            backgroundColor: '#2563eb',
            color: '#ffffff',
            cursor: 'pointer',
          }}
          onClick={() => {
            window.location.href = '/lesson';
          }}
        >
          Начать обучение
        </button>
      </div>
    </main>
  );
}
