-- ============================================
-- 通知系统 - 数据库迁移
-- 在 Supabase SQL Editor 中执行此文件
-- ============================================

-- 启用 pg_cron 扩展（用于定时情书投递）
create extension if not exists pg_cron;

-- ============================================
-- 1. Notifications 表
-- ============================================
create table notifications (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references profiles(id) on delete cascade not null,
  from_user_id uuid references profiles(id) on delete set null,
  type text not null check (type in (
    'diary_comment', 'checkin', 'mood', 'wish_update',
    'love_letter', 'calendar_event', 'anniversary_reminder'
  )),
  title text not null,
  message text,
  related_id uuid,
  read_at timestamptz,
  created_at timestamptz default now()
);

alter table notifications enable row level security;

create policy "用户可查看自己的通知"
  on notifications for select using (auth.uid() = user_id);

create policy "系统可插入通知"
  on notifications for insert with check (auth.role() = 'authenticated');

create policy "用户可更新自己的通知"
  on notifications for update using (auth.uid() = user_id);

create policy "用户可删除自己的通知"
  on notifications for delete using (auth.uid() = user_id);

create index idx_notifications_user_id on notifications(user_id);
create index idx_notifications_read_at on notifications(read_at);
create index idx_notifications_created_at on notifications(created_at desc);

-- 启用 Realtime
alter publication supabase_realtime add table notifications;

-- ============================================
-- 2. Push Subscriptions 表
-- ============================================
create table push_subscriptions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references profiles(id) on delete cascade not null,
  endpoint text not null,
  p256dh text not null,
  auth_key text not null,
  created_at timestamptz default now(),
  unique(user_id, endpoint)
);

alter table push_subscriptions enable row level security;

create policy "用户可管理自己的推送订阅"
  on push_subscriptions for all using (auth.uid() = user_id);

-- ============================================
-- 3. 通知触发器函数
-- ============================================

-- 通用函数：创建通知（不给自己发）
create or replace function create_notification(
  p_user_id uuid,
  p_from_user_id uuid,
  p_type text,
  p_title text,
  p_message text default null,
  p_related_id uuid default null
) returns void as $$
begin
  if p_user_id = p_from_user_id then
    return;
  end if;
  insert into notifications (user_id, from_user_id, type, title, message, related_id)
  values (p_user_id, p_from_user_id, p_type, p_title, p_message, p_related_id);
end;
$$ language plpgsql security definer;

-- 获取伴侣 ID 的辅助函数
create or replace function get_partner_id(p_user_id uuid)
returns uuid as $$
  select id from profiles where id != p_user_id limit 1;
$$ language sql security definer;

-- 日记评论触发器
create or replace function notify_diary_comment()
returns trigger as $$
declare
  diary_owner uuid;
  commenter_name text;
begin
  select d.user_id into diary_owner
  from diary_entries d where d.id = new.diary_id;

  select display_name into commenter_name
  from profiles where id = new.user_id;

  perform create_notification(
    diary_owner,
    new.user_id,
    'diary_comment',
    commenter_name || ' 评论了你的日记',
    new.content,
    new.diary_id
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_diary_comment
  after insert on diary_comments
  for each row execute procedure notify_diary_comment();

-- 签到触发器
create or replace function notify_checkin()
returns trigger as $$
declare
  partner uuid;
  checker_name text;
  type_label text;
begin
  partner := get_partner_id(new.user_id);

  select display_name into checker_name
  from profiles where id = new.user_id;

  if new.checkin_type = 'morning' then
    type_label := '早安卡';
  else
    type_label := '晚安卡';
  end if;

  perform create_notification(
    partner,
    new.user_id,
    'checkin',
    checker_name || ' 打了' || type_label,
    new.message,
    new.id
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_checkin
  after insert on checkins
  for each row execute procedure notify_checkin();

-- 心情分享触发器
create or replace function notify_mood()
returns trigger as $$
declare
  partner uuid;
  mooder_name text;
begin
  partner := get_partner_id(new.user_id);

  select display_name into mooder_name
  from profiles where id = new.user_id;

  perform create_notification(
    partner,
    new.user_id,
    'mood',
    mooder_name || ' 分享了新心情',
    new.mood,
    new.id
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_mood
  after insert on mood_bubbles
  for each row execute procedure notify_mood();

-- 愿望更新触发器
create or replace function notify_wish_update()
returns trigger as $$
declare
  partner uuid;
  wisher_name text;
  status_label text;
begin
  if old.status = new.status then
    return new;
  end if;

  partner := get_partner_id(new.created_by);

  select display_name into wisher_name
  from profiles where id = new.created_by;

  if new.status = 'completed' then
    status_label := '完成了愿望';
  elsif new.status = 'in_progress' then
    status_label := '开始实现愿望';
  else
    status_label := '更新了愿望';
  end if;

  perform create_notification(
    partner,
    new.created_by,
    'wish_update',
    wisher_name || ' ' || status_label,
    new.title,
    new.id
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_wish_update
  after update on wish_items
  for each row execute procedure notify_wish_update();

-- 情书触发器
create or replace function notify_love_letter()
returns trigger as $$
declare
  sender_name text;
begin
  if new.sent = false then
    return new;
  end if;

  select display_name into sender_name
  from profiles where id = new.from_user;

  perform create_notification(
    new.to_user,
    new.from_user,
    'love_letter',
    '你收到了一封来自 ' || sender_name || ' 的情书',
    new.title,
    new.id
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_love_letter
  after insert or update on love_letters
  for each row execute procedure notify_love_letter();

-- 日历事件触发器
create or replace function notify_calendar_event()
returns trigger as $$
declare
  partner uuid;
  creator_name text;
begin
  partner := get_partner_id(new.created_by);

  select display_name into creator_name
  from profiles where id = new.created_by;

  perform create_notification(
    partner,
    new.created_by,
    'calendar_event',
    creator_name || ' 创建了新事件: ' || new.title,
    new.description,
    new.id
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_calendar_event
  after insert on calendar_events
  for each row execute procedure notify_calendar_event();

-- ============================================
-- 4. 定时情书投递（pg_cron）
-- ============================================
select cron.schedule(
  'deliver-love-letters',
  '* * * * *',
  $$
    update love_letters
    set sent = true
    where scheduled_at <= now()
    and sent = false;
  $$
);

-- ============================================
-- 5. 推送通知 Webhook（触发 Edge Function）
-- ============================================
-- 需要在 Supabase Dashboard 中配置：
-- 进入 Database > Webhooks > Create webhook
-- Name: send-push-notification
-- Table: notifications
-- Events: INSERT
-- Type: HTTP Request
-- Method: POST
-- URL: https://<YOUR_PROJECT_REF>.supabase.co/functions/v1/send-push
-- Headers: Authorization: Bearer <YOUR_ANON_KEY>
-- Body: {
--   "notification_id": "{{record.id}}",
--   "user_id": "{{record.user_id}}",
--   "title": "{{record.title}}",
--   "message": "{{record.message}}",
--   "url": "/"
-- }
