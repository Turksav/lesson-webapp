'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { formatCurrency } from '@/lib/currencyUtils';

interface ConsultationPrice {
  quantity: number;
  price_rub: number;
  price_usd: number | null;
  price_eur: number | null;
  price_uah: number | null;
}

interface ConsultationSlot {
  id: number;
  date: string;
  start_time: string;
  end_time: string;
  is_available: boolean;
}

interface ConsultationBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  userBalance: number;
  userCurrency: string;
}

export default function ConsultationBookingModal({
  isOpen,
  onClose,
  onSuccess,
  userBalance,
  userCurrency,
}: ConsultationBookingModalProps) {
  const [prices, setPrices] = useState<ConsultationPrice[]>([]);
  const [slots, setSlots] = useState<ConsultationSlot[]>([]);
  const [selectedQuantity, setSelectedQuantity] = useState<number>(1);
  const [selectedFormat, setSelectedFormat] = useState<'Zoom' | 'Telegram'>('Zoom');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [availableTimes, setAvailableTimes] = useState<string[]>([]);
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [comment, setComment] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'check' | 'form' | 'success'>('check');
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      loadPrices();
      loadSlots();
      setStep('check');
      setSelectedDate('');
      setSelectedTime('');
      setComment('');
      setError('');
      console.log('Modal opened with balance:', userBalance, 'currency:', userCurrency);
    }
  }, [isOpen, userBalance, userCurrency]);

  useEffect(() => {
    if (selectedDate) {
      updateAvailableTimes();
    }
  }, [selectedDate, slots]);

  const loadPrices = async () => {
    const { data } = await supabase
      .from('consultation_prices')
      .select('*')
      .order('quantity');
    if (data) setPrices(data);
  };

  const loadSlots = async () => {
    const { data } = await supabase
      .from('consultation_slots')
      .select('*')
      .eq('is_available', true)
      .gte('date', new Date().toISOString().split('T')[0])
      .order('date')
      .order('start_time');
    if (data) setSlots(data);
  };

  const updateAvailableTimes = () => {
    const dateSlots = slots.filter(
      (s) => s.date === selectedDate && s.is_available
    );
    const times = dateSlots.map((s) => s.start_time);
    setAvailableTimes(times);
    if (!times.includes(selectedTime)) {
      setSelectedTime('');
    }
  };

  const getPriceForCurrency = (price: ConsultationPrice): number => {
    switch (userCurrency) {
      case 'USD':
        return price.price_usd || price.price_rub / 90;
      case 'EUR':
        return price.price_eur || price.price_rub / 100;
      case 'UAH':
        return price.price_uah || price.price_rub / 2.5;
      default:
        return price.price_rub;
    }
  };

  const getTotalPrice = (): number => {
    const price = prices.find((p) => p.quantity === selectedQuantity);
    if (!price) return 0;
    return getPriceForCurrency(price) * selectedQuantity;
  };

  const getDaysWithSlots = (): string[] => {
    const uniqueDates = new Set(slots.map((s) => s.date));
    return Array.from(uniqueDates).sort();
  };

  const checkBalance = () => {
    const totalPrice = getTotalPrice();
    if (userBalance >= totalPrice) {
      setStep('form');
      setError('');
    } else {
      const needed = totalPrice - userBalance;
      setError(
        `Недостаточно средств. Нужно пополнить на ${formatCurrency(needed, userCurrency)}`
      );
    }
  };

  const handleSubmit = async () => {
    if (!selectedDate || !selectedTime) {
      setError('Выберите дату и время консультации');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const price = prices.find((p) => p.quantity === selectedQuantity);
      if (!price) {
        throw new Error('Цена не найдена');
      }

      const consultationPrice = getPriceForCurrency(price);
      const tg = (window as any)?.Telegram?.WebApp;
      const telegramUserId =
        (window as any).__telegramUserId ?? tg?.initDataUnsafe?.user?.id;

      if (!telegramUserId) {
        throw new Error('Пользователь не авторизован');
      }

      const { data, error: rpcError } = await supabase.rpc('create_consultation', {
        p_telegram_user_id: Number(telegramUserId),
        p_format: selectedFormat,
        p_consultation_date: selectedDate,
        p_consultation_time: selectedTime,
        p_quantity: selectedQuantity,
        p_price: consultationPrice,
        p_currency: userCurrency,
        p_comment: comment || null,
      });

      if (rpcError) {
        throw rpcError;
      }

      // Отправляем сообщение в Telegram (заглушка - нужно будет интегрировать с Telegram Bot API)
      console.log('Consultation created:', data);
      // TODO: Отправить сообщение в Telegram через Bot API

      setStep('success');
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 3000);
    } catch (err: any) {
      setError(err.message || 'Ошибка при создании консультации');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const totalPrice = getTotalPrice();
  const daysWithSlots = getDaysWithSlots();

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        {step === 'check' && (
          <>
            <h2 className="modal-title">Запись на консультацию</h2>
            <div className="consultation-prices">
              <label>Количество консультаций:</label>
              <select
                value={selectedQuantity}
                onChange={(e) => setSelectedQuantity(Number(e.target.value))}
                className="form-select"
              >
                {prices.map((p) => (
                  <option key={p.quantity} value={p.quantity}>
                    {p.quantity} консультация(ий) - {formatCurrency(getPriceForCurrency(p), userCurrency)} за каждую
                  </option>
                ))}
              </select>
            </div>
            <div className="consultation-total">
              <strong>Итого: {formatCurrency(totalPrice, userCurrency)}</strong>
              <p>Ваш баланс: {formatCurrency(userBalance, userCurrency)}</p>
              {userBalance < totalPrice && (
                <p className="balance-warning">
                  Недостаточно средств. Нужно пополнить на {formatCurrency(totalPrice - userBalance, userCurrency)}
                </p>
              )}
            </div>
            {error && <div className="error-message">{error}</div>}
            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={onClose}>
                Отмена
              </button>
              <button className="btn btn-primary" onClick={checkBalance}>
                Продолжить
              </button>
            </div>
          </>
        )}

        {step === 'form' && (
          <>
            <h2 className="modal-title">Заполните форму</h2>
            <div className="consultation-form">
              <div className="form-group">
                <label>Формат консультации *</label>
                <div className="radio-group">
                  <label>
                    <input
                      type="radio"
                      value="Zoom"
                      checked={selectedFormat === 'Zoom'}
                      onChange={(e) => setSelectedFormat(e.target.value as 'Zoom')}
                    />
                    Zoom
                  </label>
                  <label>
                    <input
                      type="radio"
                      value="Telegram"
                      checked={selectedFormat === 'Telegram'}
                      onChange={(e) => setSelectedFormat(e.target.value as 'Telegram')}
                    />
                    Telegram
                  </label>
                </div>
              </div>

              <div className="form-group">
                <label>Дата консультации *</label>
                <div className="date-picker">
                  {daysWithSlots.map((date) => (
                    <button
                      key={date}
                      type="button"
                      className={`date-button ${selectedDate === date ? 'selected' : ''}`}
                      onClick={() => setSelectedDate(date)}
                    >
                      {new Date(date).toLocaleDateString('ru-RU', {
                        weekday: 'short',
                        day: 'numeric',
                        month: 'short',
                      })}
                    </button>
                  ))}
                </div>
              </div>

              {selectedDate && (
                <div className="form-group">
                  <label>Время консультации *</label>
                  <div className="time-picker">
                    {availableTimes.map((time) => (
                      <button
                        key={time}
                        type="button"
                        className={`time-button ${selectedTime === time ? 'selected' : ''}`}
                        onClick={() => setSelectedTime(time)}
                      >
                        {time.slice(0, 5)}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="form-group">
                <label>Комментарий (необязательно)</label>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  className="form-textarea"
                  rows={3}
                  placeholder="Опишите, что вы хотели бы обсудить на консультации"
                />
              </div>

              {error && <div className="error-message">{error}</div>}

              <div className="modal-actions">
                <button className="btn btn-ghost" onClick={() => setStep('check')}>
                  Назад
                </button>
                <button
                  className="btn btn-primary"
                  onClick={handleSubmit}
                  disabled={loading || !selectedDate || !selectedTime}
                >
                  {loading ? 'Создание...' : 'Подтвердить'}
                </button>
              </div>
            </div>
          </>
        )}

        {step === 'success' && (
          <div className="success-message">
            <h2>Спасибо!</h2>
            <p>Я свяжусь с вами в ближайшее время.</p>
          </div>
        )}
      </div>
    </div>
  );
}
