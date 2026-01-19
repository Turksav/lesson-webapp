-- 002_courses_rls_policies.sql
-- Политики доступа (RLS) для таблицы courses
-- Применять в Supabase SQL Editor после создания таблицы courses.

-- 1) Включаем Row Level Security для таблицы courses
alter table public.courses enable row level security;

-- 2) Политика на чтение (SELECT) - все могут читать курсы
-- Это позволяет любому пользователю (включая анонимных) видеть список курсов
create policy "Курсы доступны для чтения всем"
  on public.courses
  for select
  using (true);

-- 3) Политика на вставку (INSERT) - только через сервисную роль или админы
-- Обычно INSERT делается через админ-панель или сервисную роль, не через клиент
-- Если нужно разрешить INSERT через клиент, можно использовать проверку через Telegram user_id
-- или создать отдельную таблицу для админов

-- Вариант A: Только через сервисную роль (рекомендуется)
-- (сервисная роль автоматически обходит RLS, поэтому политика не нужна)
-- Но можно добавить для явности:
create policy "Курсы можно создавать только через сервисную роль"
  on public.courses
  for insert
  with check (false); -- Блокируем INSERT через клиент, только через сервисную роль

-- Вариант B: Если нужно разрешить создание курсов через клиент (например, для админов)
-- Раскомментируй это и закомментируй вариант A выше:
-- create policy "Админы могут создавать курсы"
--   on public.courses
--   for insert
--   with check (
--     exists (
--       select 1
--       from public.admin_users
--       where telegram_user_id = (current_setting('request.jwt.claims', true)::json->>'telegram_user_id')::bigint
--     )
--   );

-- 4) Политика на обновление (UPDATE) - только через сервисную роль
create policy "Курсы можно обновлять только через сервисную роль"
  on public.courses
  for update
  using (false) -- Блокируем UPDATE через клиент
  with check (false);

-- 5) Политика на удаление (DELETE) - только через сервисную роль
create policy "Курсы можно удалять только через сервисную роль"
  on public.courses
  for delete
  using (false); -- Блокируем DELETE через клиент

-- Примечания:
-- - SELECT: открыт для всех (анонимные и авторизованные пользователи)
-- - INSERT/UPDATE/DELETE: заблокированы через клиент, доступны только через сервисную роль (service_role key)
-- - Если нужно разрешить админам редактировать через клиент, создай таблицу admin_users
--   и используй вариант B для INSERT/UPDATE/DELETE с проверкой telegram_user_id
