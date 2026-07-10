# 通知系统配置指南

## 1. 数据库迁移

在 Supabase Dashboard > SQL Editor 中执行 `supabase-migrations/notifications.sql`

## 2. 环境变量

在 `.env.local` 中添加：

```
VITE_VAPID_PUBLIC_KEY=你的VAPID公钥
```

### 生成 VAPID 密钥对

```bash
npx web-push generate-vapid-keys
```

将生成的公钥设置为 `VITE_VAPID_PUBLIC_KEY`，私钥设置为 Supabase Edge Function 的环境变量。

## 3. Supabase Edge Function 部署

```bash
# 安装 Supabase CLI（如果还没安装）
npm install -g supabase

# 登录
supabase login

# 链接到你的项目
supabase link --project-ref YOUR_PROJECT_REF

# 设置 VAPID 私钥环境变量
supabase secrets set VAPID_PRIVATE_KEY=你的VAPID私钥
supabase secrets set VAPID_PUBLIC_KEY=你的VAPID公钥
supabase secrets set VAPID_SUBJECT=mailto:your@email.com

# 部署 Edge Function
supabase functions deploy send-push
```

## 4. 配置 Webhook

在 Supabase Dashboard > Database > Webhooks 中：

1. 点击 "Create webhook"
2. Name: `send-push-notification`
3. Table: `notifications`
4. Events: `INSERT`
5. Type: `HTTP Request`
6. Method: `POST`
7. URL: `https://YOUR_PROJECT_REF.supabase.co/functions/v1/send-push`
8. Headers: `Authorization: Bearer YOUR_ANON_KEY`
9. Body:

```json
{
  "notification_id": "{{record.id}}",
  "user_id": "{{record.user_id}}",
  "title": "{{record.title}}",
  "message": "{{record.message}}",
  "url": "/"
}
```

## 5. 启用 Realtime

在 Supabase Dashboard > Database > Replication：
- 确认 `notifications` 表已启用 Realtime（SQL 迁移中已包含）

## 测试

1. 登录应用
2. 浏览器会请求通知权限
3. 让伴侣执行一个操作（如发日记评论）
4. 你应该收到应用内通知 + 浏览器推送
