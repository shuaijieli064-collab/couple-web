# Code Wiki - 情侣生活记录应用

## 项目概述

**项目名称**: couple-web
**版本**: 0.0.0
**类型**: 情侣生活记录Web应用 (PWA)
**核心功能**: 照片分享、日记记录、纪念日管理、实时在线状态

这是一个为情侣设计的私密生活记录平台，支持用户上传照片、撰写日记、管理纪念日，并通过实时在线状态增强互动体验。应用采用PWA技术，可安装到手机作为独立应用使用。

---

## 1. 项目架构

### 1.1 技术栈

| 层级 | 技术选型 | 版本 |
|------|---------|------|
| **前端框架** | React | 19.2.6 |
| **开发语言** | TypeScript | 6.0.2 |
| **构建工具** | Vite | 8.0.12 |
| **样式方案** | Tailwind CSS | 4.x (通过 @tailwindcss/vite) |
| **路由管理** | react-router-dom | 7.15.1 |
| **后端服务** | Supabase | 2.106.1 |
| **PWA支持** | vite-plugin-pwa | 1.3.0 |
| **日期处理** | date-fns | 4.3.0 |
| **Markdown渲染** | react-markdown + remark-gfm | 10.1.0 + 4.0.1 |

### 1.2 架构设计图

```
┌─────────────────────────────────────────────────────────┐
│                     用户界面层                            │
│  ┌──────┬──────┬──────┬──────┬──────┬──────┬──────┐    │
│  │首页  │照片  │日记  │纪念  │设置  │登录  │布局  │    │
│  │HomePage│Photos│Diary│Anniv│Settings│Auth│Layout│    │
│  └──────┴──────┴──────┴──────┴──────┴──────┴──────┘    │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│                     状态管理层                            │
│  ┌──────────────────┬──────────────────┐               │
│  │   AuthContext    │   Local State    │               │
│  │ (全局认证状态)    │ (组件内状态)      │               │
│  └──────────────────┴──────────────────┘               │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│                     数据访问层                            │
│  ┌──────────────────────────────────────────┐          │
│  │         Supabase Client                  │          │
│  │  - Auth (认证服务)                        │          │
│  │  - Database (PostgreSQL数据库)            │          │
│  │  - Storage (文件存储)                     │          │
│  │  - Realtime (实时通信)                    │          │
│  └──────────────────────────────────────────┐          │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│                   Supabase云服务                          │
│  ┌──────────┬──────────┬──────────┬──────────┐         │
│  │profiles  │photos    │diary_    │annivers  │         │
│  │(用户表)   │(照片表)   │entries   │aries     │         │
│  │          │          │(日记表)   │(纪念日)   │         │
│  └──────────┴──────────┴──────────┴──────────┘         │
│  ┌──────────┬──────────┬──────────┐                    │
│  │albums    │diary_    │Storage   │                    │
│  │(相册表)   │comments  │Bucket    │                    │
│  │          │(评论表)   │(photos)  │                    │
│  └──────────┴──────────┴──────────┘                    │
└─────────────────────────────────────────────────────────┘
```

### 1.3 目录结构

