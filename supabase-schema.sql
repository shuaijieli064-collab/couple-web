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
