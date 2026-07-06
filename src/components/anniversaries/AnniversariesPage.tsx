import { useState, useEffect, type FormEvent } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { Card } from '../common/Card'
import { EmptyState } from '../common/EmptyState'
import { Modal } from '../common/Modal'
import { type Anniversary } from '../../types/database'
import { countdownDays, formatDate } from '../../utils/dateUtils'
import confetti from 'canvas-confetti'

export function AnniversariesPage() {
  const [anniversaries, setAnniversaries] = useState<Anniversary[]>([])
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      const { data } = await supabase
        .from('anniversaries')
        .select('*')
        .order('date', { ascending: true })
      if (data) setAnniversaries(data as Anniversary[])

      // Check for today's anniversary
      const today = new Date().toISOString().split('T')[0]
      if (data?.some((a: Anniversary) => a.date.startsWith(today) || a.date === today)) {
        confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } })
      }
    } catch (err) {
      console.error('Failed to load anniversaries:', err)
    } finally {
      setLoading(false)
    }
  }

  const todayAnniversary = anniversaries.find((a) => {
    const { isToday } = countdownDays(a.date, a.recurring)
    return isToday
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-xl md:text-2xl font-bold text-cloud-800" style={{ fontFamily: "'Quicksand', sans-serif" }}>纪念日 💝</h1>
        <button
          onClick={() => setShowForm(true)}
          className="px-4 py-2 text-sm text-white bg-gradient-to-r from-sakura-400 to-sakura-500 hover:from-sakura-500 hover:to-sakura-600 rounded-xl transition-all shadow-sm hover:shadow-md hover:shadow-sakura-200/40"
        >
          添加纪念日
        </button>
      </div>

      {todayAnniversary && (
        <CelebrationBanner anniversary={todayAnniversary} />
      )}

      {loading ? (
        <div className="text-center py-12 text-cloud-400">加载中...</div>
      ) : anniversaries.length === 0 ? (
        <EmptyState icon="💝" title="还没有纪念日" description="添加你们的第一个纪念日吧" />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {anniversaries.map((a) => (
            <AnniversaryCard key={a.id} anniversary={a} onDeleted={loadData} />
          ))}
        </div>
      )}

      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title="添加纪念日">
        <AnniversaryForm onClose={() => setShowForm(false)} onCreated={() => { setShowForm(false); loadData() }} />
      </Modal>
    </div>
  )
}

function AnniversaryCard({ anniversary, onDeleted }: { anniversary: Anniversary; onDeleted: () => void }) {
  const { label, isToday } = countdownDays(anniversary.date, anniversary.recurring)

  async function handleDelete() {
    if (!confirm(`确定删除纪念日「${anniversary.title}」吗？`)) return
    await supabase.from('anniversaries').delete().eq('id', anniversary.id)
    onDeleted()
  }

  return (
    <div className="relative group">
      <Card className={isToday ? 'bg-gradient-to-r from-sakura-50 to-peach-50 border-sakura-200 shadow-sakura-100/30 animate-[sparkle_3s_ease-in-out_infinite]' : ''}>
        <div className="text-center">
          <p className="text-sm text-cloud-500 mb-1">{anniversary.title}</p>
          <p className={`text-3xl font-bold ${isToday ? 'text-sakura-600' : 'text-cloud-800'}`} style={{ fontFamily: "'Quicksand', sans-serif" }}>
            {isToday ? '🎉 ' : ''}{label}
          </p>
          <p className="text-xs text-cloud-400 mt-2">{formatDate(anniversary.date)}</p>
          <p className="text-xs text-cloud-400">{anniversary.recurring ? '每年重复' : '仅一次'}</p>
        </div>
      </Card>
      <button
        onClick={handleDelete}
        className="absolute top-2 right-2 bg-sakura-500 text-white w-7 h-7 rounded-full opacity-60 hover:opacity-100 transition-opacity flex items-center justify-center text-sm shadow-sm"
      >
        ×
      </button>
    </div>
  )
}

function CelebrationBanner({ anniversary }: { anniversary: Anniversary }) {
  return (
    <div className="bg-gradient-to-r from-sakura-400 via-sakura-500 to-peach-400 rounded-2xl p-6 text-center text-white animate-[pulse-slow_3s_ease-in-out_infinite]">
      <div className="text-3xl mb-2">🎉🎊🎉</div>
      <h2 className="text-xl font-bold mb-1">今天是 {anniversary.title}！</h2>
      <p className="text-sakura-100">祝你们节日快乐！</p>
    </div>
  )
}

function AnniversaryForm({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const { user } = useAuth()
  const [title, setTitle] = useState('')
  const [date, setDate] = useState('')
  const [recurring, setRecurring] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!user || !title || !date) return
    setSubmitting(true)
    await supabase.from('anniversaries').insert({
      user_id: user.id,
      title,
      date,
      recurring,
    })
    setSubmitting(false)
    onCreated()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-cloud-700 mb-1">名称</label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="例如：第一次约会"
          required
          className="w-full px-4 py-2 rounded-xl border border-cloud-200 focus:border-sakura-400 focus:ring-2 focus:ring-sakura-200/50 outline-none"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-cloud-700 mb-1">日期</label>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          required
          className="w-full px-4 py-2 rounded-xl border border-cloud-200 focus:border-sakura-400 focus:ring-2 focus:ring-sakura-200/50 outline-none"
        />
      </div>
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="recurring"
          checked={recurring}
          onChange={(e) => setRecurring(e.target.checked)}
          className="rounded border-cloud-200 text-sakura-500 focus:ring-sakura-400"
        />
        <label htmlFor="recurring" className="text-sm text-cloud-500">每年重复</label>
      </div>
      <div className="flex gap-2 justify-end">
        <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-cloud-500 hover:bg-cloud-100 rounded-xl transition-colors">取消</button>
        <button type="submit" disabled={submitting || !title || !date} className="px-4 py-2 text-sm text-white bg-gradient-to-r from-sakura-400 to-sakura-500 hover:from-sakura-500 hover:to-sakura-600 disabled:bg-cloud-300 rounded-xl transition-all shadow-sm">
          {submitting ? '添加中...' : '添加'}
        </button>
      </div>
    </form>
  )
}