```
couple_web/
├── src/
│   ├── components/           # UI组件目录
│   │   ├── anniversaries/    # 纪念日模块
│   │   │   └── AnniversariesPage.tsx
│   │   ├── auth/             # 认证模块
│   │   │   └── AuthPage.tsx
│   │   ├── common/           # 通用组件
│   │   │   ├── Avatar.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── EmptyState.tsx
│   │   │   ├── InstallPrompt.tsx
│   │   │   ├── Modal.tsx
│   │   │   └── UpdatePrompt.tsx
│   │   ├── diary/            # 日记模块
│   │   │   └── DiaryPage.tsx
│   │   ├── home/             # 首页模块
│   │   │   ├── CountdownCard.tsx
│   │   │   ├── HomePage.tsx
│   │   │   └── PartnerStatusCard.tsx
│   │   ├── layout/           # 布局组件
│   │   │   ├── AppLayout.tsx
│   │   │   ├── BottomTab.tsx
│   │   │   └── Sidebar.tsx
│   │   ├── photos/           # 照片模块
│   │   │   └── PhotosPage.tsx
│   │   └── settings/         # 设置模块
│   │       └── SettingsPage.tsx
│   ├── contexts/             # React Context
│   │   └── AuthContext.tsx   # 全局认证状态管理
│   ├── lib/                  # 第三方库配置
│   │   └── supabase.ts       # Supabase客户端初始化
│   ├── types/                # TypeScript类型定义
│   │   ├── canvas-confetti.d.ts
│   │   └── database.ts       # 数据库实体类型
│   ├── utils/                # 工具函数
│   │   ├── cn.ts             # Tailwind类名合并工具
│   │   └── dateUtils.ts      # 日期处理工具
│   ├── App.tsx               # 应用主组件(路由配置)
│   ├── main.tsx              # 应用入口
│   ├── index.css             # 全局样式与自定义主题
│   └── vite-env.d.ts         # Vite环境类型声明
├── public/                   # 静态资源
│   ├── app-icon.svg
│   ├── apple-touch-icon.png
│   ├── favicon-32x32.png
│   ├── favicon.svg
│   ├── icons.svg
│   ├── pwa-192x192.png
│   └── pwa-512x512.png
├── scripts/                  # 构建脚本
│   └ generate-pwa-icons.mjs  # PWA图标生成脚本
├── supabase-schema.sql       # 数据库Schema定义
├── vite.config.ts            # Vite配置(PWA、Tailwind)
├── package.json              # 项目依赖配置
├── tsconfig.json             # TypeScript配置
├── .env.example              # 环境变量示例
├── vercel.json               # Vercel部署配置
└── index.html                # HTML入口模板
```

---

## 2. 主要模块职责

### 2.1 认证模块 (Auth)

