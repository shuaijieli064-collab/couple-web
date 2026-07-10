import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { Card } from '../common/Card'
import { EmptyState } from '../common/EmptyState'
import { Avatar } from '../common/Avatar'
import { type MoodBubble, type Profile } from '../../types/database'
import { formatRelative } from '../../utils/dateUtils'

// 心情类型配置：图标、标签、渐变背景、文字颜色
const MOOD_TYPES: Record<string, { label: string; icon: string; gradient: string; textColor: string }> = {
  happy: { label: '开心', icon: '😊', gradient: 'from-peach-200 to-peach-300', textColor: 'text-peach-700' },
  miss: { label: '想念', icon: '🥺', gradient: 'from-sakura-200 to-sakura-300', textColor: 'text-sakura-700' },
  love: { label: '爱你', icon: '😍', gradient: 'from-sakura-300 to-rose-300', textColor: 'text-sakura-800' },
  sad: { label: '难过', icon: '😢', gradient: 'from-cloud-200 to-cloud-300', textColor: 'text-cloud-600' },
  tired: { label: '疲惫', icon: '😴', gradient: 'from-lilac-200 to-lilac-300', textColor: 'text-lilac-700' },
  excited: { label: '兴奋', icon: '🤩', gradient: 'from-peach-300 to-sakura-300', textColor: 'text-peach-700' },
  angry: { label: '生气', icon: '😤', gradient: 'from-rose-300 to-red-300', textColor: 'text-rose-700' },
}

