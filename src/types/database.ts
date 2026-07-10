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
