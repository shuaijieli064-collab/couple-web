create table if not exists truth_dare_rounds (
  id uuid primary key default uuid_generate_v4(),
  type text not null check (type in ('truth', 'dare')),
  content text not null,
  challenger uuid references profiles(id) on delete cascade not null,
  created_at timestamptz default now()
);

alter table truth_dare_rounds enable row level security;
drop policy if exists "已认证用户可查看真心话大冒险" on truth_dare_rounds;
create policy "已认证用户可查看真心话大冒险" on truth_dare_rounds for select using (auth.role() = 'authenticated');
drop policy if exists "已认证用户可创建真心话大冒险" on truth_dare_rounds;
create policy "已认证用户可创建真心话大冒险" on truth_dare_rounds for insert with check (auth.role() = 'authenticated');
drop policy if exists "已认证用户可更新真心话大冒险" on truth_dare_rounds;
create policy "已认证用户可更新真心话大冒险" on truth_dare_rounds for update using (auth.role() = 'authenticated');

create index idx_truth_dare_challenger on truth_dare_rounds(challenger);
create index idx_truth_dare_created on truth_dare_rounds(created_at desc);