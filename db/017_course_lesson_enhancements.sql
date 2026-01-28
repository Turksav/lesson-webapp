-- 017_course_lesson_enhancements.sql
-- Расширение функционала курсов и уроков
-- Применять в Supabase SQL Editor.

-- 1) Добавляем поле price в таблицу courses
ALTER TABLE public.courses
  ADD COLUMN IF NOT EXISTS price numeric(12, 2) NOT NULL DEFAULT 0.00;

COMMENT ON COLUMN public.courses.price IS 'Стоимость курса. Может быть нулевой.';

-- 2) Добавляем новые поля в таблицу lessons
ALTER TABLE public.lessons
  ADD COLUMN IF NOT EXISTS video_description text;

ALTER TABLE public.lessons
  ADD COLUMN IF NOT EXISTS lesson_description text;

ALTER TABLE public.lessons
  ADD COLUMN IF NOT EXISTS question text;

ALTER TABLE public.lessons
  ADD COLUMN IF NOT EXISTS allow_photo_upload boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.lessons.video_description IS 'Описание видео для AI. Не показывается клиенту.';
COMMENT ON COLUMN public.lessons.lesson_description IS 'Описание урока. Показывается клиенту ниже видео.';
COMMENT ON COLUMN public.lessons.question IS 'Вопрос к уроку для клиента. Показывается при завершении урока.';
COMMENT ON COLUMN public.lessons.allow_photo_upload IS 'Разрешение загрузки фото результата задания. Влияет только на функционал.';

-- 3) Создаем таблицу user_progress (если не существует)
CREATE TABLE IF NOT EXISTS public.user_progress (
  telegram_user_id bigint NOT NULL,
  lesson_id bigint NOT NULL,
  status text NOT NULL CHECK (status IN ('completed', 'skipped')),
  completed_at timestamptz,
  user_answer text,
  photo_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (telegram_user_id, lesson_id),
  FOREIGN KEY (lesson_id) REFERENCES public.lessons(id) ON DELETE CASCADE
);

ALTER TABLE public.user_progress
  ADD COLUMN IF NOT EXISTS completed_at timestamptz;

ALTER TABLE public.user_progress
  ADD COLUMN IF NOT EXISTS user_answer text;

ALTER TABLE public.user_progress
  ADD COLUMN IF NOT EXISTS photo_url text;

CREATE INDEX IF NOT EXISTS user_progress_telegram_user_id_idx ON public.user_progress(telegram_user_id);
CREATE INDEX IF NOT EXISTS user_progress_lesson_id_idx ON public.user_progress(lesson_id);
CREATE INDEX IF NOT EXISTS user_progress_completed_at_idx ON public.user_progress(completed_at);

COMMENT ON TABLE public.user_progress IS 'Прогресс пользователя по урокам';
COMMENT ON COLUMN public.user_progress.completed_at IS 'Дата завершения урока. Используется для разблокировки следующего урока на следующий день.';
COMMENT ON COLUMN public.user_progress.user_answer IS 'Текстовый ответ пользователя на вопрос урока';
COMMENT ON COLUMN public.user_progress.photo_url IS 'URL загруженного фото результата задания';

