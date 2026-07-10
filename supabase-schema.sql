-- 情侣生活记录网站 - Supabase 数据库 schema
-- 在 Supabase SQL Editor 中执行此文件

-- 启用 UUID 扩展
create extension if not exists "uuid-ossp";

-- ============================================
-- Profiles (扩展 auth.users)
-- ============================================
create table profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  display_name text not null,
  avatar_url text,
  mood_status text default '',
  last_active_at timestamptz default now(),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table profiles enable row level security;

create policy "已认证用户可查看所有资料"
  on profiles for select using (auth.role() = 'authenticated');

create policy "用户可更新自己的资料"
  on profiles for update using (auth.uid() = id);

-- 注册时自动创建 profile
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', '另一半'));
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================
-- Albums (相册)
-- ============================================
create table albums (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references profiles(id) on delete cascade not null,
  title text not null,
  description text,
  cover_photo_url text,
  created_at timestamptz default now()
);

alter table albums enable row level security;

create policy "已认证用户可查看相册" on albums for select using (auth.role() = 'authenticated');
create policy "用户可管理自己的相册" on albums for all using (auth.uid() = user_id);

-- ============================================
-- Photos (照片)
-- ============================================
create table photos (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references profiles(id) on delete cascade not null,
  album_id uuid references albums(id) on delete set null,
  storage_path text not null,
  url text not null,
  caption text,
  taken_at timestamptz,
  created_at timestamptz default now()
);

alter table photos enable row level security;

create policy "已认证用户可查看照片" on photos for select using (auth.role() = 'authenticated');
create policy "用户可管理自己的照片" on photos for all using (auth.uid() = user_id);

create index idx_photos_album_id on photos(album_id);
create index idx_photos_created_at on photos(created_at desc);

