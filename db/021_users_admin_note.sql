-- 021_users_admin_note.sql
-- Поле примечания для клиентов (админ) и RPC для обновления.
-- Применять в Supabase SQL Editor.

-- 1) Колонка примечания в users
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS admin_note text;

COMMENT ON COLUMN public.users.admin_note IS 'Примечание администратора о клиенте (только для админа)';

-- 2) RPC для обновления примечания (обходит RLS)
CREATE OR REPLACE FUNCTION public.update_user_admin_note(
  p_telegram_user_id bigint,
  p_admin_note text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Требуется аутентификация';
  END IF;

  UPDATE public.users
  SET admin_note = p_admin_note,
      updated_at = now()
  WHERE telegram_user_id = p_telegram_user_id;
END;
$$;

-- 3) Гранты
GRANT EXECUTE ON FUNCTION public.update_user_admin_note(bigint, text) TO authenticated;
