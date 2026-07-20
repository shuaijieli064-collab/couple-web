-- ============================================
-- 安全策略升级：基于伴侣关系的权限控制
-- 在 Supabase SQL Editor 中执行此文件
-- ============================================

-- ========== 1. 添加伴侣字段 ==========
-- 为 profiles 表添加 partner_id 字段，用于关联情侣关系
alter table profiles add column if not exists partner_id uuid references profiles(id);

-- ========== 2. 更新 profiles 表策略 ==========
-- 删除旧策略
drop policy if exists "已认证用户可查看所有资料" on profiles;
drop policy if exists "用户可更新自己的资料" on profiles;

-- 创建新策略：用户和伴侣可查看资料
create policy "用户和伴侣可查看资料" on profiles for select using (
  auth.uid() = id 
  OR auth.uid() = partner_id 
  OR partner_id = auth.uid()
);

-- 用户可更新自己的资料
create policy "用户可更新自己的资料" on profiles for update using (auth.uid() = id);

-- ========== 3. 更新 photos 表策略 ==========
drop policy if exists "已认证用户可查看照片" on photos;
drop policy if exists "用户可管理自己的照片" on photos;

create policy "用户和伴侣可查看照片" on photos for select using (
  auth.uid() = user_id 
  OR (select partner_id from profiles where id = auth.uid()) = user_id
);

create policy "用户可管理自己的照片" on photos for all using (auth.uid() = user_id);

-- ========== 4. 更新 albums 表策略 ==========
drop policy if exists "已认证用户可查看相册" on albums;
drop policy if exists "用户可管理自己的相册" on albums;

create policy "用户和伴侣可查看相册" on albums for select using (
  auth.uid() = user_id 
  OR (select partner_id from profiles where id = auth.uid()) = user_id
);

create policy "用户可管理自己的相册" on albums for all using (auth.uid() = user_id);

-- ========== 5. 更新 diary_entries 表策略 ==========
drop policy if exists "已认证用户可查看日记" on diary_entries;
drop policy if exists "用户可管理自己的日记" on diary_entries;

create policy "用户和伴侣可查看日记" on diary_entries for select using (
  auth.uid() = user_id 
  OR (select partner_id from profiles where id = auth.uid()) = user_id
);

create policy "用户可管理自己的日记" on diary_entries for all using (auth.uid() = user_id);

-- ========== 6. 更新 diary_comments 表策略 ==========
-- 评论策略保持不变，因为评论是关联到日记的
-- 但为了更安全，我们确保只有日记的作者和伴侣能查看评论

drop policy if exists "已认证用户可查看评论" on diary_comments;

create policy "日记作者和伴侣可查看评论" on diary_comments for select using (
  auth.uid() = (select user_id from diary_entries where id = diary_comments.diary_id)
  OR (select partner_id from profiles where id = auth.uid()) = (select user_id from diary_entries where id = diary_comments.diary_id)
);

-- ========== 7. 更新 anniversaries 表策略 ==========
drop policy if exists "已认证用户可查看纪念日" on anniversaries;
drop policy if exists "用户可管理自己的纪念日" on anniversaries;

create policy "用户和伴侣可查看纪念日" on anniversaries for select using (
  auth.uid() = user_id 
  OR (select partner_id from profiles where id = auth.uid()) = user_id
);

create policy "用户可管理自己的纪念日" on anniversaries for all using (auth.uid() = user_id);

-- ========== 8. 更新 checkins 表策略 ==========
drop policy if exists "已认证用户可查看打卡" on checkins;
drop policy if exists "用户可创建自己的打卡" on checkins;
drop policy if exists "用户可删除自己的打卡" on checkins;

create policy "用户和伴侣可查看打卡" on checkins for select using (
  auth.uid() = user_id 
  OR (select partner_id from profiles where id = auth.uid()) = user_id
);

create policy "用户可创建自己的打卡" on checkins for insert with check (auth.uid() = user_id);
create policy "用户可删除自己的打卡" on checkins for delete using (auth.uid() = user_id);