-- ============================================
-- Diary Entries (日记)
-- ============================================
create table diary_entries (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references profiles(id) on delete cascade not null,
  title text not null,
  content text not null,
  date date not null,
  photo_attachments uuid[],
  mood text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table diary_entries enable row level security;

create policy "已认证用户可查看日记" on diary_entries for select using (auth.role() = 'authenticated');
create policy "用户可管理自己的日记" on diary_entries for all using (auth.uid() = user_id);

create index idx_diary_date on diary_entries(date desc);

-- ============================================
-- Diary Comments (日记评论)
-- ============================================
create table diary_comments (
  id uuid primary key default uuid_generate_v4(),
  diary_id uuid references diary_entries(id) on delete cascade not null,
  user_id uuid references profiles(id) on delete cascade not null,
  content text not null,
  created_at timestamptz default now()
);

alter table diary_comments enable row level security;

create policy "已认证用户可查看评论"
  on diary_comments for select using (auth.role() = 'authenticated');

create policy "已认证用户可创建评论"
  on diary_comments for insert with check (auth.role() = 'authenticated');

create policy "用户可删除自己的评论"
  on diary_comments for delete using (auth.uid() = user_id);

create index idx_diary_comments_diary_id on diary_comments(diary_id);
create index idx_diary_comments_created_at on diary_comments(created_at asc);

-- ============================================
-- Anniversaries (纪念日)
-- ============================================
create table anniversaries (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references profiles(id) on delete cascade not null,
  title text not null,
  date date not null,
  recurring boolean default true,
  created_at timestamptz default now()
);

alter table anniversaries enable row level security;

create policy "已认证用户可查看纪念日" on anniversaries for select using (auth.role() = 'authenticated');
create policy "用户可管理自己的纪念日" on anniversaries for all using (auth.uid() = user_id);

-- ============================================
-- 存储策略说明:
-- 所有文件(照片+头像)都存储在 photos bucket 中
-- 照片路径: {user_id}/{timestamp}_{random}.{ext}
-- 头像路径: {user_id}/avatar.{ext}
-- 以下策略同时适用于照片和头像:

create policy "已认证用户可上传文件"
  on storage.objects for insert with check (
    bucket_id = 'photos' and auth.role() = 'authenticated'
  );
create policy "任何人可查看文件"
  on storage.objects for select using (bucket_id = 'photos');
create policy "用户可删除自己的文件"
  on storage.objects for delete using (
    bucket_id = 'photos' and auth.uid()::text = (storage.foldername(name))[1]
  );

-- 如果需要独立的 avatars bucket，可额外执行:
-- create policy "已认证用户可上传头像"
--   on storage.objects for insert with check (
--     bucket_id = 'avatars' and auth.role() = 'authenticated'
--   );
-- create policy "任何人可查看头像"
--   on storage.objects for select using (bucket_id = 'avatars');

-- ============================================
-- Daily Tasks (每日任务模板库)
-- ============================================
create table daily_tasks (
  id uuid primary key default uuid_generate_v4(),
  content text not null,
  category text not null default 'sweet',
  difficulty int default 1,
  created_at timestamptz default now()
);

alter table daily_tasks enable row level security;
create policy "已认证用户可查看任务" on daily_tasks for select using (auth.role() = 'authenticated');

-- ============================================
-- Task Completions (任务完成记录)
-- ============================================
create table task_completions (
  id uuid primary key default uuid_generate_v4(),
  task_id uuid references daily_tasks(id) on delete cascade not null,
  user_id uuid references profiles(id) on delete cascade not null,
  completed_date date not null,
  completed_at timestamptz default now(),
  unique(task_id, user_id, completed_date)
);

alter table task_completions enable row level security;
create policy "已认证用户可查看完成记录" on task_completions for select using (auth.role() = 'authenticated');
create policy "用户可创建自己的完成记录" on task_completions for insert with check (auth.uid() = user_id);
create policy "用户可删除自己的完成记录" on task_completions for delete using (auth.uid() = user_id);

create index idx_task_completions_date on task_completions(completed_date desc);
create index idx_task_completions_user on task_completions(user_id);

-- ============================================
-- Quiz Questions (默契问答题目库)
-- ============================================
create table quiz_questions (
  id uuid primary key default uuid_generate_v4(),
  question text not null,
  category text not null default 'memory',
  created_at timestamptz default now()
);

alter table quiz_questions enable row level security;
create policy "已认证用户可查看题目" on quiz_questions for select using (auth.role() = 'authenticated');

-- ============================================
-- Quiz Sessions (问答游戏会话)
-- ============================================
create table quiz_sessions (
  id uuid primary key default uuid_generate_v4(),
  created_by uuid references profiles(id) on delete cascade not null,
  question_ids uuid[] not null,
  player1_id uuid references profiles(id) on delete cascade not null,
  player2_id uuid references profiles(id) on delete cascade,
  player1_done boolean default false,
  player2_done boolean default false,
  status text default 'waiting',
  created_at timestamptz default now(),
  completed_at timestamptz
);

alter table quiz_sessions enable row level security;
create policy "已认证用户可查看会话" on quiz_sessions for select using (auth.role() = 'authenticated');
create policy "用户可创建会话" on quiz_sessions for insert with check (auth.uid() = created_by);
create policy "用户可更新自己的会话" on quiz_sessions for update using (auth.uid() = player1_id or auth.uid() = player2_id);

-- ============================================
-- Quiz Answers (问答答案记录)
-- ============================================
create table quiz_answers (
  id uuid primary key default uuid_generate_v4(),
  session_id uuid references quiz_sessions(id) on delete cascade not null,
  question_id uuid references quiz_questions(id) on delete cascade not null,
  user_id uuid references profiles(id) on delete cascade not null,
  answer text not null,
  created_at timestamptz default now(),
  unique(session_id, question_id, user_id)
);

alter table quiz_answers enable row level security;
create policy "已认证用户可查看答案" on quiz_answers for select using (auth.role() = 'authenticated');
create policy "用户可提交自己的答案" on quiz_answers for insert with check (auth.uid() = user_id);

-- ============================================
-- 预设数据: 每日任务模板
-- ============================================
insert into daily_tasks (content, category) values
('给对方发一条语音说"我爱你"', 'sweet'),
('一起拍一张搞怪自拍', 'photo'),
('为对方做一件小事（倒杯水/捶捶背）', 'sweet'),
('互相分享今天最开心的一件事', 'funny'),
('用三个词形容对方，然后告诉Ta', 'challenge'),
('一起回忆第一次见面的场景', 'memory'),
('给对方写一句手写便签/留言', 'sweet'),
('拍一张今天的天空照片发给对方', 'photo'),
('互相问一个你一直想了解的关于Ta的问题', 'challenge'),
('模仿对方最经典的口头禅或表情', 'funny');

-- ============================================
-- 预设数据: 默契问答题目
-- ============================================
insert into quiz_questions (question, category) values
('Ta最喜欢吃什么食物？', 'food'),
('Ta最害怕什么东西？', 'habit'),
('你们第一次约会去了哪里？', 'memory'),
('Ta生气的时候通常是什么表现？', 'habit'),
('Ta最喜欢的颜色是什么？', 'preference'),
('你们第一次牵手是在什么时候？', 'memory'),
('Ta的口头禅是什么？', 'habit'),
('Ta最喜欢的电影/电视剧是哪部？', 'preference'),
('Ta最喜欢的季节是什么？', 'preference'),
('你们之间最难忘的纪念日是哪一个？', 'memory'),
('Ta的理想旅行目的地是哪里？', 'preference'),
('Ta最讨厌的食物是什么？', 'food'),
('Ta的起床气严重吗？', 'habit'),
('Ta最喜欢的动物是什么？', 'preference'),
('你们第一次吵架是因为什么？', 'memory');
