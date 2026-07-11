-- 戳戳游戏记录表
create table if not exists tap_records (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references profiles(id) on delete cascade not null,
  tap_count int not null default 1,
  created_at timestamptz default now(),
  unique(user_id, created_at::date)
);

alter table tap_records enable row level security;
drop policy if exists "已认证用户可查看戳戳记录" on tap_records;
create policy "已认证用户可查看戳戳记录" on tap_records for select using (auth.role() = 'authenticated');
drop policy if exists "用户可创建戳戳记录" on tap_records;
create policy "用户可创建戳戳记录" on tap_records for insert with check (auth.uid() = user_id);
drop policy if exists "用户可更新戳戳记录" on tap_records;
create policy "用户可更新戳戳记录" on tap_records for update using (auth.uid() = user_id);

create index idx_tap_records_user on tap_records(user_id);
create index idx_tap_records_date on tap_records(created_at desc);
