create table if not exists draw_guess_rounds (
  id uuid primary key default uuid_generate_v4(),
  word text not null,
  drawer_id uuid references profiles(id) on delete cascade not null,
  drawing_data text,
  guess text,
  guessed boolean not null default false,
  guessed_correctly boolean not null default false,
  created_at timestamptz default now()
);

alter table draw_guess_rounds enable row level security;
drop policy if exists "已认证用户可查看你画我猜" on draw_guess_rounds;
create policy "已认证用户可查看你画我猜" on draw_guess_rounds for select using (auth.role() = 'authenticated');
drop policy if exists "已认证用户可创建你画我猜" on draw_guess_rounds;
create policy "已认证用户可创建你画我猜" on draw_guess_rounds for insert with check (auth.role() = 'authenticated');
drop policy if exists "已认证用户可更新你画我猜" on draw_guess_rounds;
create policy "已认证用户可更新你画我猜" on draw_guess_rounds for update using (auth.role() = 'authenticated');

create index idx_draw_guess_drawer on draw_guess_rounds(drawer_id);
create index idx_draw_guess_created on draw_guess_rounds(created_at desc);