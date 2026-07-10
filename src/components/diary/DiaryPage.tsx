import { useState, useEffect, type FormEvent } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { Card } from '../common/Card'
import { EmptyState } from '../common/EmptyState'
import { Modal } from '../common/Modal'
import { Avatar } from '../common/Avatar'
import { type DiaryEntry, type DiaryComment, type Profile } from '../../types/database'
import { formatDate } from '../../utils/dateUtils'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

const moods = ['😊', '😍', '🥰', '😢', '😤', '🤔', '😴', '🎉']

type ViewMode = 'timeline' | 'calendar'

export function DiaryPage() {
  const [entries, setEntries] = useState<(DiaryEntry & { author?: Profile })[]>([])
  const [showEditor, setShowEditor] = useState(false)
  const [selectedEntry, setSelectedEntry] = useState<(DiaryEntry & { author?: Profile }) | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>('timeline')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      const { data } = await supabase
        .from('diary_entries')
        .select('*')
        .order('date', { ascending: false })

      if (data) {
        const diaryEntries = data as DiaryEntry[]
        // Fetch all authors in one query to avoid N+1 requests
        const userIds = Array.from(new Set(diaryEntries.map((e) => e.user_id)))
        let profilesById: Record<string, Profile | undefined> = {}
        if (userIds.length > 0) {
          const { data: profilesData } = await supabase
            .from('profiles')
            .select('*')
            .in('id', userIds)
          if (profilesData) {
            profilesById = Object.fromEntries((profilesData as Profile[]).map((p) => [p.id, p]))
          }
        }
        const entriesWithAuthors = diaryEntries.map((entry) => ({ ...entry, author: profilesById[entry.user_id] }))
        setEntries(entriesWithAuthors)
      }
    } catch (err) {
      console.error('Failed to load diary:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-xl md:text-2xl font-bold text-cloud-800" style={{ fontFamily: "'Quicksand', sans-serif" }}>日记 📝</h1>
        <div className="flex gap-2">
          <div className="flex bg-sakura-100/60 rounded-xl p-1">
            <button
              onClick={() => setViewMode('timeline')}
              className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${viewMode === 'timeline' ? 'bg-white text-cloud-800 shadow-sm' : 'text-cloud-400'}`}
            >
              时间线
            </button>
            <button
              onClick={() => setViewMode('calendar')}
              className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${viewMode === 'calendar' ? 'bg-white text-cloud-800 shadow-sm' : 'text-cloud-400'}`}
            >
              日历
            </button>
          </div>
          <button
            onClick={() => setShowEditor(true)}
            className="px-4 py-2 text-sm text-white bg-gradient-to-r from-sakura-400 to-sakura-500 hover:from-sakura-500 hover:to-sakura-600 rounded-xl transition-all shadow-sm hover:shadow-md hover:shadow-sakura-200/40"
          >
            写日记
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-cloud-400">加载中...</div>
      ) : entries.length === 0 ? (
        <EmptyState icon="📝" title="还没有日记" description="写下今天的心情吧" />
      ) : viewMode === 'timeline' ? (
        <DiaryTimeline entries={entries} onSelect={setSelectedEntry} onDeleted={loadData} />
      ) : (
        <DiaryCalendarView entries={entries} onSelect={setSelectedEntry} onDeleted={loadData} />
      )}

      {/* Editor */}
      <Modal isOpen={showEditor} onClose={() => setShowEditor(false)} title="写日记">
        <DiaryEditor
          onClose={() => setShowEditor(false)}
          onSaved={() => { setShowEditor(false); loadData() }}
        />
      </Modal>

      {/* Detail view */}
      <Modal isOpen={!!selectedEntry} onClose={() => setSelectedEntry(null)} title={selectedEntry?.title}>
        {selectedEntry && (
          <div>
            <div className="flex items-center gap-2 mb-4 text-sm text-cloud-400">
              <Avatar url={selectedEntry.author?.avatar_url} name={selectedEntry.author?.display_name ?? '未知'} size="xs" />
              <span>{selectedEntry.author?.display_name}</span>
              <span>·</span>
              <span>{formatDate(selectedEntry.date)}</span>
              {selectedEntry.mood && <span className="text-lg">{selectedEntry.mood}</span>}
            </div>
            <div className="prose prose-sm max-w-none text-cloud-600">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{selectedEntry.content}</ReactMarkdown>
            </div>

            <CommentsSection diaryId={selectedEntry.id} />

            <div className="mt-6 pt-4 border-t border-cloud-100 flex justify-end">
              <button
                onClick={async () => {
                  if (!confirm('确定删除这篇日记吗？')) return
                  await supabase.from('diary_entries').delete().eq('id', selectedEntry.id)
                  setSelectedEntry(null)
                  loadData()
                }}
                className="px-4 py-2 text-sm text-white bg-sakura-500 hover:bg-sakura-600 rounded-xl transition-colors"
              >
                删除
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

function DiaryTimeline({ entries, onSelect, onDeleted }: { entries: (DiaryEntry & { author?: Profile })[]; onSelect: (e: DiaryEntry & { author?: Profile }) => void; onDeleted: () => void }) {
  async function handleDelete(e: React.MouseEvent, entryId: string) {
    e.stopPropagation()
    if (!confirm('确定删除这篇日记吗？')) return
    await supabase.from('diary_entries').delete().eq('id', entryId)
    onDeleted()
  }

  return (
    <div className="space-y-4">
      {entries.map((entry) => (
        <div key={entry.id} className="relative group">
          <Card onClick={() => onSelect(entry)}>
            <div className="flex items-start gap-3">
              <Avatar url={entry.author?.avatar_url} name={entry.author?.display_name ?? '未知'} size="sm" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs bg-sakura-100 text-sakura-700 px-2 py-0.5 rounded-full">{formatDate(entry.date)}</span>
                  <span className="text-xs text-cloud-400">{entry.author?.display_name}</span>
                  {entry.mood && <span className="text-base">{entry.mood}</span>}
                </div>
                <h3 className="font-medium text-cloud-800 mb-1">{entry.title}</h3>
                <p className="text-sm text-cloud-500 line-clamp-2">{entry.content}</p>
              </div>
            </div>
          </Card>
          <button
            onClick={(e) => handleDelete(e, entry.id)}
            className="absolute top-2 right-2 bg-sakura-500 text-white w-7 h-7 rounded-full opacity-60 hover:opacity-100 transition-opacity flex items-center justify-center text-sm shadow-sm"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  )
}

function DiaryCalendarView({ entries, onSelect, onDeleted: _onDeleted }: { entries: (DiaryEntry & { author?: Profile })[]; onSelect: (e: DiaryEntry & { author?: Profile }) => void; onDeleted: () => void }) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  const days = []
  for (let i = 0; i < firstDay; i++) days.push(null)
  for (let d = 1; d <= daysInMonth; d++) days.push(d)

  const entriesByDay: Record<string, typeof entries> = {}
  entries.forEach((entry) => {
    const entryDate = new Date(entry.date)
    // only include entries in the currently shown month/year
    if (entryDate.getFullYear() !== year || entryDate.getMonth() !== month) return
    const day = entryDate.getDate()
    const key = String(day)
    if (!entriesByDay[key]) entriesByDay[key] = []
    entriesByDay[key].push(entry)
  })

  const monthLabel = currentDate.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long' })

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => setCurrentDate(new Date(year, month - 1))} className="text-cloud-300 hover:text-sakura-500 transition-colors">←</button>
        <h2 className="font-medium text-cloud-700" style={{ fontFamily: "'Quicksand', sans-serif" }}>{monthLabel}</h2>
        <button onClick={() => setCurrentDate(new Date(year, month + 1))} className="text-cloud-300 hover:text-sakura-500 transition-colors">→</button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center">
        {['日', '一', '二', '三', '四', '五', '六'].map((d) => (
          <div key={d} className="text-xs text-cloud-300 py-2">{d}</div>
        ))}
        {days.map((day, i) => {
          const hasEntries = day ? entriesByDay[String(day)] : undefined
          const isToday = day === new Date().getDate() && month === new Date().getMonth() && year === new Date().getFullYear()
          return (
            <div
              key={i}
              className={`py-2 text-sm rounded-lg ${
                day
                  ? hasEntries
                    ? 'bg-sakura-100 text-sakura-700 font-medium cursor-pointer hover:bg-sakura-200'
                    : isToday
                    ? 'bg-sakura-500 text-white font-medium'
                    : 'text-cloud-500'
                  : ''
              }`}
              onClick={() => hasEntries && onSelect(hasEntries[0])}
            >
              {day ?? ''}
              {hasEntries && <div className="w-1 h-1 bg-sakura-400 rounded-full mx-auto mt-0.5" />}
            </div>
          )
        })}
      </div>
    </Card>
  )
}

function DiaryEditor({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const { user } = useAuth()
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [mood, setMood] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!user || !title || !content) return
    setSubmitting(true)
    await supabase.from('diary_entries').insert({
      user_id: user.id,
      title,
      content,
      date,
      mood,
    })
    setSubmitting(false)
    onSaved()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-cloud-700 mb-1">日期</label>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="w-full px-4 py-2 rounded-xl border border-cloud-200 focus:border-sakura-400 focus:ring-2 focus:ring-sakura-200/50 outline-none"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-cloud-700 mb-1">标题</label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="今天的故事..."
          required
          className="w-full px-4 py-2 rounded-xl border border-cloud-200 focus:border-sakura-400 focus:ring-2 focus:ring-sakura-200/50 outline-none"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-cloud-700 mb-1">心情</label>
        <div className="flex gap-2 flex-wrap">
          {moods.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMood(mood === m ? null : m)}
              className={`text-2xl p-2 rounded-xl transition-colors ${mood === m ? 'bg-sakura-100 ring-2 ring-sakura-300' : 'hover:bg-cloud-100'}`}
            >
              {m}
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-cloud-700 mb-1">内容</label>
        <p className="text-xs text-cloud-400 mb-2">支持 Markdown 语法</p>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="写下今天的心情..."
          rows={8}
          required
          className="w-full px-4 py-2 rounded-xl border border-cloud-200 focus:border-sakura-400 focus:ring-2 focus:ring-sakura-200/50 outline-none resize-none font-mono text-sm"
        />
      </div>
      <div className="flex gap-2 justify-end">
        <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-cloud-500 hover:bg-cloud-100 rounded-xl transition-colors">取消</button>
        <button type="submit" disabled={submitting || !title || !content} className="px-4 py-2 text-sm text-white bg-gradient-to-r from-sakura-400 to-sakura-500 hover:from-sakura-500 hover:to-sakura-600 disabled:bg-cloud-300 rounded-xl transition-all shadow-sm">
          {submitting ? '保存中...' : '保存'}
        </button>
      </div>
    </form>
  )
}

// Comments UI
function CommentsSection({ diaryId }: { diaryId: string }) {
  const { user } = useAuth()
  const [comments, setComments] = useState<DiaryComment[]>([])
  const [loading, setLoading] = useState(false)
  const [newContent, setNewContent] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!diaryId) return
    loadComments()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [diaryId])

  async function loadComments() {
    setLoading(true)
    try {
      const { data } = await supabase
        .from('diary_comments')
        .select('*')
        .eq('diary_id', diaryId)
        .order('created_at', { ascending: true })

      if (data) {
        const items = data as DiaryComment[]
        const userIds = Array.from(new Set(items.map((c) => c.user_id)))
        let profilesById: Record<string, Profile | undefined> = {}
        if (userIds.length > 0) {
          const { data: profilesData } = await supabase.from('profiles').select('*').in('id', userIds)
          if (profilesData) profilesById = Object.fromEntries((profilesData as Profile[]).map((p) => [p.id, p]))
        }
        setComments(items.map((c) => ({ ...c, author: profilesById[c.user_id] })))
      }
    } catch (e) {
      console.error('Failed to load comments', e)
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(commentId: string) {
    if (!confirm('确定删除这条评论吗？')) return
    await supabase.from('diary_comments').delete().eq('id', commentId)
    setComments((prev) => prev.filter((c) => c.id !== commentId))
  }

  async function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault()
    if (!user || !newContent.trim()) return
    setSubmitting(true)
    try {
      await supabase.from('diary_comments').insert({ diary_id: diaryId, user_id: user.id, content: newContent.trim() })
      setNewContent('')
      // reload comments
      await loadComments()
    } catch (e) {
      console.error('Failed to post comment', e)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mt-6">
      <h3 className="text-sm font-medium text-cloud-700 mb-3">评论</h3>

      {loading ? (
        <div className="text-cloud-400 text-sm">加载中评论...</div>
      ) : comments.length === 0 ? (
        <div className="text-cloud-400 text-sm">还没有评论，成为第一个说话的人吧 ❤️</div>
      ) : (
        <div className="space-y-3">
          {comments.map((c) => (
            <div key={c.id} className="flex items-start gap-3 group">
              <Avatar url={c.author?.avatar_url} name={c.author?.display_name ?? '他们'} size="sm" />
              <div className="flex-1">
                <div className="flex items-center gap-2 text-xs text-cloud-400 mb-1">
                  <span className="font-medium text-cloud-800">{c.author?.display_name ?? '匿名'}</span>
                  <span>·</span>
                  <span>{new Date(c.created_at).toLocaleString()}</span>
                  {user && user.id === c.user_id && (
                    <button
                      onClick={() => handleDelete(c.id)}
                      className="ml-auto text-cloud-300 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                    >
                      删除
                    </button>
                  )}
                </div>
                <div className="text-sm text-cloud-600">{c.content}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-4">
        {user ? (
          <div className="space-y-2">
            <textarea
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              rows={3}
              placeholder="写下你的评论..."
              className="w-full px-3 py-2 rounded-xl border border-cloud-200 focus:border-sakura-400 outline-none text-sm"
            />
            <div className="flex justify-end">
              <button type="submit" disabled={submitting || !newContent.trim()} className="px-3 py-1.5 text-xs text-white bg-gradient-to-r from-sakura-400 to-sakura-500 rounded-lg">
                {submitting ? '发布中...' : '发布评论'}
              </button>
            </div>
          </div>
        ) : (
          <div className="text-sm text-cloud-500">请先登录后再发表评论。</div>
        )}
      </form>
    </div>
  )
}
