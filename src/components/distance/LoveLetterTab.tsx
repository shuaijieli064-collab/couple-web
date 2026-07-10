import { useState, useEffect, type FormEvent } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { Card } from '../common/Card'
import { EmptyState } from '../common/EmptyState'
import { Modal } from '../common/Modal'
import { Avatar } from '../common/Avatar'
import { type LoveLetter, type Profile } from '../../types/database'
import { formatDate, formatRelative } from '../../utils/dateUtils'

export function LoveLetterTab() {
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
    // 标记已读
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

  // 收到和发送的情书
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

      {/* 定时发送中的情书 */}
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

      {/* 收到的情书 */}
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

      {/* 已发送的情书 */}
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

      {/* 写情书信封 */}
      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title="写一封情书">
        <LetterForm
          partnerId={partner?.id}
          onClose={() => setShowForm(false)}
          onCreated={() => { setShowForm(false); loadData() }}
        />
      </Modal>

      {/* 读情书详情 - 信纸风格 */}
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
    <Card onClick={onClick} className="flex items-center gap-3">
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
      {/* 信纸装饰边框 */}
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