-- ========== 9. 更新 mood_bubbles 表策略 ==========
drop policy if exists "已认证用户可查看心情" on mood_bubbles;
drop policy if exists "用户可创建自己的心情" on mood_bubbles;
drop policy if exists "用户可删除自己的心情" on mood_bubbles;

create policy "用户和伴侣可查看心情" on mood_bubbles for select using (
  auth.uid() = user_id 
  OR (select partner_id from profiles where id = auth.uid()) = user_id
);

create policy "用户可创建自己的心情" on mood_bubbles for insert with check (auth.uid() = user_id);
create policy "用户可删除自己的心情" on mood_bubbles for delete using (auth.uid() = user_id);

-- ========== 10. 更新 wish_items 表策略 ==========
drop policy if exists "已认证用户可查看愿望" on wish_items;
drop policy if exists "已认证用户可创建愿望" on wish_items;
drop policy if exists "已认证用户可更新愿望" on wish_items;
drop policy if exists "已认证用户可删除愿望" on wish_items;

create policy "用户和伴侣可查看愿望" on wish_items for select using (
  auth.uid() = created_by 
  OR (select partner_id from profiles where id = auth.uid()) = created_by
);

create policy "用户可创建愿望" on wish_items for insert with check (auth.uid() = created_by);
create policy "用户可更新愿望" on wish_items for update using (auth.uid() = created_by);
create policy "用户可删除愿望" on wish_items for delete using (auth.uid() = created_by);

-- ========== 11. 更新 love_letters 表策略 ==========
drop policy if exists "已认证用户可查看情书" on love_letters;
drop policy if exists "用户可发送情书" on love_letters;
drop policy if exists "用户可更新自己的情书" on love_letters;
drop policy if exists "用户可删除自己的情书" on love_letters;

create policy "发送者和接收者可查看情书" on love_letters for select using (
  auth.uid() = from_user 
  OR auth.uid() = to_user
);

create policy "用户可发送情书" on love_letters for insert with check (auth.uid() = from_user);
create policy "用户可更新自己的情书" on love_letters for update using (auth.uid() = from_user or auth.uid() = to_user);
create policy "用户可删除自己的情书" on love_letters for delete using (auth.uid() = from_user);

-- ========== 12. 更新存储策略 ==========
-- 删除"任何人可查看文件"策略，改为仅认证用户可访问
drop policy if exists "任何人可查看文件" on storage.objects;

create policy "已认证用户可查看文件" on storage.objects for select using (
  bucket_id = 'photos' and auth.role() = 'authenticated'
);

-- ========== 13. 修复 diary_entries photo_attachments 类型 ==========
-- 将 uuid[] 改为 text[]，以匹配前端存储的 URL 数组
alter table diary_entries alter column photo_attachments type text[] using photo_attachments::text[];

-- ========== 14. 更新 calendar_events 表策略 ==========
drop policy if exists "已认证用户可查看日历事件" on calendar_events;
drop policy if exists "已认证用户可创建日历事件" on calendar_events;
drop policy if exists "已认证用户可更新日历事件" on calendar_events;
drop policy if exists "已认证用户可删除日历事件" on calendar_events;

create policy "用户和伴侣可查看日历事件" on calendar_events for select using (
  auth.uid() = created_by 
  OR (select partner_id from profiles where id = auth.uid()) = created_by
);

create policy "用户可创建日历事件" on calendar_events for insert with check (auth.uid() = created_by);
create policy "用户可更新日历事件" on calendar_events for update using (auth.uid() = created_by);
create policy "用户可删除日历事件" on calendar_events for delete using (auth.uid() = created_by);

-- ============================================
-- 使用说明：
-- 1. 在 Supabase SQL Editor 中执行此文件
-- 2. 执行后，在 profiles 表中设置伴侣关系：
--    update profiles set partner_id = '<伴侣用户ID>' where id = '<你的用户ID>';
--    update profiles set partner_id = '<你的用户ID>' where id = '<伴侣用户ID>';
-- 3. 确保前端使用环境变量配置 Supabase 密钥
-- ============================================