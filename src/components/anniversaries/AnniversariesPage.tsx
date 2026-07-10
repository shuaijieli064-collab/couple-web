import { useState, useEffect, type FormEvent } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { Card } from '../common/Card'
import { EmptyState } from '../common/EmptyState'
import { Modal } from '../common/Modal'
import { type Anniversary, type CalendarEvent } from '../../types/database'
import { countdownDays, formatDate } from '../../utils/dateUtils'
import confetti from 'canvas-confetti'

type ViewTab = 'anniversaries' | 'calendar'

export function AnniversariesPage() {
  const [activeTab, setActiveTab] = useState<ViewTab>('anniversaries')
  const [anniversaries, setAnniversaries] = useState<Anniversary[]>([])
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(true)
  const [selectMode, setSelectMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [selectedAnniversary, setSelectedAnniversary] = useState<Anniversary | null>(null)

  useEffect(() => {
    loadAnniversaries()
  }, [])

  function toggleSelect(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function batchDelete() {
    if (!confirm(`确定删除选中的 ${selectedIds.size} 个纪念日吗？`)) return
    for (const id of selectedIds) {
      await supabase.from('anniversaries').delete().eq('id', id)
    }
    setSelectedIds(new Set())
    setSelectMode(false)
    loadAnniversaries()
  }

  async function loadAnniversaries() {
    try {
      const { data } = await supabase
        .from('anniversaries')
        .select('*')
        .order('date', { ascending: true })
      if (data) setAnniversaries(data as Anniversary[])

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

  async function handleDetailDelete(anniversary: Anniversary) {
    if (!confirm(`确定删除纪念日「${anniversary.title}」吗？`)) return
    await supabase.from('anniversaries').delete().eq('id', anniversary.id)
    setSelectedAnniversary(null)
    loadAnniversaries()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-xl md:text-2xl font-bold text-cloud-800" style={{ fontFamily: "'Quicksand', sans-serif" }}>日历 📅</h1>
      </div>

      <div className="flex bg-sakura-100/60 rounded-xl p-1">
        <button
          onClick={() => setActiveTab('anniversaries')}
          className={`flex-1 px-4 py-2 text-sm rounded-lg transition-colors ${
            activeTab === 'anniversaries'
              ? 'bg-white text-cloud-800 shadow-sm font-medium'
              : 'text-cloud-400'
          }`}
        >
          纪念日
        </button>
        <button
          onClick={() => setActiveTab('calendar')}
          className={`flex-1 px-4 py-2 text-sm rounded-lg transition-colors ${
            activeTab === 'calendar'
              ? 'bg-white text-cloud-800 shadow-sm font-medium'
              : 'text-cloud-400'
          }`}
        >
          共享日历
        </button>
      </div>

      {activeTab === 'anniversaries' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div />
            <div className="flex gap-2">
              {selectMode ? (
                <>
                  <button
                    onClick={() => { setSelectMode(false); setSelectedIds(new Set()) }}
                    className="px-4 py-2 text-sm text-cloud-600 bg-cloud-100 hover:bg-cloud-200 rounded-xl transition-colors"
                  >
                    取消
                  </button>
                  <button
                    onClick={batchDelete}
                    disabled={selectedIds.size === 0}
                    className="px-4 py-2 text-sm text-white bg-red-400 hover:bg-red-500 disabled:opacity-50 rounded-xl transition-all"
                  >
                    删除 ({selectedIds.size})
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => setSelectMode(true)}
                    className="px-4 py-2 text-sm text-sakura-600 bg-sakura-50 hover:bg-sakura-100 rounded-xl transition-colors"
                  >
                    选择
                  </button>
                  <button
                    onClick={() => setShowForm(true)}
                    className="px-4 py-2 text-sm text-white bg-gradient-to-r from-sakura-400 to-sakura-500 hover:from-sakura-500 hover:to-sakura-600 rounded-xl transition-all shadow-sm hover:shadow-md hover:shadow-sakura-200/40"
                  >
                    添加纪念日
                  </button>
                </>
              )}
            </div>
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
                <AnniversaryCard
                  key={a.id}
                  anniversary={a}
                  onClick={() => selectMode ? toggleSelect(a.id) : setSelectedAnniversary(a)}
                  selected={selectedIds.has(a.id)}
                  selectMode={selectMode}
                />
              ))}
            </div>
          )}

          <Modal isOpen={showForm} onClose={() => setShowForm(false)} title="添加纪念日">
            <AnniversaryForm onClose={() => setShowForm(false)} onCreated={() => { setShowForm(false); loadAnniversaries() }} />
          </Modal>

          <Modal isOpen={!!selectedAnniversary} onClose={() => setSelectedAnniversary(null)} title={selectedAnniversary?.title}>
            {selectedAnniversary && (
              <div className="text-center">
                <div className="text-5xl mb-4">💝</div>
                <p className="text-3xl font-bold text-cloud-800 mb-2" style={{ fontFamily: "'Quicksand', sans-serif" }}>
                  {countdownDays(selectedAnniversary.date, selectedAnniversary.recurring).label}
                </p>
                <p className="text-sm text-cloud-400 mb-1">{formatDate(selectedAnniversary.date)}</p>
                <p className="text-sm text-cloud-400 mb-6">{selectedAnniversary.recurring ? '每年重复' : '仅一次'}</p>
                <button
                  onClick={() => handleDetailDelete(selectedAnniversary)}
                  className="text-sm text-red-400 hover:text-red-500 transition-colors"
                >
                  删除
                </button>
              </div>
            )}
          </Modal>
        </div>
      )}

      {activeTab === 'calendar' && (
        <SharedCalendar />
      )}
    </div>
  )
}