-- Триггер для автоматического обновления updated_at
DROP TRIGGER IF EXISTS update_user_progress_updated_at ON public.user_progress;
CREATE TRIGGER update_user_progress_updated_at
  BEFORE UPDATE ON public.user_progress
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 4) Создаем таблицу user_course_enrollments
CREATE TABLE IF NOT EXISTS public.user_course_enrollments (
  telegram_user_id bigint NOT NULL,
  course_id bigint NOT NULL,
  enrolled_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (telegram_user_id, course_id),
  FOREIGN KEY (course_id) REFERENCES public.courses(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS user_course_enrollments_telegram_user_id_idx ON public.user_course_enrollments(telegram_user_id);
CREATE INDEX IF NOT EXISTS user_course_enrollments_course_id_idx ON public.user_course_enrollments(course_id);
CREATE INDEX IF NOT EXISTS user_course_enrollments_status_idx ON public.user_course_enrollments(status);
CREATE INDEX IF NOT EXISTS user_course_enrollments_telegram_user_status_idx ON public.user_course_enrollments(telegram_user_id, status);

COMMENT ON TABLE public.user_course_enrollments IS 'Записи пользователей на курсы';
COMMENT ON COLUMN public.user_course_enrollments.status IS 'Статус записи: active - активный курс, completed - завершен, cancelled - отменен';

-- Триггер для автоматического обновления updated_at
DROP TRIGGER IF EXISTS update_user_course_enrollments_updated_at ON public.user_course_enrollments;
CREATE TRIGGER update_user_course_enrollments_updated_at
  BEFORE UPDATE ON public.user_course_enrollments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 5) Обновляем RPC функцию create_or_update_lesson
DROP FUNCTION IF EXISTS public.create_or_update_lesson(
  p_id bigint,
  p_title text,
  p_course_id bigint,
  p_order_index int,
  p_kinescope_video_id text
);

CREATE FUNCTION public.create_or_update_lesson(
  p_id bigint default null,
  p_title text default null,
  p_course_id bigint default null,
  p_order_index int default 0,
  p_kinescope_video_id text default null,
  p_video_description text default null,
  p_lesson_description text default null,
  p_question text default null,
  p_allow_photo_upload boolean default false
)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_lesson_id bigint;
BEGIN
  -- Проверяем, что пользователь аутентифицирован через Supabase Auth
  IF auth.uid() IS NULL then
    RAISE EXCEPTION 'Требуется аутентификация';
  END IF;

  -- Валидация данных
  IF p_title IS NULL OR trim(p_title) = '' then
    RAISE EXCEPTION 'Название урока обязательно';
  END IF;

  -- Валидация Kinescope Video ID (если указан)
  IF p_kinescope_video_id IS NOT NULL AND p_kinescope_video_id !~ '^[a-zA-Z0-9_-]+$' then
    RAISE EXCEPTION 'Неверный формат Kinescope Video ID. Используйте только буквы, цифры, дефисы и подчеркивания.';
  END IF;

  -- Если передан ID, обновляем существующий урок
  IF p_id IS NOT NULL then
    UPDATE public.lessons
    SET
      title = p_title,
      course_id = p_course_id,
      order_index = p_order_index,
      kinescope_video_id = p_kinescope_video_id,
      video_description = p_video_description,
      lesson_description = p_lesson_description,
      question = p_question,
      allow_photo_upload = COALESCE(p_allow_photo_upload, false)
    WHERE id = p_id
    RETURNING id INTO v_lesson_id;

    IF v_lesson_id IS NULL then
      RAISE EXCEPTION 'Урок с ID % не найден', p_id;
    END IF;

    RETURN v_lesson_id;
  ELSE
    -- Создаём новый урок
    INSERT INTO public.lessons (
      title,
      course_id,
      order_index,
      kinescope_video_id,
      video_description,
      lesson_description,
      question,
      allow_photo_upload
    )
    VALUES (
      p_title,
      p_course_id,
      p_order_index,
      p_kinescope_video_id,
      p_video_description,
      p_lesson_description,
      p_question,
      COALESCE(p_allow_photo_upload, false)
    )
    RETURNING id INTO v_lesson_id;

    RETURN v_lesson_id;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_or_update_lesson TO authenticated;

-- 6) Создаем RPC функцию start_course
CREATE OR REPLACE FUNCTION public.start_course(
  p_telegram_user_id bigint,
  p_course_id bigint
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_course_price numeric(12, 2);
  v_user_balance numeric(12, 2);
  v_active_enrollment bigint;
  v_enrollment_id bigint;
BEGIN
  -- Проверяем, что передан telegram_user_id
  IF p_telegram_user_id IS NULL then
    RAISE EXCEPTION 'Требуется telegram_user_id';
  END IF;

  -- Получаем стоимость курса
  SELECT price INTO v_course_price
  FROM public.courses
  WHERE id = p_course_id;

  IF v_course_price IS NULL then
    RAISE EXCEPTION 'Курс с ID % не найден', p_course_id;
  END IF;

  -- Проверяем наличие активного курса
  SELECT course_id INTO v_active_enrollment
  FROM public.user_course_enrollments
  WHERE telegram_user_id = p_telegram_user_id
    AND status = 'active'
  LIMIT 1;

  IF v_active_enrollment IS NOT NULL then
    RAISE EXCEPTION 'У вас уже есть активный курс. Завершите его, чтобы начать новый.';
  END IF;

  -- Проверяем баланс пользователя
  SELECT balance INTO v_user_balance
  FROM public.user_balance
  WHERE telegram_user_id = p_telegram_user_id;

  IF v_user_balance IS NULL then
    -- Создаем баланс, если его нет
    INSERT INTO public.user_balance (telegram_user_id, balance)
    VALUES (p_telegram_user_id, 0.00)
    ON CONFLICT (telegram_user_id) DO NOTHING;
    v_user_balance := 0.00;
  END IF;

  IF v_user_balance < v_course_price then
    RAISE EXCEPTION 'Недостаточно средств на балансе. Требуется: %, доступно: %', v_course_price, v_user_balance;
  END IF;

  -- Создаем запись о записи на курс
  INSERT INTO public.user_course_enrollments (telegram_user_id, course_id, status)
  VALUES (p_telegram_user_id, p_course_id, 'active')
  ON CONFLICT (telegram_user_id, course_id) 
  DO UPDATE SET 
    status = 'active',
    enrolled_at = now(),
    updated_at = now()
  RETURNING course_id INTO v_enrollment_id;

  -- Списываем стоимость с баланса
  UPDATE public.user_balance
  SET balance = balance - v_course_price,
      updated_at = now()
  WHERE telegram_user_id = p_telegram_user_id;

  -- Возвращаем результат
  RETURN json_build_object(
    'success', true,
    'course_id', p_course_id,
    'price', v_course_price,
    'remaining_balance', v_user_balance - v_course_price
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.start_course TO authenticated;
GRANT EXECUTE ON FUNCTION public.start_course TO anon;

-- 7) RLS политики для user_progress
ALTER TABLE public.user_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Пользователи могут читать свой прогресс" ON public.user_progress;
CREATE POLICY "Пользователи могут читать свой прогресс"
  ON public.user_progress
  FOR SELECT
  USING (
    telegram_user_id = (current_setting('request.jwt.claims', true)::json->>'telegram_user_id')::bigint
    OR telegram_user_id = (current_setting('request.jwt.claims', true)::json->>'telegram_user_id')::text::bigint
  );

DROP POLICY IF EXISTS "Пользователи могут создавать свой прогресс" ON public.user_progress;
CREATE POLICY "Пользователи могут создавать свой прогресс"
  ON public.user_progress
  FOR INSERT
  WITH CHECK (
    telegram_user_id = (current_setting('request.jwt.claims', true)::json->>'telegram_user_id')::bigint
    OR telegram_user_id = (current_setting('request.jwt.claims', true)::json->>'telegram_user_id')::text::bigint
  );

DROP POLICY IF EXISTS "Пользователи могут обновлять свой прогресс" ON public.user_progress;
CREATE POLICY "Пользователи могут обновлять свой прогресс"
  ON public.user_progress
  FOR UPDATE
  USING (
    telegram_user_id = (current_setting('request.jwt.claims', true)::json->>'telegram_user_id')::bigint
    OR telegram_user_id = (current_setting('request.jwt.claims', true)::json->>'telegram_user_id')::text::bigint
  )
  WITH CHECK (
    telegram_user_id = (current_setting('request.jwt.claims', true)::json->>'telegram_user_id')::bigint
    OR telegram_user_id = (current_setting('request.jwt.claims', true)::json->>'telegram_user_id')::text::bigint
  );

-- 8) RLS политики для user_course_enrollments
ALTER TABLE public.user_course_enrollments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Пользователи могут читать свои записи на курсы" ON public.user_course_enrollments;
CREATE POLICY "Пользователи могут читать свои записи на курсы"
  ON public.user_course_enrollments
  FOR SELECT
  USING (
    telegram_user_id = (current_setting('request.jwt.claims', true)::json->>'telegram_user_id')::bigint
    OR telegram_user_id = (current_setting('request.jwt.claims', true)::json->>'telegram_user_id')::text::bigint
  );

