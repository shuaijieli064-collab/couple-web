import { useState, useEffect, type FormEvent } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { Card } from '../common/Card'
import { EmptyState } from '../common/EmptyState'
import { Modal } from '../common/Modal'
import { Avatar } from '../common/Avatar'
import { type DiaryEntry, type DiaryComment, type Profile, type LoveLetter } from '../../types/database'
import { formatDate, formatRelative } from '../../utils/dateUtils'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

const moods = ['😊', '😍', '🥰', '😢', '😤', '🤔', '😴', '🎉']

type ViewMode = 'timeline' | 'calendar'
type DiaryTab = 'diary' | 'letter'

export function DiaryPage() {
  const [activeTab, setActiveTab] = useState<DiaryTab>('diary')
  const [entries, setEntries] = useState<(DiaryEntry & { author?: Profile })[]>([])
  const [showEditor, setShowEditor] = useState(false)
  const [selectedEntry, setSelectedEntry] = useState<(DiaryEntry & { author?: Profile }) | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>('timeline')
  const [loading, setLoading] = useState(true)
  const [selectMode, setSelectMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    loadData()
  }, [])

  function toggleSelect(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function batchDeleteEntries() {
    if (!confirm(`确定删除选中的 ${selectedIds.size} 篇日记吗？`)) return
    for (const id of selectedIds) {
      await supabase.from('diary_entries').delete().eq('id', id)
    }
    setSelectedIds(new Set())
    setSelectMode(false)
    loadData()
  }

  async function loadData() {
    try {
      const { data } = await supabase
        .from('diary_entries')
        .select('*')
        .order('date', { ascending: false })

      if (data) {
        const diaryEntries = data as DiaryEntry[]
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
      </div>

      <div className="flex bg-sakura-100/60 rounded-xl p-1">
        <button
          onClick={() => setActiveTab('diary')}
          className={`flex-1 px-4 py-2 text-sm rounded-lg transition-colors ${
            activeTab === 'diary'
              ? 'bg-white text-cloud-800 shadow-sm font-medium'
              : 'text-cloud-400'
          }`}
        >
          日记
        </button>
        <button
          onClick={() => setActiveTab('letter')}
          className={`flex-1 px-4 py-2 text-sm rounded-lg transition-colors ${
            activeTab === 'letter'
              ? 'bg-white text-cloud-800 shadow-sm font-medium'
              : 'text-cloud-400'
          }`}
        >
          情书
        </button>
      </div>

      {activeTab === 'diary' && (
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
                    onClick={batchDeleteEntries}
                    disabled={selectedIds.size === 0}
                    className="px-4 py-2 text-sm text-white bg-red-400 hover:bg-red-500 disabled:opacity-50 rounded-xl transition-all"
                  >
                    删除 ({selectedIds.size})
                  </button>
                </>
              ) : (
                <>
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
                    onClick={() => setSelectMode(true)}
                    className="px-4 py-2 text-sm text-sakura-600 bg-sakura-50 hover:bg-sakura-100 rounded-xl transition-colors"
                  >
                    选择
                  </button>
                  <button
                    onClick={() => setShowEditor(true)}
                    className="px-4 py-2 text-sm text-white bg-gradient-to-r from-sakura-400 to-sakura-500 hover:from-sakura-500 hover:to-sakura-600 rounded-xl transition-all shadow-sm hover:shadow-md hover:shadow-sakura-200/40"
                  >
                    写日记
                  </button>
                </>
              )}
            </div>
          </div>

          {loading ? (
            <div className="text-center py-12 text-cloud-400">加载中...</div>
          ) : entries.length === 0 ? (
            <EmptyState icon="📝" title="还没有日记" description="写下今天的心情吧" />
          ) : viewMode === 'timeline' ? (
            <DiaryTimeline
              entries={entries}
              onSelect={setSelectedEntry}
              selectMode={selectMode}
              selectedIds={selectedIds}
              onToggleSelect={toggleSelect}
            />
          ) : (
            <DiaryCalendarView entries={entries} onSelect={setSelectedEntry} />
          )}

          <Modal isOpen={showEditor} onClose={() => setShowEditor(false)} title="写日记">
            <DiaryEditor
              onClose={() => setShowEditor(false)}
              onSaved={() => { setShowEditor(false); loadData() }}
            />
          </Modal>

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
                    className="text-sm text-red-400 hover:text-red-500 transition-colors"
                  >
                    删除
                  </button>
                </div>
              </div>
            )}
          </Modal>
        </div>
      )}

      {activeTab === 'letter' && (
        <LoveLettersSection />
      )}
    </div>
  )
}