function AnniversaryCard({ anniversary, onClick, selected, selectMode }: { anniversary: Anniversary; onClick: () => void; selected: boolean; selectMode: boolean }) {
  const { label, isToday } = countdownDays(anniversary.date, anniversary.recurring)

  return (
    <div className="relative group cursor-pointer" onClick={onClick}>
      <Card className={isToday ? 'bg-gradient-to-r from-sakura-50 to-peach-50 border-sakura-200 shadow-sakura-100/30 animate-[sparkle_3s_ease-in-out_infinite]' : ''}>
        <div className="text-center">
          {selectMode && (
            <div className={`mx-auto mb-2 w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold transition-all ${selected ? 'bg-sakura-500 shadow-sm' : 'bg-white/70 border-2 border-cloud-200'}`}>
              {selected ? '✓' : ''}
            </div>
          )}
          <p className="text-sm text-cloud-500 mb-1">{anniversary.title}</p>
          <p className={`text-3xl font-bold ${isToday ? 'text-sakura-600' : 'text-cloud-800'}`} style={{ fontFamily: "'Quicksand', sans-serif" }}>
            {isToday ? '🎉 ' : ''}{label}
          </p>
          <p className="text-xs text-cloud-400 mt-2">{formatDate(anniversary.date)}</p>
          <p className="text-xs text-cloud-400">{anniversary.recurring ? '每年重复' : '仅一次'}</p>
        </div>
      </Card>
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

// ==================== 共享日历 ====================

const EVENT_TYPES: Record<string, { label: string; icon: string; color: string }> = {
  meetup: { label: '见面', icon: '💕', color: 'bg-sakura-100 text-sakura-700' },
  birthday: { label: '生日', icon: '🎂', color: 'bg-peach-100 text-peach-700' },
  anniversary: { label: '纪念日', icon: '💝', color: 'bg-lilac-100 text-lilac-700' },
  holiday: { label: '假期', icon: '🌴', color: 'bg-cloud-100 text-cloud-700' },
  other: { label: '其他', icon: '📌', color: 'bg-cloud-100 text-cloud-600' },
}

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六']

function SharedCalendar() {
  const { user } = useAuth()
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [viewDate, setViewDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  async function loadData() {
    if (!user) return
    setLoading(true)
    try {
      const { data } = await supabase
        .from('calendar_events')
        .select('*')
        .order('event_date', { ascending: true })
      if (data) setEvents(data as CalendarEvent[])
    } catch (err) {
      console.error('Failed to load calendar events:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  const year = viewDate.getFullYear()
  const month = viewDate.getMonth()
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const daysInMonth = lastDay.getDate()
  const startWeekday = firstDay.getDay()

  const cells: (number | null)[] = []
  for (let i = 0; i < startWeekday; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)

  const todayStr = new Date().toISOString().split('T')[0]

  const eventsByDate = events.reduce((acc, e) => {
    const dateKey = e.event_date.split('T')[0]
    if (!acc[dateKey]) acc[dateKey] = []
    acc[dateKey].push(e)
    return acc
  }, {} as Record<string, CalendarEvent[]>)

  const upcomingEvents = events
    .filter((e) => e.event_date.split('T')[0] >= todayStr)
    .slice(0, 5)

  function prevMonth() {
    setViewDate(new Date(year, month - 1, 1))
  }
  function nextMonth() {
    setViewDate(new Date(year, month + 1, 1))
  }

  async function handleDelete(event: CalendarEvent) {
    if (!confirm(`确定删除事件「${event.title}」吗？`)) return
    const { error } = await supabase.from('calendar_events').delete().eq('id', event.id)
    if (error) {
      console.error('Delete event error:', error)
      return
    }
    loadData()
  }

  const selectedDateEvents = selectedDate ? eventsByDate[selectedDate] ?? [] : []

  if (loading) {
    return <div className="text-center py-12 text-cloud-400">加载中...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-cloud-700" style={{ fontFamily: "'Quicksand', sans-serif" }}>
          {year}年{month + 1}月
        </h2>
        <div className="flex items-center gap-2">
          <button
            onClick={prevMonth}
            className="w-8 h-8 flex items-center justify-center text-cloud-500 bg-cloud-100 hover:bg-cloud-200 rounded-lg transition-colors"
          >
            ‹
          </button>
          <button
            onClick={() => setViewDate(new Date())}
            className="px-3 py-1 text-xs text-sakura-600 bg-sakura-50 hover:bg-sakura-100 rounded-lg transition-colors"
          >
            今天
          </button>
          <button
            onClick={nextMonth}
            className="w-8 h-8 flex items-center justify-center text-cloud-500 bg-cloud-100 hover:bg-cloud-200 rounded-lg transition-colors"
          >
            ›
          </button>
          <button
            onClick={() => setShowForm(true)}
            className="px-3 py-1.5 text-xs text-white bg-gradient-to-r from-sakura-400 to-sakura-500 hover:from-sakura-500 hover:to-sakura-600 rounded-lg transition-all shadow-sm"
          >
            添加事件
          </button>
        </div>
      </div>

      <Card>
        <div className="grid grid-cols-7 gap-1 mb-2">
          {WEEKDAYS.map((w) => (
            <div key={w} className="text-center text-xs font-medium text-cloud-400 py-1">
              {w}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {cells.map((day, i) => {
            if (day === null) return <div key={`empty-${i}`} />
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
            const dayEvents = eventsByDate[dateStr] ?? []
            const isToday = dateStr === todayStr
            const isSelected = dateStr === selectedDate
            return (
              <button
                key={day}
                onClick={() => setSelectedDate(dateStr)}
                className={`aspect-square flex flex-col items-center justify-center rounded-lg text-sm transition-all ${
                  isSelected
                    ? 'bg-sakura-100 ring-2 ring-sakura-300'
                    : isToday
                      ? 'bg-sakura-50 text-sakura-600 font-bold'
                      : 'hover:bg-cloud-50 text-cloud-700'
                }`}
              >
                <span>{day}</span>
                {dayEvents.length > 0 && (
                  <div className="flex gap-0.5 mt-0.5">
                    {dayEvents.slice(0, 3).map((e, idx) => (
                      <span
                        key={idx}
                        className={`w-1.5 h-1.5 rounded-full ${
                          e.event_type === 'meetup' ? 'bg-sakura-400'
                            : e.event_type === 'birthday' ? 'bg-peach-400'
                              : e.event_type === 'anniversary' ? 'bg-lilac-400'
                                : e.event_type === 'holiday' ? 'bg-cloud-400'
                                  : 'bg-cloud-300'
                        }`}
                      />
                    ))}
                  </div>
                )}
              </button>
            )
          })}
        </div>
      </Card>

      {selectedDate && (
        <div>
          <h3 className="text-sm font-semibold text-cloud-700 mb-2">{formatDate(selectedDate)} 的事件</h3>
          {selectedDateEvents.length === 0 ? (
            <Card className="text-center text-sm text-cloud-400 py-4">这一天还没有事件</Card>
          ) : (
            <div className="space-y-2">
              {selectedDateEvents.map((e) => (
                <EventItem key={e.id} event={e} onDelete={() => handleDelete(e)} />
              ))}
            </div>
          )}
        </div>
      )}

      <div>
        <h3 className="text-lg font-semibold text-cloud-700 mb-3">即将到来</h3>
        {upcomingEvents.length === 0 ? (
          <EmptyState icon="📅" title="暂无即将到来的事件" description="添加你们的下一次见面或纪念日吧" />
        ) : (
          <div className="space-y-2">
            {upcomingEvents.map((e) => (
              <EventItem key={e.id} event={e} onDelete={() => handleDelete(e)} />
            ))}
          </div>
        )}
      </div>

      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title="添加事件">
        <EventForm
          onClose={() => setShowForm(false)}
          onCreated={() => { setShowForm(false); loadData() }}
        />
      </Modal>
    </div>
  )
}

function EventItem({ event, onDelete }: { event: CalendarEvent; onDelete: () => void }) {
  const cfg = EVENT_TYPES[event.event_type] ?? EVENT_TYPES.other
  return (
    <Card className="flex items-start gap-3">
      <div className="text-2xl shrink-0">{cfg.icon}</div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cfg.color}`}>{cfg.label}</span>
          <span className="text-xs text-cloud-400">{formatDate(event.event_date)}</span>
        </div>
        <p className="text-sm font-medium text-cloud-800">{event.title}</p>
        {event.description && <p className="text-xs text-cloud-500 mt-1">{event.description}</p>}
      </div>
      <button
        onClick={onDelete}
        className="text-cloud-300 hover:text-red-400 text-sm transition-colors shrink-0"
      >
        删除
      </button>
    </Card>
  )
}

function EventForm({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const { user } = useAuth()
  const [title, setTitle] = useState('')
  const [date, setDate] = useState('')
  const [eventType, setEventType] = useState('meetup')
  const [description, setDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!user || !title || !date) return
    setSubmitting(true)
    try {
      const { error } = await supabase.from('calendar_events').insert({
        title,
        event_date: date,
        event_type: eventType,
        description: description || null,
        created_by: user.id,
      })
      if (error) {
        console.error('Create event error:', error)
        return
      }
      onCreated()
    } catch (err) {
      console.error('Create event failed:', err)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-cloud-700 mb-1">标题</label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="例如：北京见面"
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
      <div>
        <label className="block text-sm font-medium text-cloud-700 mb-1">类型</label>
        <div className="flex flex-wrap gap-2">
          {Object.entries(EVENT_TYPES).map(([key, cfg]) => (
            <button
              key={key}
              type="button"
              onClick={() => setEventType(key)}
              className={`px-3 py-1.5 text-sm rounded-xl transition-all ${
                eventType === key
                  ? 'bg-sakura-100 text-sakura-700 ring-2 ring-sakura-300 font-medium'
                  : 'bg-cloud-50 text-cloud-500 hover:bg-cloud-100'
              }`}
            >
              {cfg.icon} {cfg.label}
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-cloud-700 mb-1">描述（可选）</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="补充说明..."
          rows={3}
          className="w-full px-4 py-2 rounded-xl border border-cloud-200 focus:border-sakura-400 focus:ring-2 focus:ring-sakura-200/50 outline-none resize-none"
        />
      </div>
      <div className="flex gap-2 justify-end">
        <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-cloud-500 hover:bg-cloud-100 rounded-xl transition-colors">
          取消
        </button>
        <button
          type="submit"
          disabled={submitting || !title || !date}
          className="px-4 py-2 text-sm text-white bg-gradient-to-r from-sakura-400 to-sakura-500 hover:from-sakura-500 hover:to-sakura-600 disabled:bg-cloud-300 rounded-xl transition-all shadow-sm"
        >
          {submitting ? '添加中...' : '添加'}
        </button>
      </div>
    </form>
  )
}