DROP POLICY IF EXISTS "Пользователи могут создавать записи на курсы" ON public.user_course_enrollments;
CREATE POLICY "Пользователи могут создавать записи на курсы"
  ON public.user_course_enrollments
  FOR INSERT
  WITH CHECK (
    telegram_user_id = (current_setting('request.jwt.claims', true)::json->>'telegram_user_id')::bigint
    OR telegram_user_id = (current_setting('request.jwt.claims', true)::json->>'telegram_user_id')::text::bigint
  );

DROP POLICY IF EXISTS "Пользователи могут обновлять свои записи на курсы" ON public.user_course_enrollments;
CREATE POLICY "Пользователи могут обновлять свои записи на курсы"
  ON public.user_course_enrollments
  FOR UPDATE
  USING (
    telegram_user_id = (current_setting('request.jwt.claims', true)::json->>'telegram_user_id')::bigint
    OR telegram_user_id = (current_setting('request.jwt.claims', true)::json->>'telegram_user_id')::text::bigint
  )
  WITH CHECK (
    telegram_user_id = (current_setting('request.jwt.claims', true)::json->>'telegram_user_id')::bigint
    OR telegram_user_id = (current_setting('request.jwt.claims', true)::json->>'telegram_user_id')::text::bigint
  );

-- 9) Функция для проверки доступности урока
CREATE OR REPLACE FUNCTION public.is_lesson_unlocked(
  p_telegram_user_id bigint,
  p_lesson_id bigint
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_lesson_order int;
  v_course_id bigint;
  v_previous_lesson_id bigint;
  v_previous_completed_at timestamptz;
  v_enrollment_status text;
  v_is_unlocked boolean;
  v_message text;
BEGIN
  -- Получаем информацию об уроке
  SELECT order_index, course_id INTO v_lesson_order, v_course_id
  FROM public.lessons
  WHERE id = p_lesson_id;

  IF v_course_id IS NULL then
    RETURN json_build_object('unlocked', false, 'message', 'Урок не найден');
  END IF;

  -- Проверяем, записан ли пользователь на курс
  SELECT status INTO v_enrollment_status
  FROM public.user_course_enrollments
  WHERE telegram_user_id = p_telegram_user_id
    AND course_id = v_course_id;

  IF v_enrollment_status IS NULL OR v_enrollment_status != 'active' then
    RETURN json_build_object('unlocked', false, 'message', 'Вы не записаны на этот курс');
  END IF;

  -- Первый урок всегда доступен
  IF v_lesson_order = 1 then
    RETURN json_build_object('unlocked', true, 'message', 'Урок доступен');
  END IF;

  -- Находим предыдущий урок
  SELECT id INTO v_previous_lesson_id
  FROM public.lessons
  WHERE course_id = v_course_id
    AND order_index = v_lesson_order - 1
  LIMIT 1;

  IF v_previous_lesson_id IS NULL then
    RETURN json_build_object('unlocked', true, 'message', 'Урок доступен');
  END IF;

  -- Проверяем, завершен ли предыдущий урок
  SELECT completed_at INTO v_previous_completed_at
  FROM public.user_progress
  WHERE telegram_user_id = p_telegram_user_id
    AND lesson_id = v_previous_lesson_id
    AND status = 'completed';

  IF v_previous_completed_at IS NULL then
    RETURN json_build_object('unlocked', false, 'message', 'Сначала завершите предыдущий урок');
  END IF;

  -- Проверяем, прошел ли следующий календарный день
  IF date(v_previous_completed_at) >= CURRENT_DATE then
    RETURN json_build_object(
      'unlocked', false, 
      'message', 'Следующий урок будет доступен завтра'
    );
  END IF;

  RETURN json_build_object('unlocked', true, 'message', 'Урок доступен');
END;
$$;

GRANT EXECUTE ON FUNCTION public.is_lesson_unlocked TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_lesson_unlocked TO anon;
