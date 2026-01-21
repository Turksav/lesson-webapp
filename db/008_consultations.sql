-- 008_consultations.sql
-- Таблицы для системы консультаций
-- Применять в Supabase SQL Editor.

-- 1) Цены на консультации (зависит от количества)
create table if not exists public.consultation_prices (
  id bigserial primary key,
  quantity int not null unique, -- количество консультаций (1, 2, 3, ...)
  price_rub numeric(10, 2) not null default 5000.00,
  price_usd numeric(10, 2),
  price_eur numeric(10, 2),
  price_uah numeric(10, 2),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2) Свободные слоты для консультаций
create table if not exists public.consultation_slots (
  id bigserial primary key,
  date date not null,
  start_time time not null,
  end_time time not null,
  is_available boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(date, start_time)
);

-- 3) Записи на консультации
create table if not exists public.consultations (
  id bigserial primary key,
  telegram_user_id bigint not null references public.users(telegram_user_id) on delete cascade,
  format text not null check (format in ('Zoom', 'Telegram')),
  consultation_date date not null,
  consultation_time time not null,
  quantity int not null default 1,
  price numeric(10, 2) not null,
  currency text not null default 'RUB',
  comment text,
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'completed', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 4) Индексы
create index if not exists consultation_prices_quantity_idx on public.consultation_prices(quantity);
create index if not exists consultation_slots_date_idx on public.consultation_slots(date);
create index if not exists consultation_slots_available_idx on public.consultation_slots(is_available);
create index if not exists consultations_user_id_idx on public.consultations(telegram_user_id);
create index if not exists consultations_date_time_idx on public.consultations(consultation_date, consultation_time);
create index if not exists consultations_status_idx on public.consultations(status);

-- 5) Триггеры для автоматического обновления updated_at
drop trigger if exists update_consultation_prices_updated_at on public.consultation_prices;
create trigger update_consultation_prices_updated_at
  before update on public.consultation_prices
  for each row
  execute function update_updated_at_column();

drop trigger if exists update_consultation_slots_updated_at on public.consultation_slots;
create trigger update_consultation_slots_updated_at
  before update on public.consultation_slots
  for each row
  execute function update_updated_at_column();

drop trigger if exists update_consultations_updated_at on public.consultations;
create trigger update_consultations_updated_at
  before update on public.consultations
  for each row
  execute function update_updated_at_column();

-- 6) RLS политики для consultation_prices (чтение для всех)
alter table public.consultation_prices enable row level security;

create policy "consultation_prices_select_all"
  on public.consultation_prices
  for select
  using (true);

-- 7) RLS политики для consultation_slots (чтение для всех)
alter table public.consultation_slots enable row level security;

create policy "consultation_slots_select_all"
  on public.consultation_slots
  for select
  using (true);

-- 8) RLS политики для consultations
alter table public.consultations enable row level security;

create policy "consultations_select_own"
  on public.consultations
  for select
  using (true); -- Можно ограничить если нужно

create policy "consultations_insert_own"
  on public.consultations
  for insert
  with check (true); -- Используем RPC функцию для безопасности

create policy "consultations_update_own"
  on public.consultations
  for update
  using (true)
  with check (true);

-- 9) RPC функция для создания консультации (с проверкой баланса и списанием)
create or replace function public.create_consultation(
  p_telegram_user_id bigint,
  p_format text,
  p_consultation_date date,
  p_consultation_time time,
  p_quantity int,
  p_price numeric,
  p_currency text,
  p_comment text default null
)
returns bigint
language plpgsql
security definer
as $$
declare
  v_consultation_id bigint;
  v_user_balance numeric;
  v_required_balance numeric;
begin
  -- Проверяем баланс пользователя
  select balance into v_user_balance
  from public.user_balance
  where telegram_user_id = p_telegram_user_id;

  if v_user_balance is null then
    raise exception 'Баланс пользователя не найден';
  end if;

  v_required_balance := p_price * p_quantity;

  if v_user_balance < v_required_balance then
    raise exception 'Недостаточно средств на балансе. Требуется: % %, доступно: % %', 
      v_required_balance, p_currency, v_user_balance, p_currency;
  end if;

  -- Создаём запись консультации
  insert into public.consultations (
    telegram_user_id,
    format,
    consultation_date,
    consultation_time,
    quantity,
    price,
    currency,
    comment,
    status
  )
  values (
    p_telegram_user_id,
    p_format,
    p_consultation_date,
    p_consultation_time,
    p_quantity,
    p_price,
    p_currency,
    p_comment,
    'pending'
  )
  returning id into v_consultation_id;

  -- Списываем средства с баланса
  update public.user_balance
  set balance = balance - v_required_balance,
      updated_at = now()
  where telegram_user_id = p_telegram_user_id;

  return v_consultation_id;
end;
$$;

-- 10) RPC функция для отмены консультации (с возвратом средств)
create or replace function public.cancel_consultation(
  p_consultation_id bigint,
  p_telegram_user_id bigint
)
returns void
language plpgsql
security definer
as $$
declare
  v_consultation record;
  v_hours_until_consultation numeric;
begin
  -- Получаем данные консультации
  select * into v_consultation
  from public.consultations
  where id = p_consultation_id
    and telegram_user_id = p_telegram_user_id;

  if not found then
    raise exception 'Консультация не найдена';
  end if;

  if v_consultation.status = 'cancelled' then
    raise exception 'Консультация уже отменена';
  end if;

  if v_consultation.status = 'completed' then
    raise exception 'Нельзя отменить завершённую консультацию';
  end if;

  -- Проверяем, что до консультации осталось более 24 часов
  v_hours_until_consultation := extract(epoch from (
    (v_consultation.consultation_date + v_consultation.consultation_time) - now()
  )) / 3600;

  if v_hours_until_consultation <= 24 then
    raise exception 'Отменить консультацию можно не позднее чем за 24 часа до начала';
  end if;

  -- Возвращаем средства на баланс
  update public.user_balance
  set balance = balance + (v_consultation.price * v_consultation.quantity),
      updated_at = now()
  where telegram_user_id = p_telegram_user_id;

  -- Отменяем консультацию
  update public.consultations
  set status = 'cancelled',
      updated_at = now()
  where id = p_consultation_id;
end;
$$;

-- 11) Гранты для выполнения RPC функций
grant execute on function public.create_consultation to anon;
grant execute on function public.create_consultation to authenticated;
grant execute on function public.cancel_consultation to anon;
grant execute on function public.cancel_consultation to authenticated;

-- 12) Тестовые данные - цены на консультации
insert into public.consultation_prices (quantity, price_rub, price_usd, price_eur, price_uah) values
  (1, 5000.00, 55.00, 50.00, 2000.00),
  (2, 9500.00, 105.00, 95.00, 3800.00),
  (3, 13500.00, 150.00, 135.00, 5400.00),
  (4, 17000.00, 190.00, 170.00, 6800.00),
  (5, 20000.00, 220.00, 200.00, 8000.00)
on conflict (quantity) do nothing;

-- 13) Тестовые данные - свободные слоты (пример на ближайшие 2 недели)
-- Можно добавить больше слотов через админку или автоматически генерировать
