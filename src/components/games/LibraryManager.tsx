import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { Card } from '../common/Card'
import { Modal } from '../common/Modal'
import { type DailyTask, type QuizQuestion } from '../../types/database'

type ManageTab = 'tasks' | 'questions'

const TASK_CATEGORIES = [
  { value: 'sweet', label: '甜蜜' },
  { value: 'funny', label: '搞笑' },
  { value: 'challenge', label: '挑战' },
  { value: 'photo', label: '拍照' },
  { value: 'memory', label: '回忆' },
]

const QUIZ_CATEGORIES = [
  { value: 'food', label: '美食' },
  { value: 'habit', label: '习惯' },
  { value: 'memory', label: '回忆' },
  { value: 'preference', label: '喜好' },
]

const CATEGORY_LABELS: Record<string, string> = {
  sweet: '甜蜜', funny: '搞笑', challenge: '挑战', photo: '拍照', memory: '回忆',
  food: '美食', habit: '习惯', preference: '喜好',
}

const CATEGORY_COLORS: Record<string, string> = {
  sweet: 'bg-sakura-100 text-sakura-700',
  funny: 'bg-peach-100 text-peach-700',
  challenge: 'bg-lilac-100 text-lilac-700',
  photo: 'bg-cloud-100 text-cloud-700',
  memory: 'bg-sakura-100 text-sakura-700',
  food: 'bg-peach-100 text-peach-700',
  habit: 'bg-lilac-100 text-lilac-700',
  preference: 'bg-cloud-100 text-cloud-700',
}

