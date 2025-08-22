-- =================================================================================================
-- Tasks Table Schema and Policy
-- =================================================================================================

-- 1. 创建 tasks 表（基于 TypeScript 接口定义）
DO $$ 
BEGIN
  -- Check if table exists
  IF NOT EXISTS (
    SELECT FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = 'tasks'
  ) THEN
    -- Create table if it doesn't exist
    CREATE TABLE public.tasks (
      id uuid not null default gen_random_uuid(),
      title text not null,
      description text not null default '',
      status text not null default 'pending' 
        check (status in ('pending', 'in_progress', 'completed')),
      user_id uuid not null,
      created_at timestamp with time zone not null default now(),

      constraint tasks_pkey primary key (id),
      constraint tasks_user_id_fkey foreign KEY (user_id) references auth.users (id) on delete cascade
    ) TABLESPACE pg_default;
  ELSE
    -- 如果表已存在，添加缺失的字段
    BEGIN
      -- 添加 description 字段（如果不存在）
      IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'tasks' 
        AND column_name = 'description'
      ) THEN
        ALTER TABLE public.tasks ADD COLUMN description text not null default '';
      END IF;
      -- 添加 status 字段（如果不存在）
      IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'tasks' 
        AND column_name = 'status'
      ) THEN
        ALTER TABLE public.tasks ADD COLUMN status text not null default 'pending' 
          check (status in ('pending', 'in_progress', 'completed'));
      END IF;
      
      -- 确保 title 字段不为空
      ALTER TABLE public.tasks ALTER COLUMN title SET NOT NULL;
      -- 确保 user_id 字段不为空
      ALTER TABLE public.tasks ALTER COLUMN user_id SET NOT NULL;
    END;
  END IF;
END $$;

-- 2. Enable RLS and create policy if not exists
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'tasks'
    AND policyname = 'Allow users to access their own data'
  ) THEN
    -- Create policy if it doesn't exist
    CREATE POLICY "Allow users to access their own data" ON public.tasks
    TO public
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- 3. Create Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON public.tasks (user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON public.tasks (status);
CREATE INDEX IF NOT EXISTS idx_tasks_user_id_status ON public.tasks (user_id, status);
CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON public.tasks (created_at DESC);

-- 4. 为视图添加 RLS 策略
ALTER VIEW public.tasks_view SET (security_invoker = true);
