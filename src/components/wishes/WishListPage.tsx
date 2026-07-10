import { useState, useEffect, type FormEvent } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { Card } from '../common/Card'
import { EmptyState } from '../common/EmptyState'
import { Modal } from '../common/Modal'
import { type WishItem } from '../../types/database'
import { formatDate } from '../../utils/dateUtils'

const CATEGORIES: Record<string, { label: string; icon: string; color: string }> = {
  travel: { label: '旅行', icon: '✈️', color: 'bg-sakura-100 text-sakura-700' },
  food: { label: '美食', icon: '🍽️', color: 'bg-peach-100 text-peach-700' },
  activity: { label: '活动', icon: '🎯', color: 'bg-lilac-100 text-lilac-700' },
  gift: { label: '礼物', icon: '🎁', color: 'bg-peach-100 text-peach-700' },
  other: { label: '其他', icon: '💡', color: 'bg-cloud-100 text-cloud-600' },
}

const STATUS_CONFIG: Record<string, { label: string; color: string; order: number }> = {
  pending: { label: '待完成', color: 'text-cloud-500', order: 0 },
  in_progress: { label: '进行中', color: 'text-peach-600', order: 1 },
  completed: { label: '已完成', color: 'text-sakura-600', order: 2 },
}

const STATUS_CYCLE = ['pending', 'in_progress', 'completed']

export function WishListPage() {
  const { user } = useAuth()
  const [wishes, setWishes] = useState<WishItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)

  async function loadData() {
    if (!user) return
    setLoading(true)
    try {
      const { data } = await supabase
        .from('wish_items')
        .select('*')
        .order('created_at', { ascending: false })
      if (data) setWishes(data as WishItem[])
    } catch (err) {
      console.error('Failed to load wishes:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  async function handleCycleStatus(wish: WishItem) {
    if (!user) return
    const currentIdx = STATUS_CYCLE.indexOf(wish.status)
    const nextStatus = STATUS_CYCLE[(currentIdx + 1) % STATUS_CYCLE.length]
    const updates: Partial<WishItem> = { status: nextStatus }
    if (nextStatus === 'completed') {
      updates.completed_at = new Date().toISOString()
    } else {
      updates.completed_at = null
    }
    const { error } = await supabase.from('wish_items').update(updates).eq('id', wish.id)
    if (error) {
      console.error('Update wish status error:', error)
      return
    }
    loadData()
  }

  async function handleDelete(wish: WishItem) {
    if (!confirm(`确定删除愿望「${wish.title}」吗？`)) return
    const { error } = await supabase.from('wish_items').delete().eq('id', wish.id)
    if (error) {
      console.error('Delete wish error:', error)
      return
    }
    loadData()
  }

  const grouped = {
    pending: wishes.filter((w) => w.status === 'pending'),
    in_progress: wishes.filter((w) => w.status === 'in_progress'),
    completed: wishes.filter((w) => w.status === 'completed'),
  }

  if (loading) {
    return <div className="text-center py-12 text-cloud-400">加载中...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-xl md:text-2xl font-bold text-cloud-800" style={{ fontFamily: "'Quicksand', sans-serif" }}>
          愿望 🌟
        </h1>
        <button
          onClick={() => setShowForm(true)}
          className="px-4 py-2 text-sm text-white bg-gradient-to-r from-sakura-400 to-sakura-500 hover:from-sakura-500 hover:to-sakura-600 rounded-xl transition-all shadow-sm"
        >
          添加愿望
        </button>
      </div>

      <p className="text-sm text-cloud-400">一起攒愿望，一起实现它</p>

      {wishes.length === 0 ? (
        <EmptyState icon="🌟" title="愿望清单是空的" description="添加你们想一起完成的事吧" />
      ) : (
        <div className="space-y-5">
          {(['pending', 'in_progress', 'completed'] as const).map((status) => {
            const list = grouped[status]
            if (list.length === 0) return null
            const cfg = STATUS_CONFIG[status]
            return (
              <div key={status}>
                <div className="flex items-center gap-2 mb-2">
                  <h3 className={`text-sm font-semibold ${cfg.color}`}>{cfg.label}</h3>
                  <span className="text-xs text-cloud-400">({list.length})</span>
                  <div className="flex-1 h-px bg-cloud-100" />
                </div>
                <div className="space-y-2">
                  {list.map((wish) => (
                    <WishCard
                      key={wish.id}
                      wish={wish}
                      onCycle={() => handleCycleStatus(wish)}
                      onDelete={() => handleDelete(wish)}
                    />
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title="添加愿望">
        <WishForm
          onClose={() => setShowForm(false)}
          onCreated={() => { setShowForm(false); loadData() }}
        />
      </Modal>
    </div>
  )
}

function WishCard({
  wish,
  onCycle,
  onDelete,
}: {
  wish: WishItem
  onCycle: () => void
  onDelete: () => void
}) {
  const catCfg = CATEGORIES[wish.category] ?? CATEGORIES.other
  const statusCfg = STATUS_CONFIG[wish.status] ?? STATUS_CONFIG.pending
  const isCompleted = wish.status === 'completed'

  return (
    <Card className={isCompleted ? 'opacity-75' : ''}>
      <div className="flex items-start gap-3">
        <div className="text-2xl shrink-0">{catCfg.icon}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${catCfg.color}`}>{catCfg.label}</span>
            <span className={`text-xs font-medium ${statusCfg.color}`}>· {statusCfg.label}</span>
          </div>
          <p className={`text-sm font-medium text-cloud-800 ${isCompleted ? 'line-through' : ''}`}>{wish.title}</p>
          {wish.description && <p className="text-xs text-cloud-500 mt-1">{wish.description}</p>}
          <div className="flex items-center gap-3 mt-2">
            <button
              onClick={onCycle}
              className="text-xs text-sakura-500 hover:text-sakura-600 transition-colors"
            >
              切换状态 →
            </button>
            {isCompleted && wish.completed_at && (
              <span className="text-xs text-cloud-400">完成于 {formatDate(wish.completed_at)}</span>
            )}
            <button
              onClick={onDelete}
              className="text-xs text-cloud-300 hover:text-red-400 transition-colors ml-auto"
            >
              删除
            </button>
          </div>
        </div>
      </div>
    </Card>
  )
}

function WishForm({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const { user } = useAuth()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('travel')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!user || !title) return
    setSubmitting(true)
    try {
      const { error } = await supabase.from('wish_items').insert({
        title,
        description: description || null,
        category,
        status: 'pending',
        created_by: user.id,
      })
      if (error) {
        console.error('Create wish error:', error)
        return
      }
      onCreated()
    } catch (err) {
      console.error('Create wish failed:', err)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-cloud-700 mb-1">愿望标题</label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="例如：一起去日本看樱花"
          required
          className="w-full px-4 py-2 rounded-xl border border-cloud-200 focus:border-sakura-400 focus:ring-2 focus:ring-sakura-200/50 outline-none"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-cloud-700 mb-1">分类</label>
        <div className="flex flex-wrap gap-2">
          {Object.entries(CATEGORIES).map(([key, cfg]) => (
            <button
              key={key}
              type="button"
              onClick={() => setCategory(key)}
              className={`px-3 py-1.5 text-sm rounded-xl transition-all ${
                category === key
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
          disabled={submitting || !title}
          className="px-4 py-2 text-sm text-white bg-gradient-to-r from-sakura-400 to-sakura-500 hover:from-sakura-500 hover:to-sakura-600 disabled:bg-cloud-300 rounded-xl transition-all shadow-sm"
        >
          {submitting ? '添加中...' : '添加'}
        </button>
      </div>
    </form>
  )
}
