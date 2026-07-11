import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import { PartnerStatusCard } from './PartnerStatusCard'
import { CountdownCard } from './CountdownCard'
import { Card } from '../common/Card'
import { EmptyState } from '../common/EmptyState'
import { type Profile, type Anniversary } from '../../types/database'
import { formatDate } from '../../utils/dateUtils'
import { Link } from 'react-router-dom'

export function HomePage() {
  const { user, profile } = useAuth()
  const [partner, setPartner] = useState<Profile | null>(null)
  const [isPartnerOnline, setIsPartnerOnline] = useState(false)
  const [anniversaries, setAnniversaries] = useState<Anniversary[]>([])
  const [recentPhotos, setRecentPhotos] = useState<{ id: string; url: string; caption: string | null }[]>([])
  const [recentDiary, setRecentDiary] = useState<{ id: string; title: string; content: string; date: string; user_name: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const partnerId = partner?.id

  async function loadData() {
    if (!user) return

    try {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('*')
        .neq('id', user.id)
        .limit(1)

      if (profiles && profiles.length > 0) {
        setPartner(profiles[0] as Profile)
      }

      const { data: anniversariesData } = await supabase
        .from('anniversaries')
        .select('*')
        .order('date', { ascending: true })
        .limit(5)

      if (anniversariesData) {
        setAnniversaries(anniversariesData as Anniversary[])
      }

      const { data: photosData } = await supabase
        .from('photos')
        .select('id, url, caption')
        .order('created_at', { ascending: false })
        .limit(4)

      if (photosData) {
        setRecentPhotos(photosData)
      }

      const { data: diaryData } = await supabase
        .from('diary_entries')
        .select('id, title, content, date, user_id')
        .order('date', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (diaryData) {
        const entry = diaryData as { id: string; title: string; content: string; date: string; user_id: string }
        const { data: authorData } = await supabase
          .from('profiles')
          .select('display_name')
          .eq('id', entry.user_id)
          .single()

        setRecentDiary({
          ...entry,
          user_name: authorData?.display_name ?? '未知',
        })
      }
    } catch (err) {
      console.error('Failed to load dashboard data:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Presence channel
  useEffect(() => {
    if (!user) return

    const channel = supabase.channel('presence', {
      config: { presence: { key: user.id } },
    })

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState()
        const onlineUsers = Object.keys(state)
        if (partnerId && onlineUsers.includes(partnerId)) {
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

    return () => {
      channel.unsubscribe()
    }
  }, [user, partnerId])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-cloud-400">加载中...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-cloud-800" style={{ fontFamily: "'Quicksand', sans-serif" }}>欢迎回来，{profile?.display_name} 💕</h1>
        <p className="text-cloud-500 mt-1">来看看你们的故事吧</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {partner && <PartnerStatusCard partner={partner} isOnline={isPartnerOnline} />}
        {anniversaries.length > 0 && <CountdownCard anniversary={anniversaries[0]} />}
      </div>

      {anniversaries.length > 1 && (
        <div>
          <h2 className="text-lg font-semibold text-cloud-700 mb-3">所有纪念日</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {anniversaries.slice(1).map((a) => (
              <CountdownCard key={a.id} anniversary={a} />
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-cloud-700">最近的照片</h2>
            <Link to="/photos" className="text-sm text-sakura-500 hover:text-sakura-600 transition-colors">查看全部 →</Link>
          </div>
          {recentPhotos.length > 0 ? (
            <div className="grid grid-cols-2 gap-2">
              {recentPhotos.map((photo) => (
                <img
                  key={photo.id}
                  src={photo.url}
                  alt={photo.caption ?? ''}
                  className="w-full h-24 object-cover rounded-xl"
                />
              ))}
            </div>
          ) : (
            <EmptyState icon="📷" title="还没有照片" description="去上传一些属于你们的回忆吧" />
          )}
        </Card>

        <Card>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-cloud-700">最近的日记</h2>
            <Link to="/diary" className="text-sm text-sakura-500 hover:text-sakura-600 transition-colors">查看全部 →</Link>
          </div>
          {recentDiary ? (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs bg-sakura-100 text-sakura-700 px-2 py-1 rounded-full">{formatDate(recentDiary.date)}</span>
                <span className="text-xs text-cloud-400">{recentDiary.user_name} 写的</span>
              </div>
              <h3 className="font-medium text-cloud-800 mb-1">{recentDiary.title}</h3>
              <p className="text-sm text-cloud-500 line-clamp-3">{recentDiary.content}</p>
            </div>
          ) : (
            <EmptyState icon="📝" title="还没有日记" description="写下今天的心情吧" />
          )}
        </Card>
      </div>
    </div>
  )
}
