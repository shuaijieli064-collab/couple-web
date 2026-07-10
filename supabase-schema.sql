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
create policy "已认证用户可添加任务" on daily_tasks for insert with check (auth.role() = 'authenticated');
create policy "已认证用户可更新任务" on daily_tasks for update using (auth.role() = 'authenticated');
create policy "已认证用户可删除任务" on daily_tasks for delete using (auth.role() = 'authenticated');

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
create policy "已认证用户可添加题目" on quiz_questions for insert with check (auth.role() = 'authenticated');
create policy "已认证用户可更新题目" on quiz_questions for update using (auth.role() = 'authenticated');
create policy "已认证用户可删除题目" on quiz_questions for delete using (auth.role() = 'authenticated');

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

-- ============================================
-- 扩展预设数据: 更多每日任务模板
-- ============================================
insert into daily_tasks (content, category) values
('为对方做一份爱心早餐', 'sweet'),
('一起给对方取一个新的昵称', 'funny'),
('互相给对方画一幅简笔画', 'challenge'),
('拍一张你们手牵手的照片', 'photo'),
('一起列出对方的三个优点', 'sweet'),
('给对方写一封情书（哪怕只有三句话）', 'sweet'),
('一起看一部你们都喜欢的电影', 'memory'),
('给对方讲一个冷笑话', 'funny'),
('一起制定一个周末小计划', 'challenge'),
('拍一张今天对方最好看的照片发给Ta', 'photo'),
('为对方唱一首歌（或播放一首属于你们的歌）', 'sweet'),
('一起做一道菜（哪怕只是煮泡面）', 'challenge'),
('互相说出对方今天穿的衣服颜色', 'funny'),
('一起翻一张以前的合照，回忆当时的故事', 'memory'),
('给对方一个长达10秒的拥抱', 'sweet'),
('一起在家附近散步15分钟', 'photo'),
('用对方的语气发一条朋友圈/状态', 'funny'),
('一起写下彼此的三个小愿望', 'challenge'),
('给对方准备一个小惊喜（不需要花钱）', 'sweet'),
('拍一段15秒的搞怪视频发给对方', 'photo');

-- ============================================
-- 扩展预设数据: 更多默契问答题目
-- ============================================
insert into quiz_questions (question, category) values
('Ta最想去哪个国家旅行？', 'preference'),
('Ta吃火锅必点的三样菜是什么？', 'food'),
('Ta觉得自己最大的优点是什么？', 'habit'),
('你们第一次一起吃饭吃的是什么？', 'memory'),
('Ta心情不好的时候最喜欢做什么？', 'habit'),
('Ta更喜欢猫还是狗？', 'preference'),
('Ta的手机壁纸是什么？', 'preference'),
('你们认识多久了？（精确到月）', 'memory'),
('Ta最不能忍受的习惯是什么？', 'habit'),
('Ta小时候的梦想是什么？', 'preference'),
('Ta更喜欢吃甜还是吃辣？', 'food'),
('Ta最喜欢的歌手/乐队是谁？', 'preference'),
('Ta周末更喜欢宅家还是出门？', 'habit'),
('你们第一次互送礼物送的是什么？', 'memory'),
('Ta最近最想学的一项技能是什么？', 'preference'),
('Ta喝咖啡还是奶茶？', 'food'),
('Ta最欣赏你身上的哪个特质？', 'habit'),
('你们第一次一起看的电影是什么？', 'memory'),
('Ta如果有三天假期最想去哪里？', 'preference'),
('Ta最擅长的家务是什么？', 'habit');

-- ============================================
-- Calendar Events (共享日历)
-- ============================================
create table calendar_events (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  description text,
  event_date date not null,
  event_type text not null default 'other',
  created_by uuid references profiles(id) on delete cascade not null,
  created_at timestamptz default now()
);

alter table calendar_events enable row level security;
create policy "已认证用户可查看日历事件" on calendar_events for select using (auth.role() = 'authenticated');
create policy "已认证用户可创建日历事件" on calendar_events for insert with check (auth.role() = 'authenticated');
create policy "已认证用户可更新日历事件" on calendar_events for update using (auth.role() = 'authenticated');
create policy "已认证用户可删除日历事件" on calendar_events for delete using (auth.role() = 'authenticated');

create index idx_calendar_events_date on calendar_events(event_date);

-- ============================================
-- Check-ins (早安晚安打卡)
-- ============================================
create table checkins (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references profiles(id) on delete cascade not null,
  checkin_type text not null check (checkin_type in ('morning', 'night')),
  checkin_date date not null,
  checkin_time time not null,
  message text,
  created_at timestamptz default now(),
  unique(user_id, checkin_type, checkin_date)
);

