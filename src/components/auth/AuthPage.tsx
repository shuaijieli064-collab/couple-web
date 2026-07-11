import { useState, useEffect, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase, SUPABASE_CONFIG_ERROR, isSupabaseConfigured } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { InstallPrompt } from '../common/InstallPrompt'

export function AuthPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [mode, setMode] = useState<'login' | 'register'>('login')

  useEffect(() => {
    if (user) {
      navigate('/', { replace: true })
    }
  }, [user, navigate])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!isSupabaseConfigured) {
      setError(SUPABASE_CONFIG_ERROR)
      return
    }
    setLoading(true)
    setError('')

    if (mode === 'login') {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        setError(error.message)
        setLoading(false)
      }
    } else {
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) {
        setError(error.message)
        setLoading(false)
      }
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-sakura-50 via-peach-50 to-lilac-50 flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-10 left-10 text-6xl opacity-10 animate-[float-gentle_6s_ease-in-out_infinite]">🌸</div>
        <div className="absolute top-20 right-16 text-4xl opacity-10 animate-[float-gentle_5s_ease-in-out_infinite_1s]">💕</div>
        <div className="absolute bottom-32 left-20 text-5xl opacity-10 animate-[float-gentle_7s_ease-in-out_infinite_2s]">✨</div>
        <div className="absolute bottom-16 right-10 text-4xl opacity-10 animate-[float-gentle_4s_ease-in-out_infinite_0.5s]">🌸</div>
      </div>

      <div className="w-full max-w-md relative">
        <div className="text-center mb-8">
          <div className="text-5xl mb-3 animate-[pulse-slow_3s_ease-in-out_infinite]">💕</div>
          <h1 className="text-3xl font-bold text-cloud-800 mb-2" style={{ fontFamily: "'Quicksand', sans-serif" }}>我们的时光</h1>
          <p className="text-cloud-500">记录属于我们的每一个瞬间</p>
        </div>

        <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-lg shadow-sakura-100/30 p-8 border border-sakura-100/30">
          <h2 className="text-xl font-semibold text-cloud-800 mb-1" style={{ fontFamily: "'Quicksand', sans-serif" }}>{mode === 'login' ? '登录' : '注册'}</h2>
          <p className="text-sm text-cloud-500 mb-6">用邮箱和密码登录你的账户</p>

          {!isSupabaseConfigured && (
            <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              {SUPABASE_CONFIG_ERROR}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              required
              disabled={!isSupabaseConfigured}
              className="w-full px-4 py-3 rounded-xl border border-cloud-200 focus:border-sakura-400 focus:ring-2 focus:ring-sakura-200/50 outline-none transition text-cloud-800 bg-white/50"
            />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="密码（至少6位）"
              required
              minLength={6}
              disabled={!isSupabaseConfigured}
              className="w-full mt-3 px-4 py-3 rounded-xl border border-cloud-200 focus:border-sakura-400 focus:ring-2 focus:ring-sakura-200/50 outline-none transition text-cloud-800 bg-white/50"
            />

            <button
              type="submit"
              disabled={loading || !email || !password || !isSupabaseConfigured}
              className="w-full mt-4 bg-gradient-to-r from-sakura-400 to-sakura-500 hover:from-sakura-500 hover:to-sakura-600 disabled:bg-cloud-300 text-white font-semibold py-3 rounded-xl transition-all duration-200 shadow-sm hover:shadow-md hover:shadow-sakura-200/40"
            >
              {loading ? '处理中...' : mode === 'login' ? '登录' : '注册'}
            </button>
          </form>

          <button
            type="button"
            onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
            className="w-full mt-3 text-sm text-sakura-500 hover:text-sakura-600 transition-colors"
          >
            {mode === 'login' ? '没有账号？去注册' : '已有账号？去登录'}
          </button>

          {error && (
            <div className="mt-4 p-3 bg-sakura-50 text-sakura-700 rounded-xl text-sm border border-sakura-100">
              {error}
            </div>
          )}
        </div>
      </div>
      <InstallPrompt />
    </div>
  )
}
