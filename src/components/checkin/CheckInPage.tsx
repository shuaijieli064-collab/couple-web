import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { Card } from '../common/Card'
import { EmptyState } from '../common/EmptyState'
import { Avatar } from '../common/Avatar'
import { type CheckIn, type Profile } from '../../types/database'

export function CheckInPage() {
  const { user } = useAuth()
  const today = new Date()
  const todayStr = today.toISOString().split('T')[0]
  const [partner, setPartner] = useState<Profile | null>(null)
  const [checkins, setCheckins] = useState<CheckIn[]>([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function loadData() {
    if (!user) return
    setLoading(true)
    try {
      const sevenDaysAgo = new Date(today.getTime() - 6 * 86400000).toISOString().split('T')[0]

      const [
        { data: profiles },
        { data: checkinData },
      ] = await Promise.all([
        supabase
          .from('profiles')
          .select('*')
          .neq('id', user.id)
          .limit(1),
        supabase
          .from('checkins')
          .select('*')
          .gte('checkin_date', sevenDaysAgo)
          .order('checkin_date', { ascending: false }),
      ])

      if (profiles && profiles.length > 0) setPartner(profiles[0] as Profile)
      if (checkinData) setCheckins(checkinData as CheckIn[])
    } catch (err) {
      console.error('Failed to load checkins:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  const myMorningToday = checkins.find(
    (c) => c.user_id === user?.id && c.checkin_type === 'morning' && c.checkin_date === todayStr
  )
  const myNightToday = checkins.find(
    (c) => c.user_id === user?.id && c.checkin_type === 'night' && c.checkin_date === todayStr
  )
  const partnerMorningToday = checkins.find(
    (c) => c.user_id === partner?.id && c.checkin_type === 'morning' && c.checkin_date === todayStr
  )
  const partnerNightToday = checkins.find(
    (c) => c.user_id === partner?.id && c.checkin_type === 'night' && c.checkin_date === todayStr
  )

  async function handleCheckIn(type: 'morning' | 'night') {
    if (!user) return
    const exists = type === 'morning' ? myMorningToday : myNightToday
    if (exists) return
    setSubmitting(true)
    try {
      const now = new Date()
      const { error } = await supabase.from('checkins').insert({
        user_id: user.id,
        checkin_type: type,
        checkin_date: todayStr,
        checkin_time: now.toTimeString().slice(0, 8),
        message: message || null,
      })
      if (error) {
        console.error('Check in error:', error)
        return
      }
      setMessage('')
      loadData()
    } catch (err) {
      console.error('Check in failed:', err)
    } finally {
      setSubmitting(false)
    }
  }

  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today.getTime() - (6 - i) * 86400000)
    return {
      dateStr: d.toISOString().split('T')[0],
      weekday: ['日', '一', '二', '三', '四', '五', '六'][d.getDay()],
      day: d.getDate(),
      isToday: i === 6,
    }
  })

  if (loading) {
    return <div className="text-center py-12 text-cloud-400">加载中...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-xl md:text-2xl font-bold text-cloud-800" style={{ fontFamily: "'Quicksand', sans-serif" }}>
          打卡 🌅
        </h1>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <CheckInButton
          type="morning"
          done={!!myMorningToday}
          time={myMorningToday?.checkin_time}
          disabled={submitting}
          onClick={() => handleCheckIn('morning')}
        />
        <CheckInButton
          type="night"
          done={!!myNightToday}
          time={myNightToday?.checkin_time}
          disabled={submitting}
          onClick={() => handleCheckIn('night')}
        />
      </div>

      {(!myMorningToday || !myNightToday) && (
        <Card>
          <label className="block text-sm font-medium text-cloud-700 mb-2">附一句留言（可选）</label>
          <input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="今天的打卡想说点什么..."
            className="w-full px-4 py-2 rounded-xl border border-cloud-200 focus:border-sakura-400 focus:ring-2 focus:ring-sakura-200/50 outline-none"
          />
        </Card>
      )}

      {partner && (
        <Card>
          <div className="flex items-center gap-2 mb-3">
            <Avatar url={partner.avatar_url} name={partner.display_name} size="sm" />
            <span className="text-sm font-medium text-cloud-700">{partner.display_name} 今日状态</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <PartnerStatus label="早安" done={!!partnerMorningToday} time={partnerMorningToday?.checkin_time} message={partnerMorningToday?.message} icon="🌅" />
            <PartnerStatus label="晚安" done={!!partnerNightToday} time={partnerNightToday?.checkin_time} message={partnerNightToday?.message} icon="🌙" />
          </div>
        </Card>
      )}

      <div>
        <h3 className="text-lg font-semibold text-cloud-700 mb-3">最近 7 天</h3>
        {checkins.length === 0 ? (
          <EmptyState icon="🌅" title="还没有打卡记录" description="开始你们的第一个早安打卡吧" />
        ) : (
          <Card>
            <div className="grid grid-cols-7 gap-2">
              {last7Days.map((d) => {
                const myMorning = checkins.some(
                  (c) => c.user_id === user?.id && c.checkin_type === 'morning' && c.checkin_date === d.dateStr
                )
                const myNight = checkins.some(
                  (c) => c.user_id === user?.id && c.checkin_type === 'night' && c.checkin_date === d.dateStr
                )
                const pMorning = checkins.some(
                  (c) => c.user_id === partner?.id && c.checkin_type === 'morning' && c.checkin_date === d.dateStr
                )
                const pNight = checkins.some(
                  (c) => c.user_id === partner?.id && c.checkin_type === 'night' && c.checkin_date === d.dateStr
                )
                return (
                  <div
                    key={d.dateStr}
                    className={`flex flex-col items-center p-2 rounded-xl ${d.isToday ? 'bg-sakura-50 ring-1 ring-sakura-200' : ''}`}
                  >
                    <span className="text-xs text-cloud-400">{d.weekday}</span>
                    <span className={`text-sm font-medium ${d.isToday ? 'text-sakura-600' : 'text-cloud-600'}`}>{d.day}</span>
                    <div className="mt-1.5 space-y-1">
                      <div className="flex gap-1">
                        <Dot active={myMorning} color="sakura" title="我的早安" />
                        <Dot active={myNight} color="peach" title="我的晚安" />
                      </div>
                      <div className="flex gap-1">
                        <Dot active={pMorning} color="lilac" title="Ta的早安" />
                        <Dot active={pNight} color="cloud" title="Ta的晚安" />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
            <div className="flex items-center justify-center gap-4 mt-4 flex-wrap">
              <LegendDot color="bg-sakura-400" label="我的早安" />
              <LegendDot color="bg-peach-400" label="我的晚安" />
              <LegendDot color="bg-lilac-400" label="Ta的早安" />
              <LegendDot color="bg-cloud-400" label="Ta的晚安" />
            </div>
          </Card>
        )}
      </div>
    </div>
  )
}

function CheckInButton({
  type,
  done,
  time,
  disabled,
  onClick,
}: {
  type: 'morning' | 'night'
  done: boolean
  time?: string
  disabled: boolean
  onClick: () => void
}) {
  const isMorning = type === 'morning'
  const icon = isMorning ? '🌅' : '🌙'
  const label = isMorning ? '早安打卡' : '晚安打卡'
  const greeting = isMorning ? '新的一天，想你啦' : '今天也辛苦啦，好梦'

  return (
    <button
      onClick={onClick}
      disabled={done || disabled}
      className={`relative overflow-hidden rounded-2xl p-5 text-center transition-all ${
        done
          ? isMorning
            ? 'bg-gradient-to-br from-sakura-50 to-peach-50 border border-sakura-200'
            : 'bg-gradient-to-br from-lilac-50 to-cloud-50 border border-lilac-200'
          : isMorning
            ? 'bg-gradient-to-br from-sakura-400 to-peach-400 text-white shadow-md shadow-sakura-200/40 hover:shadow-lg hover:shadow-sakura-200/50 hover:-translate-y-0.5'
            : 'bg-gradient-to-br from-lilac-400 to-cloud-500 text-white shadow-md shadow-lilac-200/40 hover:shadow-lg hover:shadow-lilac-200/50 hover:-translate-y-0.5'
      } disabled:cursor-default`}
    >
      <div className="text-4xl mb-2">{done ? '✓' : icon}</div>
      <div className={`text-base font-semibold ${done ? 'text-cloud-600' : ''}`}>{done ? `已${label}` : label}</div>
      <div className={`text-xs mt-1 ${done ? 'text-cloud-400' : 'opacity-80'}`}>
        {done && time ? time.slice(0, 5) : greeting}
      </div>
    </button>
  )
}

function PartnerStatus({
  label,
  done,
  time,
  message,
  icon,
}: {
  label: string
  done: boolean
  time?: string
  message?: string | null
  icon: string
}) {
  return (
    <div className={`rounded-xl p-3 ${done ? 'bg-sakura-50' : 'bg-cloud-50'}`}>
      <div className="flex items-center gap-1.5 mb-1">
        <span>{icon}</span>
        <span className="text-xs text-cloud-500">{label}</span>
      </div>
      {done ? (
        <>
          <p className="text-sm font-medium text-sakura-600">已打卡 {time?.slice(0, 5)}</p>
          {message && <p className="text-xs text-cloud-500 mt-1 truncate">"{message}"</p>}
        </>
      ) : (
        <p className="text-sm text-cloud-400">还未打卡</p>
      )}
    </div>
  )
}

function Dot({ active, color, title }: { active: boolean; color: string; title: string }) {
  const colorMap: Record<string, string> = {
    sakura: 'bg-sakura-400',
    peach: 'bg-peach-400',
    lilac: 'bg-lilac-400',
    cloud: 'bg-cloud-400',
  }
  return (
    <span
      title={title}
      className={`w-2 h-2 rounded-full transition-all ${active ? colorMap[color] : 'bg-cloud-100'}`}
    />
  )
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className={`w-2.5 h-2.5 rounded-full ${color}`} />
      <span className="text-xs text-cloud-400">{label}</span>
    </div>
  )
}