alter table checkins enable row level security;
create policy "已认证用户可查看打卡" on checkins for select using (auth.role() = 'authenticated');
create policy "用户可创建自己的打卡" on checkins for insert with check (auth.uid() = user_id);
create policy "用户可删除自己的打卡" on checkins for delete using (auth.uid() = user_id);

create index idx_checkins_date on checkins(checkin_date desc);

-- ============================================
-- Mood Bubbles (心情气泡)
-- ============================================
create table mood_bubbles (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references profiles(id) on delete cascade not null,
  mood text not null,
  message text,
  created_at timestamptz default now(),
  expires_at timestamptz
);

alter table mood_bubbles enable row level security;
create policy "已认证用户可查看心情" on mood_bubbles for select using (auth.role() = 'authenticated');
create policy "用户可创建自己的心情" on mood_bubbles for insert with check (auth.uid() = user_id);
create policy "用户可删除自己的心情" on mood_bubbles for delete using (auth.uid() = user_id);

create index idx_mood_bubbles_created on mood_bubbles(created_at desc);

-- ============================================
-- Wish Items (愿望清单)
-- ============================================
create table wish_items (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  description text,
  category text not null default 'other',
  status text not null default 'pending',
  created_by uuid references profiles(id) on delete cascade not null,
  completed_at timestamptz,
  created_at timestamptz default now()
);

alter table wish_items enable row level security;
create policy "已认证用户可查看愿望" on wish_items for select using (auth.role() = 'authenticated');
create policy "已认证用户可创建愿望" on wish_items for insert with check (auth.role() = 'authenticated');
create policy "已认证用户可更新愿望" on wish_items for update using (auth.role() = 'authenticated');
create policy "已认证用户可删除愿望" on wish_items for delete using (auth.role() = 'authenticated');

create index idx_wish_items_status on wish_items(status);

-- ============================================
-- Love Letters (定时情书)
-- ============================================
create table love_letters (
  id uuid primary key default uuid_generate_v4(),
  from_user uuid references profiles(id) on delete cascade not null,
  to_user uuid references profiles(id) on delete cascade not null,
  title text not null,
  content text not null,
  scheduled_at timestamptz not null,
  sent boolean default false,
  read_at timestamptz,
  created_at timestamptz default now()
);

alter table love_letters enable row level security;
create policy "已认证用户可查看情书" on love_letters for select using (auth.role() = 'authenticated');
create policy "用户可发送情书" on love_letters for insert with check (auth.uid() = from_user);
create policy "用户可更新自己的情书" on love_letters for update using (auth.uid() = from_user or auth.uid() = to_user);
create policy "用户可删除自己的情书" on love_letters for delete using (auth.uid() = from_user);

create index idx_love_letters_scheduled on love_letters(scheduled_at);
create index idx_love_letters_sent on love_letters(sent);

-- ============================================
-- Draw Guess Rounds (你画我猜)
-- ============================================
create table draw_guess_rounds (
  id uuid primary key default uuid_generate_v4(),
  word text not null,
  drawer_id uuid references profiles(id) on delete cascade not null,
  guesser_id uuid references profiles(id) on delete cascade,
  image_url text,
  guess text,
  correct boolean,
  status text not null default 'drawing',
  created_at timestamptz default now(),
  completed_at timestamptz
);

alter table draw_guess_rounds enable row level security;
create policy "已认证用户可查看你画我猜" on draw_guess_rounds for select using (auth.role() = 'authenticated');
create policy "已认证用户可创建你画我猜" on draw_guess_rounds for insert with check (auth.role() = 'authenticated');
create policy "已认证用户可更新你画我猜" on draw_guess_rounds for update using (auth.role() = 'authenticated');

-- ============================================
-- Truth or Dare Rounds (真心话大冒险)
-- ============================================
create table truth_dare_rounds (
  id uuid primary key default uuid_generate_v4(),
  type text not null check (type in ('truth', 'dare')),
  content text not null,
  created_by uuid references profiles(id) on delete cascade not null,
  target_user uuid references profiles(id) on delete cascade not null,
  response text,
  status text not null default 'pending',
  created_at timestamptz default now(),
  responded_at timestamptz
);

alter table truth_dare_rounds enable row level security;
create policy "已认证用户可查看真心话大冒险" on truth_dare_rounds for select using (auth.role() = 'authenticated');
create policy "已认证用户可创建真心话大冒险" on truth_dare_rounds for insert with check (auth.role() = 'authenticated');
create policy "已认证用户可更新真心话大冒险" on truth_dare_rounds for update using (auth.role() = 'authenticated');

-- ============================================
-- 预设数据: 你画我猜词库
-- ============================================
-- (词库在前端代码中维护，不需要预设)

-- ============================================
-- 预设数据: 真心话大冒险题库
-- ============================================
-- (题库在前端代码中维护，不需要预设)
