# 我们的时光 💕

一款专为情侣打造的生活记录 PWA 应用，记录属于你们的每一个瞬间。

## 技术栈

| 技术 | 版本 | 用途 |
|------|------|------|
| React | 19 | UI 框架 |
| TypeScript | 6 | 类型安全 |
| Vite | 8 | 构建工具 |
| Tailwind CSS | 4 | 样式（自定义樱花粉主题） |
| React Router | 7 | 路由管理 |
| Supabase | 2 | 后端（PostgreSQL + Auth + Storage + Realtime） |
| vite-plugin-pwa | 1 | PWA 离线缓存与安装 |

## 功能模块

### 🏠 首页
- 倒计时卡片（纪念日、生日等）
- 双方状态卡片（头像、心情、最后活跃时间）
- 快捷入口

### 📅 日历
- **纪念日**：管理恋爱纪念日、生日等重要日期
- **共享日历**：添加见面、旅行、假期等事件，双方共享

### ☀️ 打卡
- 早安 / 晚安打卡
- 留言功能
- 7天打卡历史可视化
- 双方打卡状态展示

### 📝 日记
- **日记**：支持 Markdown 语法，时间线 / 日历两种视图，心情标签
- **评论**：双方互评日记
- **情书**：立即发送或定时发送，精美信纸样式，已读状态追踪

### 💭 心情
- 7种心情选择（开心、想念、爱你、难过、疲惫、兴奋、生气）
- 心情气泡卡片 + 浮动动画
- 可附文字说明
- 心情记录时间线

### 🌟 愿望
- 愿望清单管理
- 5种分类（旅行、美食、活动、礼物、其他）
- 3种状态流转（待完成 → 进行中 → 已完成）

### 📷 照片
- 相册管理
- 照片上传与描述
- 拍摄时间记录

### 🎮 游戏（6个 Tab）
| Tab | 功能 |
|-----|------|
| 每日任务 | 按日期种子每日抽一个任务，双方打卡，连续天数统计 |
| 默契问答 | 随机5题，双方各自回答，对比答案计算默契度 |
| 戳戳 | 点击对方头像，爱心飘浮动画，互动值进度条 |
| 你画我猜 | Canvas 画板绘制，对方猜题，正确/错误判断 |
| 真心话 | 真心话 / 大冒险抽卡，10题内置题库 |
| 题库管理 | 管理任务模板和问答题目（增删改查） |

### ⚙️ 设置
- 个人资料编辑（昵称、头像、心情状态）
- 通知设置
- PWA 安装提示

## 项目结构

```
couple_web/
├── public/                     # 静态资源（PWA 图标、manifest）
├── src/
│   ├── App.tsx                 # 路由与 Provider 配置
│   ├── main.tsx                # 入口
│   ├── index.css               # 全局样式 + Tailwind + 动画
│   ├── lib/
│   │   └── supabase.ts         # Supabase 客户端
│   ├── contexts/
│   │   ├── AuthContext.tsx     # 认证上下文（登录/登出/资料）
│   │   └── NotificationContext.tsx  # 通知上下文
│   ├── types/
│   │   └── database.ts         # 数据库类型定义（18个接口）
│   ├── utils/
│   │   ├── dateUtils.ts        # 日期格式化
│   │   └── pushManager.ts      # Web Push 推送
│   └── components/
│       ├── auth/               # 登录页
│       ├── home/               # 首页（倒计时、状态卡片）
│       ├── calendar/           # 日历（纪念日 + 共享日历）
│       ├── checkin/            # 打卡
│       ├── diary/              # 日记（含情书 Tab）
│       ├── mood/               # 心情
│       ├── wishes/             # 愿望
│       ├── photos/             # 照片
│       ├── games/              # 游戏（6个 Tab + 题库管理）
│       ├── settings/           # 设置
│       ├── layout/             # 布局（AppLayout、BottomTab、Sidebar）
│       ├── common/             # 通用组件（Card、Modal、Avatar 等）
│       └── notifications/      # 通知系统
├── supabase-schema.sql         # 数据库建表 SQL（18张表 + RLS）
├── vite.config.ts              # Vite + PWA 配置
├── package.json
└── .env.example                # 环境变量模板
```

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

复制 `.env.example` 为 `.env.local`，填入你的 Supabase 信息：

```bash
cp .env.example .env.local
```

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

### 3. 初始化数据库

在 Supabase SQL Editor 中执行 `supabase-schema.sql`，创建全部 18 张表及 RLS 策略。

### 4. 启动开发服务器

```bash
npm run dev
```

### 5. 构建生产版本

```bash
npm run build
```

### 6. 预览构建结果

```bash
npm run preview
```

## 数据库概览

共 18 张表，均启用行级安全（RLS），已认证用户可读写：

| 表名 | 用途 |
|------|------|
| `profiles` | 用户资料（扩展 auth.users） |
| `albums` | 相册 |
| `photos` | 照片 |
| `diary_entries` | 日记条目 |
| `diary_comments` | 日记评论 |
| `anniversaries` | 纪念日 |
| `daily_tasks` | 每日任务模板 |
| `task_completions` | 任务完成记录 |
| `quiz_questions` | 默契问答题目 |
| `quiz_sessions` | 默契问答会话 |
| `quiz_answers` | 默契问答答案 |
| `calendar_events` | 共享日历事件 |
| `checkins` | 早安晚安打卡 |
| `mood_bubbles` | 心情气泡 |
| `wish_items` | 愿望清单 |
| `love_letters` | 定时情书 |
| `draw_guess_rounds` | 你画我猜 |
| `truth_dare_rounds` | 真心话大冒险 |

## 响应式设计

- **移动端**：底部 Tab 导航栏（9项），毛玻璃效果，安全区域适配
- **桌面端**：左侧边栏导航，含用户信息和通知铃铛

## PWA 特性

- 离线缓存（Workbox）
- 自动更新（`autoUpdate` 模式）
- 可安装到桌面 / 主屏幕
- 樱花粉主题色 `#f55082`
- Web Push 推送通知支持

## 部署

推荐使用 Cloudflare Pages：

1. Fork 仓库到你的 GitHub
2. 在 Cloudflare Pages 连接 GitHub 仓库
3. 设置构建命令 `npm run build`，输出目录 `dist`
4. 添加环境变量 `VITE_SUPABASE_URL` 和 `VITE_SUPABASE_ANON_KEY`
5. 部署

## 许可证

私有项目