**文件**: [src/components/auth/AuthPage.tsx](file:///d:/Claude%20Code/couple_web/src/components/auth/AuthPage.tsx)

**职责**:
- 提供用户登录/注册界面
- 支持邮箱+密码认证方式
- 处理认证状态变化，自动跳转
- 美化的渐变背景动画效果

**关键特性**:
- 双模式切换：登录/注册
- 表单验证：邮箱格式、密码长度(至少6位)
- 错误提示：Supabase错误信息本地化展示
- 已登录用户自动跳转至首页

### 2.2 首页模块 (Home)

**文件**: [src/components/home/HomePage.tsx](file:///d:/Claude%20Code/couple_web/src/components/home/HomePage.tsx)

**职责**:
- 展示个性化欢迎信息
- 显示伴侣在线状态（实时Presence）
- 纪念日倒计时卡片
- 最近照片快速预览
- 最近日记摘要

**关键特性**:
- **实时在线状态**: 通过Supabase Realtime Presence实现伴侣在线检测
- **纪念日智能排序**: 按日期升序排列，最近纪念日优先显示
- **懒加载策略**: 所有数据并行加载，优化性能
- **空状态友好提示**: 无数据时显示引导性EmptyState

### 2.3 照片模块 (Photos)

**文件**: [src/components/photos/PhotosPage.tsx](file:///d:/Claude%20Code/couple_web/src/components/photos/PhotosPage.tsx)

**职责**:
- 照片上传与管理
- 相册创建与组织
- 多选批量操作（批量添加到相册）
- 照片删除与预览

**关键特性**:
- **多级视图**: 主页面(所有照片+相册列表) → 相册详情(单相册照片)
- **批量操作**: 多选模式，支持批量添加到指定相册
- **文件限制**: 单张照片最大10MB
- **存储路径**: `{user_id}/{timestamp}_{random}.{ext}`
- **拖拽上传**: 支持拖拽文件到上传区域

### 2.4 日记模块 (Diary)

**文件**: [src/components/diary/DiaryPage.tsx](file:///d:/Claude%20Code/couple_web/src/components/diary/DiaryPage.tsx)

**职责**:
- 日记创建与编辑
- 日记列表展示（时间线/日历双视图）
- 日记评论系统
- Markdown内容渲染

**关键特性**:
- **双视图模式**: 时间线视图(按时间顺序) + 日历视图(按月展示)
- **Markdown支持**: 使用react-markdown + remark-gfm解析内容
- **心情标签**: 8种预设心情表情可选
- **评论互动**: 支持多用户评论，评论删除权限控制
- **作者归属**: 每篇日记显示作者信息与头像

### 2.5 纪念日模块 (Anniversaries)

**文件**: [src/components/anniversaries/AnniversariesPage.tsx](file:///d:/Claude%20Code/couple_web/src/components/anniversaries/AnniversariesPage.tsx)

**职责**:
- 纪念日添加与管理
- 智能倒计时计算
- 今日纪念日庆祝特效

**关键特性**:
- **重复模式**: 支持每年重复/仅一次两种模式
- **智能计算**: 自动处理跨年倒计时逻辑
- **庆祝特效**: 今日纪念日触发confetti动画
- **视觉反馈**: 今日纪念日卡片特殊样式（渐变背景+动画）

### 2.6 设置模块 (Settings)

**文件**: [src/components/settings/SettingsPage.tsx](file:///d:/Claude%20Code/couple_web/src/components/settings/SettingsPage.tsx)

**职责**:
- 用户资料编辑（昵称、心情状态）
- 头像上传与更换
- PWA安装指南
- 账户退出登录

**关键特性**:
- **头像管理**: 使用相同的photos storage bucket，路径 `{user_id}/avatar.{ext}`
- **实时同步**: 保存后立即刷新全局AuthContext中的profile状态
- **安装引导**: 提供PWA安装到手机的详细步骤说明

---

## 3. 关键类与函数说明

### 3.1 认证相关

#### AuthContext

**文件**: [src/contexts/AuthContext.tsx](file:///d:/Claude%20Code/couple_web/src/contexts/AuthContext.tsx)

```typescript
interface AuthContextType {
  session: Session | null       // Supabase会话对象
  user: User | null             // 当前用户对象
  profile: Profile | null       // 用户资料(Profile表)
  loading: boolean              // 加载状态
  signOut: () => Promise<void>  // 退出登录函数
  refreshProfile: (userId: string) => Promise<void>  // 刷新用户资料
}
```

**核心函数**:

| 函数名 | 功能说明 | 关键逻辑 |
|--------|---------|---------|
| `AuthProvider` | Context Provider组件 | 监听认证状态变化，自动获取用户profile |
| `fetchProfile` | 获取用户资料 | 从profiles表查询用户信息 |
| `refreshProfile` | 刷新用户资料 | 用于设置页保存后同步更新 |
| `useAuth` | Hook函数 | 返回AuthContext值，供组件消费 |

**关键代码片段**:

```typescript
// 监听认证状态变化
useEffect(() => {
  supabase.auth.getSession().then(({ data: { session } }) => {
    setSession(session)
    setUser(session?.user ?? null)
    if (session?.user) fetchProfile(session.user.id)
  })

  const { data: { subscription } } = supabase.auth.onAuthStateChange(
    (_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) fetchProfile(session.user.id)
    }
  )

  return () => subscription.unsubscribe()
}, [])
```

### 3.2 工具函数

#### 日期处理工具

**文件**: [src/utils/dateUtils.ts](file:///d:/Claude%20Code/couple_web/src/utils/dateUtils.ts)

| 函数名 | 参数 | 返回值 | 功能说明 |
|--------|------|--------|---------|
| `formatDate` | `dateStr: string` | `string` | 格式化为"yyyy年M月d日"中文格式 |
| `formatRelative` | `dateStr: string` | `string` | 相对时间格式（如"3天前"） |
| `countdownDays` | `dateStr: string, recurring?: boolean` | `{days, label, isToday}` | 智能倒计时计算 |

**countdownDays核心逻辑**:

```typescript
export function countdownDays(dateStr: string, recurring = false) {
  const target = parseISO(dateStr)
  const now = new Date()
  
  // 处理重复纪念日：如果目标日期已过，计算明年同一日期
  let targetDate = new Date(now.getFullYear(), target.getMonth(), target.getDate())
  if (targetDate < now && recurring) {
    targetDate = new Date(now.getFullYear() + 1, target.getMonth(), target.getDate())
  }
  
  const days = differenceInDays(targetDate, now)
  const isToday = days === 0
  
  // 根据距离天数生成友好标签
  let label: string
  if (isToday) label = '就是今天！'
  else if (days > 0) label = `还有 ${days} 天`
  else label = `${Math.abs(days)} 天前`
  
  return { days, label, isToday }
}
```

#### Tailwind类名合并工具

**文件**: [src/utils/cn.ts](file:///d:/Claude%20Code/couple_web/src/utils/cn.ts)

```typescript
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

**用途**: 合并Tailwind CSS类名，处理类名冲突和条件类名。

### 3.3 Supabase客户端

**文件**: [src/lib/supabase.ts](file:///d:/Claude%20Code/couple_web/src/lib/supabase.ts)

```typescript
export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)
```

**环境变量要求**:
- `VITE_SUPABASE_URL`: Supabase项目URL
- `VITE_SUPABASE_ANON_KEY`: Supabase匿名密钥

### 3.4 数据类型定义

**文件**: [src/types/database.ts](file:///d:/Claude%20Code/couple_web/src/types/database.ts)

定义了6个核心数据实体接口：

| 类型名 | 对应数据库表 | 主要字段 |
|--------|------------|---------|
| `Profile` | profiles | id, display_name, avatar_url, mood_status |
| `Album` | albums | id, user_id, title, description, cover_photo_url |
| `Photo` | photos | id, user_id, album_id, storage_path, url, caption |
| `DiaryEntry` | diary_entries | id, user_id, title, content, date, mood |
| `DiaryComment` | diary_comments | id, diary_id, user_id, content, author |
| `Anniversary` | anniversaries | id, user_id, title, date, recurring |

---

## 4. 依赖关系与数据流

### 4.1 组件依赖关系图

```
App.tsx (顶层路由)
  │
  ├─ AuthProvider (Context Provider)
  │   └─ AuthPage (登录页)
  │       └─ InstallPrompt
  │
  ├─ AppRoutes (需认证的路由组)
  │   └─ AppLayout (布局容器)
  │       ├─ Sidebar (桌面端侧边栏)
  │       ├─ BottomTab (移动端底部导航)
  │       ├─ InstallPrompt (PWA安装提示)
  │       │
  │       ├─ HomePage
  │       │   ├─ PartnerStatusCard
  │       │   ├─ CountdownCard
  │       │   ├─ Card
  │       │   └─ EmptyState
  │       │
  │       ├─ PhotosPage
  │       │   ├─ Card
  │       │   ├─ Modal
  │       │   ├─ UploadModal (内嵌组件)
  │       │   ├─ PickerModal (内嵌组件)
  │       │   └─ AlbumForm (内嵌组件)
  │       │
  │       ├─ DiaryPage
  │       │   ├─ Card
  │       │   ├─ Modal
  │       │   ├─ EmptyState
  │       │   ├─ DiaryEditor (内嵌组件)
  │       │   ├─ DiaryTimeline (内嵌组件)
  │       │   ├─ DiaryCalendarView (内嵌组件)
  │       │   ├─ CommentsSection (内嵌组件)
  │       │   └─ Avatar
  │       │
  │       ├─ AnniversariesPage
  │       │   ├─ Card
  │       │   ├─ Modal
  │       │   ├─ EmptyState
  │       │   ├─ AnniversaryCard (内嵌组件)
  │       │   ├─ CelebrationBanner (内嵌组件)
  │       │   └ AnniversaryForm (内嵌组件)
  │       │
  │       └─ SettingsPage
  │           ├─ Card
  │           ├─ Avatar
  │           ├─ Modal
  │           └─ InstallAppGuide
```

### 4.2 数据流向图

```
用户操作
    │
    ↓
UI组件 (组件内useState管理局部状态)
    │
    ↓
Supabase Client API调用
    │
    ├─→ Auth API (认证操作)
    │     └─→ AuthContext更新全局状态
    │           └─→ 所有依赖组件重新渲染
    │
    ├─→ Database API (数据操作)
    │     ├─ SELECT查询 (获取数据)
    │     ├─ INSERT插入 (创建数据)
    │     ├─ UPDATE更新 (修改数据)
    │     └ DELETE删除 (删除数据)
    │     └─→ 更新组件局部状态
    │
    ├─→ Storage API (文件操作)
    │     ├─ upload上传文件
    │     ├─ getPublicUrl获取URL
    │     └─ remove删除文件
    │     └─→ 更新数据库记录
    │
    └─→ Realtime API (实时通信)
          └─→ Presence状态同步
                └─→ 在线状态实时更新
```

### 4.3 第三方库依赖关系

```
核心依赖:
  react ← react-dom ← react-router-dom
       ↑
       └─ @types/react, @types/react-dom

状态管理:
  @supabase/supabase-js
       ↓
  AuthContext (全局状态)

样式系统:
  tailwindcss ← @tailwindcss/vite
       ↓
  clsx + tailwind-merge ← cn工具函数

日期处理:
  date-fns
       ↓
  dateUtils.ts (封装函数)

内容渲染:
  react-markdown ← remark-gfm
       ↓
  DiaryPage (日记内容渲染)

特效:
  canvas-confetti
       ↓
  AnniversariesPage (庆祝动画)
```

---

## 5. 数据库设计

### 5.1 表结构概览

**Schema文件**: [supabase-schema.sql](file:///d:/Claude%20Code/couple_web/supabase-schema.sql)

| 表名 | 用途 | 关键字段 | RLS策略 |
|------|------|---------|---------|
| **profiles** | 扩展用户资料 | id(UUID外键), display_name, avatar_url, mood_status | 已认证用户可查看所有，用户可更新自己 |
| **albums** | 照片相册 | id, user_id, title, description, cover_photo_url | 已认证用户可查看，用户可管理自己 |
| **photos** | 照片记录 | id, user_id, album_id, storage_path, url, caption | 已认证用户可查看，用户可管理自己 |
| **diary_entries** | 日记条目 | id, user_id, title, content, date, mood | 已认证用户可查看，用户可管理自己 |
| **diary_comments** | 日记评论 | id, diary_id, user_id, content | 已认证用户可查看/创建，用户可删除自己 |
| **anniversaries** | 纪念日 | id, user_id, title, date, recurring | 已认证用户可查看，用户可管理自己 |

### 5.2 关键数据库功能

#### 自动创建Profile触发器

```sql
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
```

**作用**: 用户注册时自动创建profile记录，默认昵称"另一半"。

#### 索引优化

```sql
-- 照片查询优化
create index idx_photos_album_id on photos(album_id);
create index idx_photos_created_at on photos(created_at desc);

-- 日记查询优化
create index idx_diary_date on diary_entries(date desc);

-- 评论查询优化
create index idx_diary_comments_diary_id on diary_comments(diary_id);
create index idx_diary_comments_created_at on diary_comments(created_at asc);
```

### 5.3 Storage Bucket策略

**Bucket**: `photos`

**存储路径规则**:
- 照片: `{user_id}/{timestamp}_{random}.{ext}`
- 头像: `{user_id}/avatar.{ext}`

**权限策略**:
```sql
-- 已认证用户可上传
create policy "已认证用户可上传文件"
  on storage.objects for insert with check (
    bucket_id = 'photos' and auth.role() = 'authenticated'
  );

-- 公开可读
create policy "任何人可查看文件"
  on storage.objects for select using (bucket_id = 'photos');

-- 用户只能删除自己的文件
create policy "用户可删除自己的文件"
  on storage.objects for delete using (
    bucket_id = 'photos' and auth.uid()::text = (storage.foldername(name))[1]
  );
```

---

## 6. 项目运行方式

### 6.1 开发环境配置

#### 前置要求
- Node.js (建议 v18+)
- npm 或 yarn
- Supabase账号与项目

#### 配置步骤

1. **克隆项目**
```bash
git clone <repository-url>
cd couple_web
```

2. **安装依赖**
```bash
npm install
```

3. **配置环境变量**

复制 `.env.example` 到 `.env.local`:
```bash
cp .env.example .env.local
```

编辑 `.env.local`，填入Supabase配置:
```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

4. **初始化数据库**

在Supabase SQL Editor中执行 [supabase-schema.sql](file:///d:/Claude%20Code/couple_web/supabase-schema.sql) 文件内容。

5. **创建Storage Bucket**

在Supabase Storage中创建名为 `photos` 的bucket。

### 6.2 启动命令

| 命令 | 功能 | 说明 |
|------|------|------|
| `npm run dev` | 启动开发服务器 | Vite开发模式，支持HMR，监听 `--host` (局域网访问) |
| `npm run build` | 生产构建 | TypeScript编译 + Vite打包，自动生成PWA图标 |
| `npm run preview` | 预览生产构建 | 本地预览打包后的应用 |
| `npm run lint` | 代码检查 | ESLint静态分析 |
| `npm run generate:icons` | 生成PWA图标 | 使用sharp生成192x192和512x512图标 |

### 6.3 开发服务器特性

**Vite配置亮点** ([vite.config.ts](file:///d:/Claude%20Code/couple_web/vite.config.ts)):

```typescript
VitePWA({
  registerType: 'autoUpdate',  // 自动更新Service Worker
  workbox: {
    // 图片缓存策略：CacheFirst，缓存30天
    runtimeCaching: [
      {
        urlPattern: /^https:\/\/.*\.supabase\.co\/storage\/v1\/object\/.*/i,
        handler: 'CacheFirst',
        options: {
          cacheName: 'supabase-images',
          expiration: { maxEntries: 120, maxAgeSeconds: 60 * 60 * 24 * 30 }
        }
      },
      // API缓存策略：NetworkFirst，超时10秒
      {
        urlPattern: /^https:\/\/.*\.supabase\.co\/rest\/v1\/.*/i,
        handler: 'NetworkFirst',
        options: {
          cacheName: 'supabase-api',
          networkTimeoutSeconds: 10,
          expiration: { maxEntries: 50, maxAgeSeconds: 60 * 5 }
        }
      }
    ]
  }
})
```

### 6.4 PWA特性

**Manifest配置**:
```json
{
  "name": "我们的时光",
  "short_name": "我们的时光",
  "description": "记录属于我们的每一个瞬间",
  "theme_color": "#f55082",      // 樱花粉主题色
  "background_color": "#fff5f7", // 浅粉背景
  "display": "standalone",       // 独立应用模式
  "orientation": "portrait-primary", // 竖屏优先
  "lang": "zh-CN"
}
```

### 6.5 部署配置

**Vercel部署** ([vercel.json](file:///d:/Claude%20Code/couple_web/vercel.json)):

```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

**用途**: 支持SPA路由，所有路径重定向到index.html。

---

## 7. 样式系统说明

### 7.1 Tailwind主题配置

**文件**: [src/index.css](file:///d:/Claude%20Code/couple_web/src/index.css)

自定义了4套色彩系统：

#### 樱花粉 (sakura) - 主色
- sakura-50 (#fff5f7) ~ sakura-900 (#8b1a46)
- 主色调: sakura-500 (#f55082)

#### 蜜桃色 (peach) - 辅助色
- peach-50 (#fff8f0) ~ peach-900 (#753613)
- 用于: 温暖色调、渐变搭配

#### 淡紫 (lilac) - 点缀色
- lilac-50 (#faf5ff) ~ lilac-900 (#581c87)
- 用于: 特殊元素、视觉层次

#### 云灰 (cloud) - 中性色
- cloud-50 (#fafafa) ~ cloud-900 (#18181b)
- 用于: 文字颜色、背景、边框

### 7.2 自定义动画

```css
@keyframes float-gentle {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-4px); }
}

@keyframes sparkle {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.7; transform: scale(1.05); }
}

@keyframes pulse-slow {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.8; }
}

@keyframes wiggle {
  0%, 100% { transform: rotate(0deg); }
  25% { transform: rotate(-3deg); }
  75% { transform: rotate(3deg); }
}
```

**应用场景**:
- `float-gentle`: 登录页装饰元素浮动动画
- `sparkle`: 今日纪念日卡片闪烁效果
- `pulse-slow`: 按钮脉动效果
- `wiggle`: 交互反馈动画

### 7.3 字体配置

```css
@import url('https://fonts.googleapis.com/css2?family=Quicksand:wght@300;400;500;600;700&family=Nunito:wght@300;400;500;600;700;800&display=swap');

body {
  font-family: 'Nunito', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}

/* 特殊标题使用Quicksand字体 */
h1, h2 {
  font-family: "'Quicksand', sans-serif";
}
```

---

## 8. 特殊功能实现

### 8.1 实时在线状态

**实现文件**: [src/components/home/HomePage.tsx](file:///d:/Claude%20Code/couple_web/src/components/home/HomePage.tsx) (第25-52行)

```typescript
// Presence channel订阅
const channel = supabase.channel('presence', {
  config: { presence: { key: user.id } },
})

channel
  .on('presence', { event: 'sync' }, () => {
    const state = channel.presenceState()
    const onlineUsers = Object.keys(state)
    if (partner && onlineUsers.includes(partner.id)) {
      setIsPartnerOnline(true)
    } else {
      setIsPartnerOnline(false)
    }
  })
  .subscribe(async (status) => {
    if (status === 'SUBSCRIBED') {
      await channel.track({ online_at: new Date().toISOString() })
    }
  })
```

**技术要点**:
- 使用Supabase Realtime Presence API
- 用户上线时track自己的状态
- 监听sync事件获取所有在线用户列表
- 对比伴侣ID判断在线状态

### 8.2 Markdown日记内容

**实现文件**: [src/components/diary/DiaryPage.tsx](file:///d:/Claude%20Code/couple_web/src/components/diary/DiaryPage.tsx) (第116-117行)

```typescript
<ReactMarkdown remarkPlugins={[remarkGfm]}>
  {selectedEntry.content}
</ReactMarkdown>
```

**支持特性**:
- GitHub Flavored Markdown (GFM)
- 表格、任务列表、删除线等扩展语法
- 安全渲染（防XSS）

### 8.3 纪念日庆祝特效

**实现文件**: [src/components/anniversaries/AnniversariesPage.tsx](file:///d:/Claude%20Code/couple_web/src/components/anniversaries/AnniversariesPage.tsx) (第28-32行)

```typescript
// 检测今日纪念日，触发庆祝动画
const today = new Date().toISOString().split('T')[0]
if (data?.some((a: Anniversary) => a.date.startsWith(today) || a.date === today)) {
  confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } })
}
```

**视觉效果**:
- 使用canvas-confetti库
- 从屏幕中上部喷射100个彩色粒子
- 散射角度70度

### 8.4 PWA安装提示

**实现文件**: [src/components/common/InstallPrompt.tsx](file:///d:/Claude%20Code/couple_web/src/components/common/InstallPrompt.tsx)

**功能**:
- 检测PWA可安装状态
- 提供iOS/Android安装引导
- 支持beforeinstallprompt事件（Android）
- iOS Safari手动添加指南

---

## 9. 性能优化策略

### 9.1 数据加载优化

**并行查询** ([PhotosPage.tsx](file:///d:/Claude%20Code/couple_web/src/components/photos/PhotosPage.tsx) 第32-35行):
```typescript
const [photosRes, albumsRes] = await Promise.all([
  supabase.from('photos').select('*').order('created_at', { ascending: false }),
  supabase.from('albums').select('*').order('created_at', { ascending: false }),
])
```

**批量作者查询** ([DiaryPage.tsx](file:///d:/Claude%20Code/couple_web/src/components/diary/DiaryPage.tsx) 第36-48行):
```typescript
// 避免 N+1 查询问题
const userIds = Array.from(new Set(diaryEntries.map((e) => e.user_id)))
const { data: profilesData } = await supabase
  .from('profiles')
  .select('*')
  .in('id', userIds)

// 构建ID->Profile映射，一次性关联
const profilesById = Object.fromEntries((profilesData as Profile[]).map((p) => [p.id, p]))
const entriesWithAuthors = diaryEntries.map((entry) => ({ ...entry, author: profilesById[entry.user_id] }))
```

### 9.2 Service Worker缓存策略

| 资源类型 | 缓存策略 | 最大条目数 | 缓存时长 |
|---------|---------|-----------|---------|
| Supabase图片 | CacheFirst | 120 | 30天 |
| Supabase API | NetworkFirst | 50 | 5分钟 |
| 静态资源(JS/CSS/HTML) | Precache | - | 永久(更新时自动刷新) |

### 9.3 图片限制

- **上传限制**: 单张照片最大10MB
- **格式支持**: JPG, PNG, WebP
- **存储路径**: 使用时间戳+随机字符串防止文件名冲突

---

## 10. 安全机制

### 10.1 Row Level Security (RLS)

所有数据表启用RLS，确保：
- 用户只能查看已认证用户的数据
- 用户只能修改/删除自己的数据
- 评论创建需要认证，删除只能删除自己的评论

### 10.2 认证流程

```
用户输入邮箱+密码
    │
    ↓
Supabase Auth API验证
    │
    ├─ 成功 → 返回Session + User对象
    │     │
    │     ↓
    │   触发onAuthStateChange
    │     │
    │     ↓
    │   AuthContext更新状态
    │     │
    │     ↓
    │   自动查询Profile表
    │     │
    │     ↓
    │   渲染受保护页面
    │
    └─ 失败 → 返回Error对象
              │
              ↓
            UI显示错误信息
```

### 10.3 文件访问控制

**Storage策略**:
- 上传需要认证
- 读取公开（通过public URL）
- 删除仅限文件所有者（通过路径中的user_id验证）

---

## 11. 开发注意事项

### 11.1 TypeScript配置

**严格模式**: 通过tsconfig.app.json继承recommendedTypeChecked规则

**环境变量类型**: 在vite-env.d.ts中声明:
```typescript
/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
}
```

### 11.2 React最佳实践

**Hook使用**:
- 所有数据获取在useEffect中执行
- 认证状态变化监听使用onAuthStateChange
- Presence订阅在组件卸载时unsubscribe

**状态管理**:
- 全局状态：AuthContext (认证、profile)
- 局部状态：useState (列表数据、UI状态)
- 不使用Redux/MobX等重量级方案

### 11.3 代码风格

**ESLint配置**: react-hooks + react-refresh插件

**命名约定**:
- 组件文件: PascalCase (HomePage.tsx)
- 工具函数: camelCase (dateUtils.ts)
- 类型接口: PascalCase (DiaryEntry)

---

## 12. 未来扩展建议

### 12.1 功能增强方向

1. **消息系统**: 实现情侣间私信功能
2. **位置分享**: 共享实时位置
3. **日历同步**: 与外部日历系统集成
4. **主题定制**: 提供更多色彩主题选择
5. **语音日记**: 支持语音记录日记

### 12.2 性能优化建议

1. **虚拟列表**: 照片/日记列表使用虚拟滚动
2. **懒加载**: 图片使用Intersection Observer懒加载
3. **骨架屏**: 数据加载时显示骨架屏而非纯文本
4. **状态持久化**: 使用localStorage缓存部分数据

### 12.3 架构改进建议

1. **状态管理升级**: 引入Zustand/Jotai替代Context
2. **组件库化**: 提取common组件为独立npm包
3. **测试覆盖**: 添加Jest + React Testing Library测试
4. **国际化**: 支持多语言切换

---

## 附录: 快速上手指南

### 最小化启动步骤

```bash
# 1. 安装依赖
npm install

# 2. 配置环境变量
cp .env.example .env.local
# 编辑.env.local，填入Supabase URL和Key

# 3. 启动开发服务器
npm run dev

# 4. 访问应用
# 打开浏览器访问 http://localhost:5173
```

### Supabase配置要点

1. **创建项目**: 在Supabase Dashboard创建新项目
2. **获取密钥**: Settings > API > URL + anon/public key
3. **执行Schema**: 在SQL Editor中执行supabase-schema.sql
4. **创建Bucket**: Storage > New bucket > 命名"photos" > Public bucket

### 常见问题排查

| 问题 | 可能原因 | 解决方案 |
|------|---------|---------|
| "Missing Supabase environment variables" | 未配置.env.local | 复制.env.example并填入正确值 |
| 登录后无Profile | 触发器未创建 | 执行supabase-schema.sql中的handle_new_user函数 |
| 图片上传失败 | Storage bucket未创建 | 在Supabase Storage创建"photos" bucket |
| 评论功能报错 | diary_comments表未创建 | 执行supabase-schema.sql中的建表语句 |
| PWA无法安装 | 不满足安装条件 | 使用HTTPS、确保manifest正确、测试浏览器兼容性 |

---

**文档版本**: v1.0
**最后更新**: 2026-07-10
**维护者**: 项目开发团队