export function LibraryManager() {
  const [activeTab, setActiveTab] = useState<ManageTab>('tasks')
  const [tasks, setTasks] = useState<DailyTask[]>([])
  const [questions, setQuestions] = useState<QuizQuestion[]>([])
  const [loading, setLoading] = useState(true)

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<DailyTask | QuizQuestion | null>(null)
  const [formContent, setFormContent] = useState('')
  const [formCategory, setFormCategory] = useState('')
  const [formDifficulty, setFormDifficulty] = useState(1)
  const [saving, setSaving] = useState(false)

  async function loadData() {
    setLoading(true)
    try {
      const [{ data: taskData }, { data: questionData }] = await Promise.all([
        supabase.from('daily_tasks').select('*').order('created_at', { ascending: false }),
        supabase.from('quiz_questions').select('*').order('created_at', { ascending: false }),
      ])
      if (taskData) setTasks(taskData as DailyTask[])
      if (questionData) setQuestions(questionData as QuizQuestion[])
    } catch (err) {
      console.error('Failed to load library:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  function openAddModal() {
    setEditingItem(null)
    setFormContent('')
    setFormCategory(activeTab === 'tasks' ? 'sweet' : 'memory')
    setFormDifficulty(1)
    setIsModalOpen(true)
  }

  function openEditModal(item: DailyTask | QuizQuestion) {
    setEditingItem(item)
    setFormContent('content' in item ? item.content : item.question)
    setFormCategory(item.category)
    if ('difficulty' in item) setFormDifficulty(item.difficulty)
    setIsModalOpen(true)
  }

  async function handleSave() {
    if (!formContent.trim() || !formCategory) return
    setSaving(true)

    try {
      if (activeTab === 'tasks') {
        if (editingItem && 'content' in editingItem) {
          await supabase
            .from('daily_tasks')
            .update({ content: formContent.trim(), category: formCategory, difficulty: formDifficulty })
            .eq('id', editingItem.id)
        } else {
          await supabase.from('daily_tasks').insert({
            content: formContent.trim(),
            category: formCategory,
            difficulty: formDifficulty,
          })
        }
      } else {
        if (editingItem && 'question' in editingItem) {
          await supabase
            .from('quiz_questions')
            .update({ question: formContent.trim(), category: formCategory })
            .eq('id', editingItem.id)
        } else {
          await supabase.from('quiz_questions').insert({
            question: formContent.trim(),
            category: formCategory,
          })
        }
      }
      setIsModalOpen(false)
      loadData()
    } catch (err) {
      console.error('Save error:', err)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(item: DailyTask | QuizQuestion) {
    if (!confirm('确定要删除这条数据吗？')) return
    try {
      if (activeTab === 'tasks' && 'content' in item) {
        await supabase.from('daily_tasks').delete().eq('id', item.id)
      } else if ('question' in item) {
        await supabase.from('quiz_questions').delete().eq('id', item.id)
      }
      loadData()
    } catch (err) {
      console.error('Delete error:', err)
    }
  }

  const currentList = activeTab === 'tasks' ? tasks : questions
  const currentCategories = activeTab === 'tasks' ? TASK_CATEGORIES : QUIZ_CATEGORIES
  const modalTitle = editingItem
    ? (activeTab === 'tasks' ? '编辑任务' : '编辑题目')
    : (activeTab === 'tasks' ? '添加任务' : '添加题目')

  return (
    <div className="space-y-6">
      {/* 子 Tab */}
      <div className="flex items-center justify-between">
        <div className="flex bg-sakura-100/60 rounded-xl p-1">
          <button
            onClick={() => setActiveTab('tasks')}
            className={`px-4 py-2 text-sm rounded-lg transition-colors ${
              activeTab === 'tasks'
                ? 'bg-white text-cloud-800 shadow-sm font-medium'
                : 'text-cloud-400'
            }`}
          >
            任务模板 ({tasks.length})
          </button>
          <button
            onClick={() => setActiveTab('questions')}
            className={`px-4 py-2 text-sm rounded-lg transition-colors ${
              activeTab === 'questions'
                ? 'bg-white text-cloud-800 shadow-sm font-medium'
                : 'text-cloud-400'
            }`}
          >
            问答题目 ({questions.length})
          </button>
        </div>
        <button
          onClick={openAddModal}
          className="px-4 py-2 text-sm text-white bg-gradient-to-r from-sakura-400 to-sakura-500 hover:from-sakura-500 hover:to-sakura-600 rounded-xl transition-all shadow-sm"
        >
          + 添加
        </button>
      </div>

      {/* 列表 */}
      {loading ? (
        <div className="text-center py-12 text-cloud-400">加载中...</div>
      ) : currentList.length === 0 ? (
        <div className="text-center py-12 text-cloud-400">
          <div className="text-4xl mb-2">📭</div>
          <p>暂无数据</p>
        </div>
      ) : (
        <div className="space-y-2">
          {currentList.map((item) => {
            const content = 'content' in item ? item.content : item.question
            return (
              <Card key={item.id} className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-cloud-800 mb-1.5">{content}</p>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${CATEGORY_COLORS[item.category] || CATEGORY_COLORS.sweet}`}>
                      {CATEGORY_LABELS[item.category] || item.category}
                    </span>
                    {'difficulty' in item && (
                      <span className="text-xs text-cloud-400">
                        难度: {'⭐'.repeat(item.difficulty)}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => openEditModal(item)}
                    className="p-1.5 text-cloud-400 hover:text-sakura-500 rounded-lg hover:bg-sakura-50 transition-colors"
                    title="编辑"
                  >
                    ✏️
                  </button>
                  <button
                    onClick={() => handleDelete(item)}
                    className="p-1.5 text-cloud-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors"
                    title="删除"
                  >
                    🗑️
                  </button>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {/* Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={modalTitle}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-cloud-700 mb-1.5">
              {activeTab === 'tasks' ? '任务内容' : '题目内容'}
            </label>
            <input
              type="text"
              value={formContent}
              onChange={(e) => setFormContent(e.target.value)}
              placeholder={activeTab === 'tasks' ? '例如：给对方一个拥抱' : '例如：Ta最喜欢吃什么？'}
              className="w-full px-4 py-2.5 rounded-xl border border-cloud-200 focus:border-sakura-400 focus:ring-2 focus:ring-sakura-200/50 outline-none text-cloud-800"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-cloud-700 mb-1.5">分类</label>
            <div className="flex flex-wrap gap-2">
              {currentCategories.map((cat) => (
                <button
                  key={cat.value}
                  onClick={() => setFormCategory(cat.value)}
                  className={`px-3 py-1.5 text-sm rounded-lg transition-all ${
                    formCategory === cat.value
                      ? 'bg-sakura-500 text-white shadow-sm'
                      : 'bg-cloud-100 text-cloud-600 hover:bg-sakura-50'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {activeTab === 'tasks' && (
            <div>
              <label className="block text-sm font-medium text-cloud-700 mb-1.5">难度</label>
              <div className="flex gap-2">
                {[1, 2, 3].map((d) => (
                  <button
                    key={d}
                    onClick={() => setFormDifficulty(d)}
                    className={`px-4 py-2 text-sm rounded-lg transition-all ${
                      formDifficulty === d
                        ? 'bg-sakura-500 text-white shadow-sm'
                        : 'bg-cloud-100 text-cloud-600 hover:bg-sakura-50'
                    }`}
                  >
                    {'⭐'.repeat(d)}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              onClick={() => setIsModalOpen(false)}
              className="flex-1 py-2.5 text-sm text-cloud-500 bg-cloud-100 hover:bg-cloud-200 rounded-xl transition-colors"
            >
              取消
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !formContent.trim()}
              className="flex-1 py-2.5 text-sm text-white bg-gradient-to-r from-sakura-400 to-sakura-500 hover:from-sakura-500 hover:to-sakura-600 disabled:bg-cloud-300 rounded-xl transition-all shadow-sm"
            >
              {saving ? '保存中...' : '保存'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