function DiaryTimeline({ entries, onSelect, selectMode, selectedIds, onToggleSelect }: {
  entries: (DiaryEntry & { author?: Profile })[]
  onSelect: (e: DiaryEntry & { author?: Profile }) => void
  selectMode: boolean
  selectedIds: Set<string>
  onToggleSelect: (id: string) => void
}) {
  return (
    <div className="space-y-4">
      {entries.map((entry) => {
        const checked = selectedIds.has(entry.id)
        return (
          <div key={entry.id} className="relative group">
            <Card onClick={() => selectMode ? onToggleSelect(entry.id) : onSelect(entry)}>
              <div className="flex items-start gap-3">
                {selectMode && (
                  <div className={`mt-1 w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold transition-all shrink-0 ${checked ? 'bg-sakura-500 shadow-sm' : 'bg-white/70 border-2 border-cloud-200'}`}>
                    {checked ? '✓' : ''}
                  </div>
                )}
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
          </div>
        )
      })}
    </div>
  )
}

function DiaryCalendarView({ entries, onSelect }: { entries: (DiaryEntry & { author?: Profile })[]; onSelect: (e: DiaryEntry & { author?: Profile }) => void }) {
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

function CommentsSection({ diaryId }: { diaryId: string }) {
  const { user } = useAuth()
  const [comments, setComments] = useState<DiaryComment[]>([])
  const [loading, setLoading] = useState(false)
  const [newContent, setNewContent] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    if (!diaryId) return
    setErrorMsg('')
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
    const { error } = await supabase.from('diary_comments').delete().eq('id', commentId)
    if (error) return
    setComments((prev) => prev.filter((c) => c.id !== commentId))
  }

  async function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault()
    if (!user || !newContent.trim()) return
    setErrorMsg('')
    setSubmitting(true)
    const { error } = await supabase.from('diary_comments').insert({ diary_id: diaryId, user_id: user.id, content: newContent.trim() })
    if (error) {
      setErrorMsg(error.message === 'relation "diary_comments" does not exist' ? '评论功能尚未配置，请在 Supabase 中执行建表 SQL' : error.message)
      setSubmitting(false)
      return
    }
    setNewContent('')
    await loadComments()
    setSubmitting(false)
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
                      className="ml-auto text-cloud-300 hover:text-red-400 transition-colors opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto"
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

      {errorMsg && <div className="mt-3 text-xs text-red-400">{errorMsg}</div>}

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

// ==================== 情书模块 ====================

function LoveLettersSection() {
  const { user, profile } = useAuth()
  const [partner, setPartner] = useState<Profile | null>(null)
  const [letters, setLetters] = useState<LoveLetter[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [readingLetter, setReadingLetter] = useState<LoveLetter | null>(null)

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

      const { data: letterData } = await supabase
        .from('love_letters')
        .select('*')
        .order('created_at', { ascending: false })
      if (letterData) setLetters(letterData as LoveLetter[])
    } catch (err) {
      console.error('Failed to load letters:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  async function handleReadLetter(letter: LoveLetter) {
    setReadingLetter(letter)
    if (!letter.read_at && letter.to_user === user?.id && letter.sent) {
      const { error } = await supabase
        .from('love_letters')
        .update({ read_at: new Date().toISOString() })
        .eq('id', letter.id)
      if (error) {
        console.error('Mark read error:', error)
      }
      loadData()
    }
  }

  async function handleDelete(letter: LoveLetter) {
    if (!confirm('确定删除这封情书吗？')) return
    const { error } = await supabase.from('love_letters').delete().eq('id', letter.id)
    if (error) {
      console.error('Delete letter error:', error)
      return
    }
    setReadingLetter(null)
    loadData()
  }

  const receivedLetters = letters.filter((l) => l.to_user === user?.id && l.sent)
  const sentLetters = letters.filter((l) => l.from_user === user?.id)
  const scheduledLetters = sentLetters.filter((l) => !l.sent)

  if (loading) {
    return <div className="text-center py-12 text-cloud-400">加载中...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-cloud-400">把心里话写下来，慢慢说给Ta听</p>
        <button
          onClick={() => setShowForm(true)}
          className="px-4 py-2 text-sm text-white bg-gradient-to-r from-sakura-400 to-sakura-500 hover:from-sakura-500 hover:to-sakura-600 rounded-xl transition-all shadow-sm"
        >
          写情书
        </button>
      </div>

      {scheduledLetters.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-peach-600 mb-2">定时发送中</h3>
          <div className="space-y-2">
            {scheduledLetters.map((l) => (
              <Card key={l.id} className="flex items-center gap-3 bg-peach-50/50">
                <span className="text-xl">⏰</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-cloud-700 truncate">{l.title}</p>
                  <p className="text-xs text-peach-500">将于 {formatDate(l.scheduled_at)} 发送</p>
                </div>
                <button onClick={() => handleDelete(l)} className="text-xs text-cloud-300 hover:text-red-400 transition-colors">
                  取消
                </button>
              </Card>
            ))}
          </div>
        </div>
      )}

      <div>
        <h3 className="text-lg font-semibold text-cloud-700 mb-3">收到的情书 💌</h3>
        {receivedLetters.length === 0 ? (
          <EmptyState icon="📭" title="还没有收到的情书" description="等Ta给你写一封吧" />
        ) : (
          <div className="space-y-2">
            {receivedLetters.map((l) => (
              <LetterCard
                key={l.id}
                letter={l}
                name={partner?.display_name ?? 'Ta'}
                avatarUrl={partner?.avatar_url ?? null}
                isReceived
                isRead={!!l.read_at}
                onClick={() => handleReadLetter(l)}
              />
            ))}
          </div>
        )}
      </div>

      <div>
        <h3 className="text-lg font-semibold text-cloud-700 mb-3">已发送的情书 📮</h3>
        {sentLetters.filter((l) => l.sent).length === 0 ? (
          <Card className="text-center text-sm text-cloud-400 py-6">还没有发送过情书</Card>
        ) : (
          <div className="space-y-2">
            {sentLetters.filter((l) => l.sent).map((l) => (
              <LetterCard
                key={l.id}
                letter={l}
                name={partner?.display_name ?? 'Ta'}
                avatarUrl={partner?.avatar_url ?? null}
                isRead={!!l.read_at}
                onClick={() => handleReadLetter(l)}
              />
            ))}
          </div>
        )}
      </div>

      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title="写一封情书">
        <LetterForm
          partnerId={partner?.id}
          onClose={() => setShowForm(false)}
          onCreated={() => { setShowForm(false); loadData() }}
        />
      </Modal>

      <Modal isOpen={!!readingLetter} onClose={() => setReadingLetter(null)}>
        {readingLetter && (
          <LetterPaper
            letter={readingLetter}
            fromName={readingLetter.from_user === user?.id ? (profile?.display_name ?? '我') : (partner?.display_name ?? 'Ta')}
            toName={readingLetter.to_user === user?.id ? (profile?.display_name ?? '我') : (partner?.display_name ?? 'Ta')}
            onDelete={() => handleDelete(readingLetter)}
            canDelete={readingLetter.from_user === user?.id}
          />
        )}
      </Modal>
    </div>
  )
}

function LetterCard({
  letter,
  name,
  avatarUrl,
  isReceived,
  isRead,
  onClick,
}: {
  letter: LoveLetter
  name: string
  avatarUrl: string | null
  isReceived?: boolean
  isRead: boolean
  onClick: () => void
}) {
  return (
    <Card onClick={onClick} className="flex items-center gap-3 cursor-pointer hover:shadow-md transition-shadow">
      <Avatar url={avatarUrl} name={name} size="sm" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-cloud-800 truncate">{letter.title}</p>
          {isReceived && !isRead && (
            <span className="w-2 h-2 rounded-full bg-sakura-500 shrink-0" />
          )}
        </div>
        <p className="text-xs text-cloud-400 truncate">{letter.content.slice(0, 40)}...</p>
        <p className="text-xs text-cloud-300 mt-0.5">
          {formatRelative(letter.scheduled_at)}
          {isRead && <span className="ml-2">· 已读</span>}
        </p>
      </div>
      <span className="text-cloud-300">›</span>
    </Card>
  )
}

function LetterPaper({
  letter,
  fromName,
  toName,
  onDelete,
  canDelete,
}: {
  letter: LoveLetter
  fromName: string
  toName: string
  onDelete: () => void
  canDelete: boolean
}) {
  return (
    <div
      className="rounded-2xl p-6 md:p-8"
      style={{
        background: 'linear-gradient(135deg, #fff9f0 0%, #fff5f0 50%, #ffeede 100%)',
        boxShadow: 'inset 0 0 0 1px rgba(255, 200, 150, 0.3)',
      }}
    >
      <div className="border-2 border-dashed border-peach-200 rounded-xl p-5 md:p-6">
        <div className="text-center mb-4">
          <div className="text-3xl mb-2">💌</div>
          <p className="text-xs text-peach-400">致 {toName}</p>
        </div>

        <h2
          className="text-xl font-bold text-cloud-800 text-center mb-4"
          style={{ fontFamily: "'Quicksand', sans-serif" }}
        >
          {letter.title}
        </h2>

        <div
          className="text-sm text-cloud-700 leading-relaxed whitespace-pre-wrap mb-6"
          style={{ fontFamily: "'Nunito', sans-serif" }}
        >
          {letter.content}
        </div>

        <div className="text-right">
          <p className="text-sm text-cloud-500">—— {fromName}</p>
          <p className="text-xs text-cloud-400 mt-1">{formatDate(letter.scheduled_at)}</p>
        </div>
      </div>

      {canDelete && (
        <div className="text-center mt-4">
          <button
            onClick={onDelete}
            className="text-xs text-cloud-400 hover:text-red-400 transition-colors"
          >
            删除这封情书
          </button>
        </div>
      )}
    </div>
  )
}

function LetterForm({
  partnerId,
  onClose,
  onCreated,
}: {
  partnerId?: string
  onClose: () => void
  onCreated: () => void
}) {
  const { user } = useAuth()
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [sendMode, setSendMode] = useState<'now' | 'schedule'>('now')
  const [scheduledAt, setScheduledAt] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!user || !title || !content || !partnerId) return
    setSubmitting(true)
    try {
      const now = new Date().toISOString()
      const sendTime = sendMode === 'now' ? now : new Date(scheduledAt).toISOString()
      const { error } = await supabase.from('love_letters').insert({
        from_user: user.id,
        to_user: partnerId,
        title,
        content,
        scheduled_at: sendTime,
        sent: sendMode === 'now',
        read_at: null,
      })
      if (error) {
        console.error('Create letter error:', error)
        return
      }
      onCreated()
    } catch (err) {
      console.error('Create letter failed:', err)
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
          placeholder="给这封信起个名字..."
          required
          className="w-full px-4 py-2 rounded-xl border border-cloud-200 focus:border-sakura-400 focus:ring-2 focus:ring-sakura-200/50 outline-none"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-cloud-700 mb-1">内容</label>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="写下你想说的话..."
          rows={6}
          required
          className="w-full px-4 py-2 rounded-xl border border-cloud-200 focus:border-sakura-400 focus:ring-2 focus:ring-sakura-200/50 outline-none resize-none"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-cloud-700 mb-2">发送时间</label>
        <div className="flex gap-2 mb-2">
          <button
            type="button"
            onClick={() => setSendMode('now')}
            className={`flex-1 py-2 text-sm rounded-xl transition-all ${
              sendMode === 'now'
                ? 'bg-sakura-100 text-sakura-700 ring-2 ring-sakura-300 font-medium'
                : 'bg-cloud-50 text-cloud-500'
            }`}
          >
            立即发送
          </button>
          <button
            type="button"
            onClick={() => setSendMode('schedule')}
            className={`flex-1 py-2 text-sm rounded-xl transition-all ${
              sendMode === 'schedule'
                ? 'bg-peach-100 text-peach-700 ring-2 ring-peach-300 font-medium'
                : 'bg-cloud-50 text-cloud-500'
            }`}
          >
            定时发送
          </button>
        </div>
        {sendMode === 'schedule' && (
          <input
            type="datetime-local"
            value={scheduledAt}
            onChange={(e) => setScheduledAt(e.target.value)}
            required={sendMode === 'schedule'}
            className="w-full px-4 py-2 rounded-xl border border-cloud-200 focus:border-sakura-400 focus:ring-2 focus:ring-sakura-200/50 outline-none"
          />
        )}
      </div>
      <div className="flex gap-2 justify-end">
        <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-cloud-500 hover:bg-cloud-100 rounded-xl transition-colors">
          取消
        </button>
        <button
          type="submit"
          disabled={submitting || !title || !content || (sendMode === 'schedule' && !scheduledAt)}
          className="px-4 py-2 text-sm text-white bg-gradient-to-r from-sakura-400 to-sakura-500 hover:from-sakura-500 hover:to-sakura-600 disabled:bg-cloud-300 rounded-xl transition-all shadow-sm"
        >
          {submitting ? '发送中...' : sendMode === 'now' ? '发送' : '定时发送'}
        </button>
      </div>
    </form>
  )
}
