export interface Profile {
  id: string
  display_name: string
  avatar_url: string | null
  mood_status: string
  last_active_at: string
  created_at: string
  updated_at: string
}

export interface Album {
  id: string
  user_id: string
  title: string
  description: string | null
  cover_photo_url: string | null
  created_at: string
}

export interface Photo {
  id: string
  user_id: string
  album_id: string | null
  storage_path: string
  url: string
  caption: string | null
  taken_at: string | null
  created_at: string
}

export interface DiaryEntry {
  id: string
  user_id: string
  title: string
  content: string
  date: string
  photo_attachments: string[] | null
  mood: string | null
  created_at: string
  updated_at: string
}

export interface DiaryComment {
  id: string
  diary_id: string
  user_id: string
  content: string
  created_at: string
  author?: Profile
}

export interface Anniversary {
  id: string
  user_id: string
  title: string
  date: string
  recurring: boolean
  created_at: string
}

export interface DailyTask {
  id: string
  content: string
  category: string
  difficulty: number
  created_at: string
}

export interface TaskCompletion {
  id: string
  task_id: string
  user_id: string
  completed_date: string
  completed_at: string
}

export interface QuizQuestion {
  id: string
  question: string
  category: string
  created_at: string
}

export interface QuizSession {
  id: string
  created_by: string
  question_ids: string[]
  player1_id: string
  player2_id: string | null
  player1_done: boolean
  player2_done: boolean
  status: string
  created_at: string
  completed_at: string | null
}

export interface QuizAnswer {
  id: string
  session_id: string
  question_id: string
  user_id: string
  answer: string
  created_at: string
}

// ============ 异地恋功能类型 ============

/** 共享日历事件 */
export interface CalendarEvent {
  id: string
  title: string
  description: string | null
  event_date: string
  event_type: string // 'meetup' | 'birthday' | 'anniversary' | 'holiday' | 'other'
  created_by: string
  created_at: string
}

/** 早安晚安打卡 */
export interface CheckIn {
  id: string
  user_id: string
  checkin_type: string // 'morning' | 'night'
  checkin_date: string
  checkin_time: string
  message: string | null
  created_at: string
}

/** 心情气泡 */
export interface MoodBubble {
  id: string
  user_id: string
  mood: string // 'happy' | 'miss' | 'love' | 'sad' | 'tired' | 'excited' | 'angry'
  message: string | null
  created_at: string
  expires_at: string | null
}

/** 愿望清单 */
export interface WishItem {
  id: string
  title: string
  description: string | null
  category: string // 'travel' | 'food' | 'activity' | 'gift' | 'other'
  status: string // 'pending' | 'in_progress' | 'completed'
  created_by: string
  completed_at: string | null
  created_at: string
}

/** 定时情书 */
export interface LoveLetter {
  id: string
  from_user: string
  to_user: string
  title: string
  content: string
  scheduled_at: string
  sent: boolean
  read_at: string | null
  created_at: string
}

/** 异地小游戏 - 你画我猜 */
export interface DrawGuessRound {
  id: string
  word: string
  drawer_id: string
  guesser_id: string | null
  image_url: string | null
  guess: string | null
  correct: boolean | null
  status: string // 'drawing' | 'guessing' | 'completed'
  created_at: string
  completed_at: string | null
}

/** 异地小游戏 - 真心话大冒险 */
export interface TruthDareRound {
  id: string
  type: string // 'truth' | 'dare'
  content: string
  created_by: string
  target_user: string
  response: string | null
  status: string // 'pending' | 'answered' | 'skipped'
  created_at: string
  responded_at: string | null
}
