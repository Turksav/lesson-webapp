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
  const [existingConsultations, setExistingConsultations] = useState<Array<{ consultation_time: string }>>([]);

  useEffect(() => {
    if (isOpen) {
      loadPrices();
      loadSlots();
      setStep('check');
      setSelectedDate('');
      setSelectedTime('');
      setComment('');
      setError('');
      setExistingConsultations([]);
      console.log('Modal opened with balance:', userBalance, 'currency:', userCurrency);
    }
  }, [isOpen, userBalance, userCurrency]);

  useEffect(() => {
    if (selectedDate) {
      loadExistingConsultations();
    }
  }, [selectedDate]);

  useEffect(() => {
    if (selectedDate && existingConsultations.length >= 0) {
      updateAvailableTimes();
    }
  }, [selectedDate, slots, existingConsultations]);

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

  const loadExistingConsultations = async () => {
    if (!selectedDate) return;

    const { data, error } = await supabase
      .from('consultations')
      .select('consultation_time')
      .eq('consultation_date', selectedDate)
      .in('status', ['pending', 'confirmed']); // Только активные консультации

    if (!error && data) {
      setExistingConsultations(data);
    }
  };

  const updateAvailableTimes = () => {
    if (!selectedDate) {
      setAvailableTimes([]);
      return;
    }

    // Находим все слоты для выбранной даты
    const dateSlots = slots.filter(
      (s) => s.date === selectedDate && s.is_available
    );

    if (dateSlots.length === 0) {
      setAvailableTimes([]);
      setSelectedTime('');
      return;
    }

    // Генерируем все возможные часы из всех слотов
    const allPossibleTimes = new Set<string>();

    dateSlots.forEach((slot) => {
      const startTime = new Date(`2000-01-01T${slot.start_time}`);
      const endTime = new Date(`2000-01-01T${slot.end_time}`);

      // Генерируем часы от начала до конца (не включая end_time)
      let currentTime = new Date(startTime);
      while (currentTime < endTime) {
        const timeString = currentTime.toTimeString().slice(0, 5); // HH:MM
        allPossibleTimes.add(timeString);
        // Переходим к следующему часу
        currentTime.setHours(currentTime.getHours() + 1);
      }
    });

    // Получаем список занятых часов (включая час до и час после каждой консультации)
    const blockedTimes = new Set<string>();

    existingConsultations.forEach((consultation) => {
      const consultationTime = consultation.consultation_time.slice(0, 5); // HH:MM
      const [hours, minutes] = consultationTime.split(':').map(Number);
      
      // Блокируем сам час консультации
      blockedTimes.add(consultationTime);
      
      // Блокируем час до консультации
      const hourBefore = new Date(2000, 0, 1, hours - 1, minutes);
      const hourBeforeString = hourBefore.toTimeString().slice(0, 5);
      blockedTimes.add(hourBeforeString);
      
      // Блокируем час после консультации
      const hourAfter = new Date(2000, 0, 1, hours + 1, minutes);
      const hourAfterString = hourAfter.toTimeString().slice(0, 5);
      blockedTimes.add(hourAfterString);
    });

    // Фильтруем доступные часы
    const availableTimesList = Array.from(allPossibleTimes)
      .filter((time) => !blockedTimes.has(time))
      .sort();

    setAvailableTimes(availableTimesList);
    
    // Сбрасываем выбранное время, если оно больше не доступно
    if (selectedTime && !availableTimesList.includes(selectedTime)) {
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
