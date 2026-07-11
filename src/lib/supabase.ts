import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const DEFAULT_SUPABASE_URL = 'https://etvsroaeyisffxfbhcbh.supabase.co'
const DEFAULT_SUPABASE_ANON_KEY = 'sb_publishable_7SgP7hR-9tgLBVciwjIrtA_nmL8uoUv'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY

export const SUPABASE_CONFIG_ERROR =
  '缺少 Supabase 环境变量。请复制 .env.example 为 .env.local，然后填写 VITE_SUPABASE_URL 和 VITE_SUPABASE_ANON_KEY。'

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey)

export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey)
