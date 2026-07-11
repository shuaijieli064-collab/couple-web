import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const SUPABASE_CONFIG_ERROR =
  '缺少 Supabase 环境变量。请复制 .env.example 为 .env.local，然后填写 VITE_SUPABASE_URL 和 VITE_SUPABASE_ANON_KEY。'

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey)

function createUnconfiguredSupabaseClient(): SupabaseClient {
  const makeStub = (path: string[]): unknown =>
    new Proxy(() => undefined, {
      get(_target, prop) {
        if (prop === Symbol.toStringTag) return 'SupabaseClient'
        return makeStub([...path, String(prop)])
      },
      apply() {
        throw new Error(`${SUPABASE_CONFIG_ERROR} 访问路径: ${path.join('.') || 'supabase'}`)
      },
    })

  return makeStub([]) as SupabaseClient
}

export const supabase: SupabaseClient = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : createUnconfiguredSupabaseClient()