export function MoodTab() {
  const { user, profile } = useAuth()
  const [partner, setPartner] = useState<Profile | null>(null)
  const [moods, setMoods] = useState<MoodBubble[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedMood, setSelectedMood] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function loadData() {
    if (!user) return
    setLoading(true)
    try {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('*')
        .neq('id', user.id)
        .limit(1)
      if (profiles && profiles.length > 0) setPartner(profiles[0] as Profile)

      // 查询最近的心情气泡（每位用户最新一条）
      const { data: moodData } = await supabase
        .from('mood_bubbles')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20)
      if (moodData) setMoods(moodData as MoodBubble[])
    } catch (err) {
      console.error('Failed to load moods:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  async function handleSubmit() {
    if (!user || !selectedMood) return
    setSubmitting(true)
    try {
      const { error } = await supabase.from('mood_bubbles').insert({
        user_id: user.id,
        mood: selectedMood,
        message: message || null,
      })
      if (error) {
        console.error('Create mood error:', error)
        return
      }
      setSelectedMood(null)
      setMessage('')
      loadData()
    } catch (err) {
      console.error('Create mood failed:', err)
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('确定删除这条心情吗？')) return
    const { error } = await supabase.from('mood_bubbles').delete().eq('id', id)
    if (error) {
      console.error('Delete mood error:', error)
      return
    }
    loadData()
  }

  // 取双方最新心情
  const myLatestMood = moods.find((m) => m.user_id === user?.id)
  const partnerLatestMood = moods.find((m) => m.user_id === partner?.id)

  if (loading) {
    return <div className="text-center py-12 text-cloud-400">加载中...</div>
  }

  return (
    <div className="space-y-6">
      {/* 心情气泡展示区 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {myLatestMood ? (
          <MoodBubbleCard
            mood={myLatestMood}
            name={profile?.display_name ?? '我'}
            avatarUrl={profile?.avatar_url ?? null}
            isMine
            onDelete={() => handleDelete(myLatestMood.id)}
          />
        ) : (
          <Card className="flex items-center justify-center min-h-[140px] border-dashed">
            <div className="text-center text-cloud-400">
              <div className="text-3xl mb-1">💭</div>
              <p className="text-sm">还没有发表心情</p>
            </div>
          </Card>
        )}
        {partnerLatestMood ? (
          <MoodBubbleCard
            mood={partnerLatestMood}
            name={partner?.display_name ?? 'Ta'}
            avatarUrl={partner?.avatar_url ?? null}
          />
        ) : (
          <Card className="flex items-center justify-center min-h-[140px] border-dashed">
            <div className="text-center text-cloud-400">
              <div className="text-3xl mb-1">💭</div>
              <p className="text-sm">Ta还没有发表心情</p>
            </div>
          </Card>
        )}
      </div>

      {/* 选择心情 */}
      <Card>
        <h3 className="text-sm font-medium text-cloud-700 mb-3">现在的心情是？</h3>
        <div className="grid grid-cols-4 gap-2 mb-4">
          {Object.entries(MOOD_TYPES).map(([key, cfg]) => (
            <button
              key={key}
              onClick={() => setSelectedMood(key)}
              className={`flex flex-col items-center gap-1 py-3 rounded-xl transition-all ${
                selectedMood === key
                  ? `bg-gradient-to-br ${cfg.gradient} ring-2 ring-white shadow-sm scale-105`
                  : 'bg-cloud-50 hover:bg-cloud-100'
              }`}
            >
              <span className="text-2xl">{cfg.icon}</span>
              <span className={`text-xs ${selectedMood === key ? cfg.textColor : 'text-cloud-500'}`}>{cfg.label}</span>
            </button>
          ))}
        </div>

        {selectedMood && (
          <>
            <input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="想说点什么...（可选）"
              className="w-full px-4 py-2 rounded-xl border border-cloud-200 focus:border-sakura-400 focus:ring-2 focus:ring-sakura-200/50 outline-none mb-3"
            />
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full py-2.5 text-sm text-white bg-gradient-to-r from-sakura-400 to-sakura-500 hover:from-sakura-500 hover:to-sakura-600 disabled:bg-cloud-300 rounded-xl transition-all shadow-sm"
            >
              {submitting ? '发送中...' : '发表心情'}
            </button>
          </>
        )}
      </Card>

      {/* 心情历史 */}
      <div>
        <h3 className="text-lg font-semibold text-cloud-700 mb-3">心情记录</h3>
        {moods.length === 0 ? (
          <EmptyState icon="💭" title="还没有心情记录" description="选择一个心情，分享你的感受吧" />
        ) : (
          <div className="space-y-2">
            {moods.slice(0, 10).map((m) => {
              const cfg = MOOD_TYPES[m.mood] ?? MOOD_TYPES.happy
              const isMine = m.user_id === user?.id
              return (
                <div
                  key={m.id}
                  className={`flex items-start gap-3 bg-gradient-to-r ${cfg.gradient} bg-opacity-30 rounded-2xl p-3`}
                >
                  <Avatar
                    url={isMine ? profile?.avatar_url : partner?.avatar_url}
                    name={isMine ? (profile?.display_name ?? '我') : (partner?.display_name ?? 'Ta')}
                    size="sm"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-cloud-700">
                        {isMine ? '我' : partner?.display_name ?? 'Ta'}
                      </span>
                      <span className="text-lg">{cfg.icon}</span>
                      <span className={`text-xs ${cfg.textColor}`}>{cfg.label}</span>
                      <span className="text-xs text-cloud-400 ml-auto">{formatRelative(m.created_at)}</span>
                    </div>
                    {m.message && <p className="text-sm text-cloud-600 mt-1">{m.message}</p>}
                  </div>
                  {isMine && (
                    <button
                      onClick={() => handleDelete(m.id)}
                      className="text-cloud-400 hover:text-red-400 text-xs transition-colors shrink-0"
                    >
                      删除
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

function MoodBubbleCard({
  mood,
  name,
  avatarUrl,
  isMine,
  onDelete,
}: {
  mood: MoodBubble
  name: string
  avatarUrl: string | null
  isMine?: boolean
  onDelete?: () => void
}) {
  const cfg = MOOD_TYPES[mood.mood] ?? MOOD_TYPES.happy
  return (
    <div className={`relative bg-gradient-to-br ${cfg.gradient} rounded-3xl p-5 shadow-sm animate-[float-gentle_4s_ease-in-out_infinite]`}>
      <div className="flex items-center gap-2 mb-3">
        <Avatar url={avatarUrl} name={name} size="sm" />
        <span className="text-sm font-medium text-cloud-700">{name}</span>
        {isMine && onDelete && (
          <button
            onClick={onDelete}
            className="ml-auto text-cloud-500/60 hover:text-cloud-700 text-xs transition-colors"
          >
            删除
          </button>
        )}
      </div>
      <div className="flex items-center gap-3">
        <span className="text-5xl">{cfg.icon}</span>
        <div>
          <p className={`text-lg font-bold ${cfg.textColor}`}>{cfg.label}</p>
          {mood.message && <p className="text-sm text-cloud-600 mt-0.5">{mood.message}</p>}
        </div>
      </div>
      <p className="text-xs text-cloud-500 mt-3">{formatRelative(mood.created_at)}</p>
    </div>
  )
}
