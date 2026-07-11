import { useState, useEffect, useRef, type FormEvent } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { Card } from '../common/Card'
import { EmptyState } from '../common/EmptyState'
import { Modal } from '../common/Modal'
import { Avatar } from '../common/Avatar'
import { LibraryManager } from './LibraryManager'
import {
  type DailyTask,
  type TaskCompletion,
  type QuizQuestion,
  type QuizSession,
  type QuizAnswer,
  type DrawGuessRound,
  type TruthDareRound,
  type Profile,
} from '../../types/database'
import { formatRelative } from '../../utils/dateUtils'

type GameTab = 'tasks' | 'quiz' | 'tap' | 'draw' | 'truth' | 'manage'

const CATEGORY_COLORS: Record<string, string> = {
  sweet: 'bg-sakura-100 text-sakura-700',
  funny: 'bg-peach-100 text-peach-700',
  challenge: 'bg-lilac-100 text-lilac-700',
  photo: 'bg-cloud-100 text-cloud-700',
  memory: 'bg-sakura-100 text-sakura-700',
}

const CATEGORY_LABELS: Record<string, string> = {
  sweet: '甜蜜',
  funny: '搞笑',
  challenge: '挑战',
  photo: '拍照',
  memory: '回忆',
}

const TAP_EMOJIS = ['💕', '💗', '💖', '💓', '💞', '💝', '💘', '❤️']

const TRUTH_QUESTIONS = [
  '第一次喜欢的人是谁？',
  '你最想和我一起做的事是什么？',
  '你觉得我最吸引你的地方是？',
  '最近一次让你感动的事是什么？',
  '你的手机里有多少张我的照片？',
  '如果可以给我们的关系打个分（1-10），你会打多少？',
  '你理想中的约会是怎样的？',
  '你最喜欢我身上哪个特质？',
  '你有没有什么事一直没告诉我？',
  '你觉得我们最像哪对情侣？',
]

const DARE_CHALLENGES = [
  '给我发一张你现在的照片',
  '唱一首歌并录下来发给我',
  '说三句让我心动的话',
  '给我一个远程抱抱的视频',
  '模仿我说话的样子',
  '做一个最丑的表情并拍照',
  '说一个只有我们知道的秘密暗号',
  '给我写一封三行情书',
  '发一张你最得意的自拍',
  '用三种语言说我爱你',
]

// ==================== 工具函数 ====================
function similarityScore(a: string, b: string): number {
  const s1 = a.trim().toLowerCase().replace(/[^\u4e00-\u9fa5a-z0-9]/g, '')
  const s2 = b.trim().toLowerCase().replace(/[^\u4e00-\u9fa5a-z0-9]/g, '')
  if (s1 === s2) return 100
  if (s1.includes(s2) || s2.includes(s1)) return 80
  if (s1.length > 1 && s2.length > 1) {
    let common = 0
    for (const char of s1) {
      if (s2.includes(char)) common++
    }
    const similarity = (common * 2) / (s1.length + s2.length)
    if (similarity > 0.5) return Math.round(similarity * 100)
  }
  return 0
}

function getCommentByScore(score: number): { text: string; emoji: string } {
  if (score >= 86) return { text: '天作之合', emoji: '💕' }
  if (score >= 61) return { text: '心有灵犀', emoji: '✨' }
  if (score >= 31) return { text: '有点默契', emoji: '🌸' }
  return { text: '还需努力', emoji: '💪' }
}

function getTodayTask(tasks: DailyTask[]): DailyTask | null {
  if (tasks.length === 0) return null
  const today = new Date().toDateString()
  let seed = 0
  for (let i = 0; i < today.length; i++) {
    seed = (seed * 31 + today.charCodeAt(i)) % tasks.length
  }
  return tasks[seed]
}

function calculateStreak(completions: TaskCompletion[]): number {
  if (completions.length === 0) return 0
  const dates = [...new Set(completions.map((c) => c.completed_date))].sort().reverse()
  const today = new Date().toISOString().split('T')[0]
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]
  if (!dates.includes(today) && !dates.includes(yesterday)) return 0
  let streak = 0
  const checkDate = dates.includes(today) ? new Date() : new Date(Date.now() - 86400000)
  checkDate.setHours(0, 0, 0, 0)
  const dateSet = new Set(dates)
  while (true) {
    const dateStr = checkDate.toISOString().split('T')[0]
    if (dateSet.has(dateStr)) {
      streak++
      checkDate.setDate(checkDate.getDate() - 1)
    } else {
      break
    }
  }
  return streak
}

// ==================== 主页面 ====================
export function GamesPage() {
  const { user, profile } = useAuth()
  const [activeTab, setActiveTab] = useState<GameTab>('tasks')
  const [partner, setPartner] = useState<Profile | null>(null)
  const [loadingPartner, setLoadingPartner] = useState(true)

  // 戳戳游戏状态
  const [tapCount, setTapCount] = useState(0)
  const [floatingEmojis, setFloatingEmojis] = useState<{ id: number; x: number; y: number; emoji: string }[]>([])
  const emojiIdRef = useRef(0)

  async function loadTapCount(userId: string) {
    try {
      const today = new Date().toISOString().split('T')[0]
      const { data, error } = await supabase
        .from('tap_records')
        .select('tap_count')
        .eq('user_id', userId)
        .gte('created_at', `${today}T00:00:00`)
        .lte('created_at', `${today}T23:59:59`)
        .limit(1)
      if (error) {
        console.error('Failed to load tap count:', error)
        return
      }
      if (data && data.length > 0) {
        setTapCount((data[0] as { tap_count: number }).tap_count)
      } else {
        setTapCount(0)
      }
    } catch (err) {
      console.error('Failed to load tap count:', err)
    }
  }

  async function saveTapCount(userId: string, count: number) {
    try {
      const today = new Date().toISOString().split('T')[0]
      const { data: existing, error: selectError } = await supabase
        .from('tap_records')
        .select('id')
        .eq('user_id', userId)
        .gte('created_at', `${today}T00:00:00`)
        .lte('created_at', `${today}T23:59:59`)
        .limit(1)
      if (selectError) {
        console.error('Failed to check existing tap record:', selectError)
        return
      }
      let error: unknown
      if (existing && existing.length > 0) {
        const { error: updateError } = await supabase
          .from('tap_records')
          .update({ tap_count: count })
          .eq('id', existing[0].id)
        error = updateError
      } else {
        const { error: insertError } = await supabase
          .from('tap_records')
          .insert({ user_id: userId, tap_count: count })
        error = insertError
      }
      if (error) {
        console.error('Failed to save tap count:', error)
      }
    } catch (err) {
      console.error('Failed to save tap count:', err)
    }
  }

  function handleTap(e: React.MouseEvent<HTMLButtonElement>) {
    if (!user) return
    setTapCount((c) => c + 1)
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const emoji = TAP_EMOJIS[Math.floor(Math.random() * TAP_EMOJIS.length)]
    const id = ++emojiIdRef.current
    setFloatingEmojis((prev) => [...prev, { id, x, y, emoji }])
    setTimeout(() => {
      setFloatingEmojis((prev) => prev.filter((e) => e.id !== id))
    }, 1200)
  }

  useEffect(() => {
    if (!user || tapCount < 1) return
    saveTapCount(user.id, tapCount)
  }, [tapCount, user])

  useEffect(() => {
    if (!user) return
    loadTapCount(user.id)
  }, [user])

  useEffect(() => {
    if (!user) return
    supabase
      .from('profiles')
      .select('*')
      .neq('id', user.id)
      .limit(1)
      .then(({ data }) => {
        if (data && data.length > 0) setPartner(data[0] as Profile)
        setLoadingPartner(false)
      })
  }, [user])

  if (!user) return null

  const tabs: { key: GameTab; label: string }[] = [
    { key: 'tasks', label: '每日任务' },
    { key: 'quiz', label: '默契问答' },
    { key: 'tap', label: '戳戳' },
    { key: 'draw', label: '你画我猜' },
    { key: 'truth', label: '真心话' },
    { key: 'manage', label: '题库管理' },
  ]

  return (
    <div className="space-y-6">
      <h1 className="text-xl md:text-2xl font-bold text-cloud-800" style={{ fontFamily: "'Quicksand', sans-serif" }}>
        游戏 🎮
      </h1>

      <div className="flex bg-sakura-100/60 rounded-xl p-1 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 min-w-fit px-3 py-2 text-sm rounded-lg transition-colors whitespace-nowrap ${
              activeTab === tab.key
                ? 'bg-white text-cloud-800 shadow-sm font-medium'
                : 'text-cloud-400'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'tasks' && (
        <DailyTaskSection user={user} profile={profile} partner={partner} loadingPartner={loadingPartner} />
      )}
      {activeTab === 'quiz' && (
        <QuizSection user={user} profile={profile} partner={partner} loadingPartner={loadingPartner} />
      )}
      {activeTab === 'tap' && (
        <TapGame
          tapCount={tapCount}
          setTapCount={setTapCount}
          floatingEmojis={floatingEmojis}
          onTap={handleTap}
          partner={partner}
        />
      )}
      {activeTab === 'draw' && <DrawGuessGame />}
      {activeTab === 'truth' && <TruthDareGame partner={partner} />}
      {activeTab === 'manage' && <LibraryManager />}
    </div>
  )
}

// ==================== 每日任务模块 ====================
function DailyTaskSection({
  user,
  profile,
  partner,
  loadingPartner,
}: {
  user: NonNullable<ReturnType<typeof useAuth>['user']>
  profile: ReturnType<typeof useAuth>['profile']
  partner: Profile | null
  loadingPartner: boolean
}) {
  const [tasks, setTasks] = useState<DailyTask[]>([])
  const [completions, setCompletions] = useState<TaskCompletion[]>([])
  const [loading, setLoading] = useState(true)
  const [myStreak, setMyStreak] = useState(0)
  const [partnerStreak, setPartnerStreak] = useState(0)

  const todayTask = getTodayTask(tasks)
  const todayStr = new Date().toISOString().split('T')[0]

  const myCompletedToday = completions.some(
    (c) => c.user_id === user.id && c.completed_date === todayStr && c.task_id === todayTask?.id
  )
  const partnerCompletedToday = completions.some(
    (c) => c.user_id === partner?.id && c.completed_date === todayStr && c.task_id === todayTask?.id
  )

  async function loadData() {
    if (!user) return
    setLoading(true)
    try {
      const { data: tasksData } = await supabase.from('daily_tasks').select('*')
      if (tasksData) setTasks(tasksData as DailyTask[])

      const { data: compData } = await supabase.from('task_completions').select('*')
      if (compData) {
        setCompletions(compData as TaskCompletion[])
        setMyStreak(calculateStreak(compData.filter((c: TaskCompletion) => c.user_id === user.id)))
        if (partner) {
          setPartnerStreak(calculateStreak(compData.filter((c: TaskCompletion) => c.user_id === partner.id)))
        }
      }
    } catch (err) {
      console.error('Failed to load daily tasks:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, partner?.id])

  async function handleComplete() {
    if (!user || !todayTask) return
    const { error } = await supabase.from('task_completions').insert({
      task_id: todayTask.id,
      user_id: user.id,
      completed_date: todayStr,
    })
    if (error) {
      console.error('Complete task error:', error)
      return
    }
    loadData()
  }

  async function handleUndo() {
    if (!user || !todayTask) return
    await supabase
      .from('task_completions')
      .delete()
      .eq('task_id', todayTask.id)
      .eq('user_id', user.id)
      .eq('completed_date', todayStr)
    loadData()
  }

  const recentHistory = completions
    .filter((c) => c.task_id === todayTask?.id)
    .sort((a, b) => b.completed_date.localeCompare(a.completed_date))
    .slice(0, 7)

  if (loading || loadingPartner) {
    return <div className="text-center py-12 text-cloud-400">加载中...</div>
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <Card className="text-center">
          <div className="text-3xl mb-1">🔥</div>
          <div className="text-2xl font-bold text-sakura-600" style={{ fontFamily: "'Quicksand', sans-serif" }}>
            {myStreak}
          </div>
          <div className="text-xs text-cloud-400">我的连续打卡</div>
        </Card>
        {partner && (
          <Card className="text-center">
            <div className="text-3xl mb-1">🔥</div>
            <div className="text-2xl font-bold text-peach-600" style={{ fontFamily: "'Quicksand', sans-serif" }}>
              {partnerStreak}
            </div>
            <div className="text-xs text-cloud-400">{partner.display_name}的连续打卡</div>
          </Card>
        )}
      </div>

      {todayTask ? (
        <Card className={myCompletedToday && partnerCompletedToday ? 'bg-gradient-to-r from-sakura-50 to-peach-50 border-sakura-200' : ''}>
          <div className="flex items-center gap-2 mb-3">
            <span className={`text-xs px-2 py-1 rounded-full font-medium ${CATEGORY_COLORS[todayTask.category] || CATEGORY_COLORS.sweet}`}>
              {CATEGORY_LABELS[todayTask.category] || '甜蜜'}
            </span>
            <span className="text-xs text-cloud-400">今日任务</span>
          </div>

          <p className="text-lg font-medium text-cloud-800 mb-4">{todayTask.content}</p>

          <div className="flex items-center gap-4 mb-4">
            <div className="flex items-center gap-2">
              <Avatar url={profile?.avatar_url} name={profile?.display_name ?? '我'} size="sm" />
              <span className={`text-sm ${myCompletedToday ? 'text-sakura-600 font-medium' : 'text-cloud-400'}`}>
                {myCompletedToday ? '✓ 已完成' : '未完成'}
              </span>
            </div>
            {partner && (
              <div className="flex items-center gap-2">
                <Avatar url={partner.avatar_url} name={partner.display_name} size="sm" />
                <span className={`text-sm ${partnerCompletedToday ? 'text-sakura-600 font-medium' : 'text-cloud-400'}`}>
                  {partnerCompletedToday ? '✓ 已完成' : '未完成'}
                </span>
              </div>
            )}
          </div>

          {myCompletedToday ? (
            <button
              onClick={handleUndo}
              className="w-full py-2.5 text-sm text-cloud-500 bg-cloud-100 hover:bg-cloud-200 rounded-xl transition-colors"
            >
              撤销打卡
            </button>
          ) : (
            <button
              onClick={handleComplete}
              className="w-full py-2.5 text-sm text-white bg-gradient-to-r from-sakura-400 to-sakura-500 hover:from-sakura-500 hover:to-sakura-600 rounded-xl transition-all shadow-sm"
            >
              完成打卡 ✓
            </button>
          )}

          {myCompletedToday && partnerCompletedToday && (
            <div className="mt-3 text-center text-sm text-sakura-600">
              🎉 双方都完成了！今天也是甜蜜的一天 ~
            </div>
          )}
        </Card>
      ) : (
        <EmptyState icon="📋" title="还没有任务" description="去题库管理添加任务模板吧" />
      )}

      {recentHistory.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-cloud-700 mb-3">最近打卡记录</h2>
          <div className="space-y-2">
            {recentHistory.map((h) => (
              <div key={h.id} className="flex items-center justify-between bg-white rounded-xl p-3 border border-sakura-100/50">
                <div className="flex items-center gap-2">
                  <span className="text-sm">{h.user_id === user.id ? '我' : partner?.display_name}</span>
                  <span className="text-xs text-cloud-400">{h.completed_date}</span>
                </div>
                <span className="text-sakura-500 text-sm">✓ 已完成</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ==================== 默契问答模块 ====================
function QuizSection({
  user,
  profile,
  partner,
  loadingPartner,
}: {
  user: NonNullable<ReturnType<typeof useAuth>['user']>
  profile: ReturnType<typeof useAuth>['profile']
  partner: Profile | null
  loadingPartner: boolean
}) {
  const [questions, setQuestions] = useState<QuizQuestion[]>([])
  const [activeSession, setActiveSession] = useState<QuizSession | null>(null)
  const [sessionAnswers, setSessionAnswers] = useState<QuizAnswer[]>([])
  const [loading, setLoading] = useState(true)
  const [currentAnswers, setCurrentAnswers] = useState<Record<string, string>>({})
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [submitting, setSubmitting] = useState(false)

  async function loadData() {
    if (!user) return
    setLoading(true)
    try {
      const { data: qData } = await supabase.from('quiz_questions').select('*')
      if (qData) setQuestions(qData as QuizQuestion[])

      const { data: sData } = await supabase
        .from('quiz_sessions')
        .select('*')
        .or(`player1_id.eq.${user.id},player2_id.eq.${user.id}`)
        .order('created_at', { ascending: false })
        .limit(1)

      if (sData && sData.length > 0) {
        const session = sData[0] as QuizSession
        const sessionTime = new Date(session.created_at).getTime()
        if (Date.now() - sessionTime < 24 * 60 * 60 * 1000) {
          setActiveSession(session)
          const { data: aData } = await supabase
            .from('quiz_answers')
            .select('*')
            .eq('session_id', session.id)
          if (aData) setSessionAnswers(aData as QuizAnswer[])
        }
      }
    } catch (err) {
      console.error('Failed to load quiz data:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  async function startNewSession() {
    if (!user || !partner || questions.length < 5) return
    setSubmitting(true)
    const shuffled = [...questions].sort(() => Math.random() - 0.5)
    const selected = shuffled.slice(0, 5)

    const { data, error } = await supabase
      .from('quiz_sessions')
      .insert({
        created_by: user.id,
        question_ids: selected.map((q) => q.id),
        player1_id: user.id,
        player2_id: partner.id,
        status: 'active',
      })
      .select()
      .single()

    setSubmitting(false)
    if (error) {
      console.error('Start session error:', error)
      return
    }
    if (data) {
      setActiveSession(data as QuizSession)
      setSessionAnswers([])
      setCurrentAnswers({})
      setCurrentQuestionIndex(0)
    }
  }

  async function submitAnswer() {
    if (!user || !activeSession) return
    const currentQId = activeSession.question_ids[currentQuestionIndex]
    const answer = currentAnswers[currentQId]?.trim()
    if (!answer) return

    setSubmitting(true)
    await supabase.from('quiz_answers').insert({
      session_id: activeSession.id,
      question_id: currentQId,
      user_id: user.id,
      answer,
    })

    if (currentQuestionIndex < activeSession.question_ids.length - 1) {
      setCurrentQuestionIndex((i) => i + 1)
      setSubmitting(false)
    } else {
      const isPlayer1 = activeSession.player1_id === user.id
      const updateField = isPlayer1 ? 'player1_done' : 'player2_done'
      const { data: updated } = await supabase
        .from('quiz_sessions')
        .update({ [updateField]: true })
        .eq('id', activeSession.id)
        .select()
        .single()

      if (updated) {
        setActiveSession(updated as QuizSession)
        const { data: aData } = await supabase
          .from('quiz_answers')
          .select('*')
          .eq('session_id', activeSession.id)
        if (aData) setSessionAnswers(aData as QuizAnswer[])
      }
      setSubmitting(false)
    }
  }

  async function checkResult() {
    if (!activeSession) return
    const { data: aData } = await supabase
      .from('quiz_answers')
      .select('*')
      .eq('session_id', activeSession.id)
    if (aData) {
      setSessionAnswers(aData as QuizAnswer[])
      const updated = { ...activeSession, status: 'completed', player1_done: true, player2_done: true }
      setActiveSession(updated)
    }
  }

  const resultData = (() => {
    if (!activeSession || activeSession.status !== 'completed') return null
    const qList = questions.filter((q) => activeSession.question_ids.includes(q.id))
    const results = qList.map((q) => {
      const p1Answer = sessionAnswers.find((a) => a.question_id === q.id && a.user_id === activeSession.player1_id)
      const p2Answer = sessionAnswers.find((a) => a.question_id === q.id && a.user_id === activeSession.player2_id)
      const score = p1Answer && p2Answer ? similarityScore(p1Answer.answer, p2Answer.answer) : 0
      return {
        question: q,
        p1Answer: p1Answer?.answer ?? '',
        p2Answer: p2Answer?.answer ?? '',
        score,
      }
    })
    const totalScore = results.length > 0 ? Math.round(results.reduce((s, r) => s + r.score, 0) / results.length) : 0
    return { results, totalScore }
  })()

  if (loading || loadingPartner) {
    return <div className="text-center py-12 text-cloud-400">加载中...</div>
  }

  if (!activeSession) {
    return (
      <div className="space-y-6">
        <Card className="text-center">
          <div className="text-4xl mb-3">🧩</div>
          <h2 className="text-lg font-semibold text-cloud-800 mb-2">默契大考验</h2>
          <p className="text-sm text-cloud-500 mb-4">
            回答同一套问题，看看你们有多默契！
            <br />
            系统会随机抽取 5 道题目，双方各自回答后对比答案。
          </p>
          {partner ? (
            <button
              onClick={startNewSession}
              disabled={submitting || questions.length < 5}
              className="px-6 py-2.5 text-sm text-white bg-gradient-to-r from-sakura-400 to-sakura-500 hover:from-sakura-500 hover:to-sakura-600 disabled:bg-cloud-300 rounded-xl transition-all shadow-sm"
            >
              {submitting ? '准备中...' : questions.length < 5 ? '题目不足（至少5题）' : '开始挑战'}
            </button>
          ) : (
            <p className="text-sm text-cloud-400">等待找到你的另一半...</p>
          )}
        </Card>
      </div>
    )
  }

  const isPlayer1 = activeSession.player1_id === user.id
  const myDone = isPlayer1 ? activeSession.player1_done : activeSession.player2_done
  const otherDone = isPlayer1 ? activeSession.player2_done : activeSession.player1_done

  if (resultData) {
    const comment = getCommentByScore(resultData.totalScore)
    return (
      <div className="space-y-6">
        <Card className="text-center bg-gradient-to-r from-sakura-50 to-peach-50 border-sakura-200">
          <div className="text-5xl mb-2">{comment.emoji}</div>
          <div className="text-5xl font-bold text-sakura-600 mb-1" style={{ fontFamily: "'Quicksand', sans-serif" }}>
            {resultData.totalScore}%
          </div>
          <div className="text-lg font-medium text-cloud-700">{comment.text}</div>
        </Card>

        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-cloud-700">答题对比</h2>
          {resultData.results.map((r, i) => (
            <Card key={r.question.id}>
              <div className="flex items-start gap-2 mb-3">
                <span className="text-xs bg-sakura-100 text-sakura-700 px-2 py-0.5 rounded-full font-medium">
                  第{i + 1}题
                </span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${r.score >= 80 ? 'bg-sakura-100 text-sakura-700' : r.score >= 50 ? 'bg-peach-100 text-peach-700' : 'bg-cloud-100 text-cloud-600'}`}>
                  默契度 {r.score}%
                </span>
              </div>
              <p className="text-sm font-medium text-cloud-800 mb-3">{r.question.question}</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-sakura-50 rounded-xl p-3">
                  <div className="text-xs text-sakura-500 mb-1">
                    <Avatar url={profile?.avatar_url} name={profile?.display_name ?? '我'} size="xs" /> 我的答案
                  </div>
                  <p className="text-sm text-cloud-700">{r.p1Answer || '未回答'}</p>
                </div>
                <div className="bg-peach-50 rounded-xl p-3">
                  <div className="text-xs text-peach-500 mb-1">
                    <Avatar url={partner?.avatar_url} name={partner?.display_name ?? 'Ta'} size="xs" /> Ta的答案
                  </div>
                  <p className="text-sm text-cloud-700">{r.p2Answer || '未回答'}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>

        <button
          onClick={() => {
            setActiveSession(null)
            setSessionAnswers([])
            setCurrentAnswers({})
            setCurrentQuestionIndex(0)
          }}
          className="w-full py-2.5 text-sm text-white bg-gradient-to-r from-sakura-400 to-sakura-500 hover:from-sakura-500 hover:to-sakura-600 rounded-xl transition-all shadow-sm"
        >
          再来一次
        </button>
      </div>
    )
  }

  if (myDone && !otherDone) {
    return (
      <Card className="text-center">
        <div className="text-4xl mb-3">⏳</div>
        <h2 className="text-lg font-semibold text-cloud-800 mb-2">等待对方完成...</h2>
        <p className="text-sm text-cloud-500 mb-4">
          你已经答完了！等 {partner?.display_name ?? '对方'} 完成后就能看到结果啦
        </p>
        <button
          onClick={checkResult}
          className="px-4 py-2 text-sm text-sakura-600 bg-sakura-50 hover:bg-sakura-100 rounded-xl transition-colors"
        >
          刷新状态
        </button>
      </Card>
    )
  }

  if (myDone && otherDone && activeSession.status !== 'completed') {
    return (
      <Card className="text-center">
        <div className="text-4xl mb-3">🎉</div>
        <h2 className="text-lg font-semibold text-cloud-800 mb-2">双方都答完了！</h2>
        <p className="text-sm text-cloud-500 mb-4">正在计算默契度...</p>
        <button
          onClick={checkResult}
          className="px-6 py-2.5 text-sm text-white bg-gradient-to-r from-sakura-400 to-sakura-500 rounded-xl transition-all shadow-sm"
        >
          查看结果
        </button>
      </Card>
    )
  }

  const currentQId = activeSession.question_ids[currentQuestionIndex]
  const currentQuestion = questions.find((q) => q.id === currentQId)

  if (!currentQuestion) {
    return <div className="text-center py-12 text-cloud-400">题目加载失败</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <div className="flex-1 h-2 bg-cloud-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-sakura-400 to-sakura-500 rounded-full transition-all"
            style={{ width: `${(currentQuestionIndex / activeSession.question_ids.length) * 100}%` }}
          />
        </div>
        <span className="text-xs text-cloud-400">
          {currentQuestionIndex + 1} / {activeSession.question_ids.length}
        </span>
      </div>

      <Card>
        <div className="text-center mb-6">
          <span className="text-xs bg-sakura-100 text-sakura-700 px-2 py-1 rounded-full">
            第 {currentQuestionIndex + 1} 题
          </span>
        </div>

        <p className="text-lg font-medium text-cloud-800 text-center mb-6">
          {currentQuestion.question}
        </p>

        <input
          type="text"
          value={currentAnswers[currentQId] ?? ''}
          onChange={(e) =>
            setCurrentAnswers((prev) => ({ ...prev, [currentQId]: e.target.value }))
          }
          placeholder="输入你的答案..."
          className="w-full px-4 py-3 rounded-xl border border-cloud-200 focus:border-sakura-400 focus:ring-2 focus:ring-sakura-200/50 outline-none text-cloud-800 text-center mb-4"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && currentAnswers[currentQId]?.trim()) {
              submitAnswer()
            }
          }}
        />

        <button
          onClick={submitAnswer}
          disabled={submitting || !currentAnswers[currentQId]?.trim()}
          className="w-full py-2.5 text-sm text-white bg-gradient-to-r from-sakura-400 to-sakura-500 hover:from-sakura-500 hover:to-sakura-600 disabled:bg-cloud-300 rounded-xl transition-all shadow-sm"
        >
          {submitting
            ? '提交中...'
            : currentQuestionIndex < activeSession.question_ids.length - 1
              ? '下一题'
              : '提交答案'}
        </button>
      </Card>
    </div>
  )
}

// ==================== 戳戳游戏 ====================
function TapGame({
  tapCount,
  setTapCount,
  floatingEmojis,
  onTap,
  partner,
}: {
  tapCount: number
  setTapCount: (n: number) => void
  floatingEmojis: { id: number; x: number; y: number; emoji: string }[]
  onTap: (e: React.MouseEvent<HTMLButtonElement>) => void
  partner: Profile | null
}) {
  const [scale, setScale] = useState(1)
  const [tapGoal, setTapGoal] = useState(52)

  const progress = Math.min((tapCount / tapGoal) * 100, 100)

  return (
    <div className="text-center space-y-6">
      <p className="text-cloud-400 text-sm">
        {partner ? `戳一下${partner.display_name}的脸 🫵` : '戳一下 🫵'}
      </p>

      <div className="relative mx-auto w-64 h-64">
        <button
          onClick={onTap}
          onMouseDown={() => setScale(0.95)}
          onMouseUp={() => setScale(1)}
          onMouseLeave={() => setScale(1)}
          onTouchStart={() => setScale(0.95)}
          onTouchEnd={() => setScale(1)}
          style={{ transform: `scale(${scale})` }}
          className="relative w-full h-full rounded-full overflow-hidden shadow-lg transition-transform duration-100 cursor-pointer ring-4 ring-sakura-200 ring-offset-4 ring-offset-peach-50"
        >
          {partner?.avatar_url ? (
            <img src={partner.avatar_url} alt={partner.display_name ?? 'Ta'} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-sakura-200 to-sakura-300 flex items-center justify-center text-6xl">
              😊
            </div>
          )}
        </button>
        {floatingEmojis.map((em) => (
          <span
            key={em.id}
            style={{ left: em.x, top: em.y, animation: 'float-up 1.2s ease-out forwards' }}
            className="absolute -translate-x-1/2 -translate-y-1/2 text-3xl pointer-events-none z-10"
          >
            {em.emoji}
          </span>
        ))}
      </div>

      <div className="max-w-xs mx-auto">
        <div className="flex justify-between text-sm mb-2">
          <span className="text-cloud-500">互动值</span>
          <span className="text-sakura-600 font-semibold">{tapCount} / {tapGoal}</span>
        </div>
        <div className="h-3 bg-sakura-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-sakura-400 to-sakura-500 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-xs text-cloud-400 mt-2">
          {tapCount >= tapGoal ? '🎉 达成目标！你们好甜～' : `再戳 ${tapGoal - tapCount} 下就满啦`}
        </p>
      </div>

      <div className="flex gap-2 justify-center flex-wrap">
        {[52, 99, 131, 520].map((n) => (
          <button
            key={n}
            onClick={() => { setTapGoal(n); setTapCount(0) }}
            className={`px-4 py-1.5 text-xs rounded-xl transition-all ${
              tapGoal === n
                ? 'bg-sakura-100 text-sakura-700 ring-2 ring-sakura-300 font-medium'
                : 'bg-cloud-50 text-cloud-500 hover:bg-cloud-100'
            }`}
          >
            {n} 次
          </button>
        ))}
      </div>
    </div>
  )
}

// ==================== 你画我猜 ====================
function DrawGuessGame() {
  const { user, profile } = useAuth()
  const [rounds, setRounds] = useState<DrawGuessRound[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreator, setShowCreator] = useState(false)
  const [selectedRound, setSelectedRound] = useState<DrawGuessRound | null>(null)
  const [showAnswer, setShowAnswer] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  async function loadData() {
    setLoading(true)
    try {
      const { data } = await supabase
        .from('draw_guess_rounds')
        .select('*')
        .order('created_at', { ascending: false })
      if (data) setRounds(data as DrawGuessRound[])
    } catch (err) {
      console.error('Failed to load draw rounds:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  async function handleDelete(roundId: string) {
    if (!confirm('确定要删除这一轮吗？')) return
    setDeletingId(roundId)
    try {
      const { error } = await supabase
        .from('draw_guess_rounds')
        .delete()
        .eq('id', roundId)
      if (error) {
        alert(`删除失败: ${error.message}`)
        return
      }
      setRounds(prev => prev.filter(r => r.id !== roundId))
      if (selectedRound?.id === roundId) {
        setSelectedRound(null)
      }
    } catch (err) {
      console.error('Delete round error:', err)
      alert(`删除失败: ${(err as Error).message}`)
    } finally {
      setDeletingId(null)
    }
  }

  if (loading) return <div className="text-center py-12 text-cloud-400">加载中...</div>

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-cloud-400">画下来，让Ta猜 ✏️</p>
        <button
          onClick={() => setShowCreator(true)}
          className="px-4 py-2 text-sm text-white bg-gradient-to-r from-sakura-400 to-sakura-500 hover:from-sakura-500 hover:to-sakura-600 rounded-xl transition-all shadow-sm"
        >
          发起一轮
        </button>
      </div>

      {rounds.length === 0 ? (
        <EmptyState icon="🎨" title="还没有你画我猜" description="发起第一轮吧" />
      ) : (
        <div className="space-y-2">
          {rounds.map((r) => (
            <DrawRoundCard
              key={r.id}
              round={r}
              onClick={() => { setSelectedRound(r); setShowAnswer(false) }}
              isMine={r.drawer_id === user?.id}
              onDelete={() => handleDelete(r.id)}
              deleting={deletingId === r.id}
            />
          ))}
        </div>
      )}

      <Modal isOpen={showCreator} onClose={() => setShowCreator(false)} title="发起你画我猜">
        <DrawRoundCreator
          onClose={() => setShowCreator(false)}
          onCreated={() => { setShowCreator(false); loadData() }}
        />
      </Modal>

      <Modal isOpen={!!selectedRound} onClose={() => setSelectedRound(null)}>
        {selectedRound && (
          <DrawRoundDetail
            key={selectedRound.id + '-' + selectedRound.guessed}
            round={selectedRound}
            showAnswer={showAnswer}
            onToggleAnswer={() => setShowAnswer(!showAnswer)}
            isDrawer={selectedRound.drawer_id === user?.id}
            drawerName={selectedRound.drawer_id === user?.id ? (profile?.display_name ?? '我') : 'Ta'}
            onGuessed={(updated) => {
              loadData()
              setSelectedRound(updated)
            }}
            onDelete={() => handleDelete(selectedRound.id)}
          />
        )}
      </Modal>
    </div>
  )
}

function DrawRoundCard({
  round,
  onClick,
  isMine,
  onDelete,
  deleting,
}: {
  round: DrawGuessRound
  onClick: () => void
  isMine: boolean
  onDelete: () => void
  deleting: boolean
}) {
  function handleDelete(e: React.MouseEvent) {
    e.stopPropagation()
    onDelete()
  }

  return (
    <Card onClick={onClick} className="flex items-center gap-3 cursor-pointer hover:shadow-md transition-shadow">
      <div className="w-16 h-16 rounded-xl overflow-hidden bg-cloud-50 flex-shrink-0">
        {round.drawing_data ? (
          <img src={round.drawing_data} alt="drawing" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-2xl">🎨</div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-cloud-800">{isMine ? '我画的' : 'Ta画的'}</p>
        <p className="text-xs text-cloud-400">
          {round.guessed ? (round.guessed_correctly ? '✅ 猜对了' : '❌ 猜错了') : '⏳ 等待猜题'}
        </p>
        <p className="text-xs text-cloud-300 mt-1">{formatRelative(round.created_at)}</p>
      </div>
      {isMine && (
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="text-cloud-300 hover:text-red-400 transition-colors p-2 disabled:opacity-50"
          title="删除"
        >
          🗑️
        </button>
      )}
      <span className="text-cloud-300">›</span>
    </Card>
  )
}

function DrawRoundCreator({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const { user } = useAuth()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const activePointerIdRef = useRef<number | null>(null)
  const [color, setColor] = useState('#ec4899')
  const [brushSize, setBrushSize] = useState(4)
  const [word, setWord] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const colors = ['#ec4899', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#1f2937']

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
  }, [])

  function getPos(e: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY }
  }

  function startDraw(e: React.PointerEvent<HTMLCanvasElement>) {
    if (e.pointerType === 'mouse' && e.button !== 0) return
    e.preventDefault()
    setIsDrawing(true)
    activePointerIdRef.current = e.pointerId
    e.currentTarget.setPointerCapture(e.pointerId)
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return
    const { x, y } = getPos(e)
    ctx.beginPath()
    ctx.moveTo(x, y)
  }

  function draw(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!isDrawing || activePointerIdRef.current !== e.pointerId) return
    e.preventDefault()
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return
    const { x, y } = getPos(e)
    ctx.strokeStyle = color
    ctx.lineWidth = brushSize
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.lineTo(x, y)
    ctx.stroke()
  }

  function endDraw(e: React.PointerEvent<HTMLCanvasElement>) {
    if (activePointerIdRef.current !== e.pointerId) return
    setIsDrawing(false)
    activePointerIdRef.current = null
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId)
    }
  }

  function clearCanvas() {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!user || !word || !canvasRef.current) return
    setSubmitting(true)
    try {
      const dataUrl = canvasRef.current.toDataURL('image/jpeg', 0.6)
      const { error } = await supabase.from('draw_guess_rounds').insert({
        drawer_id: user.id,
        word,
        drawing_data: dataUrl,
        guessed: false,
        guessed_correctly: false,
        guess: null,
      })
      if (error) {
        console.error('Create round error:', error)
        alert(`提交失败: ${error.message}`)
        return
      }
      onCreated()
    } catch (err) {
      console.error('Create round exception:', err)
      alert(`提交失败: ${(err as Error).message}`)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-cloud-700 mb-2">画板</label>
        <div className="border border-cloud-200 rounded-xl overflow-hidden bg-white">
          <canvas
            ref={canvasRef}
            width={400}
            height={300}
            onPointerDown={startDraw}
            onPointerMove={draw}
            onPointerUp={endDraw}
            onPointerCancel={endDraw}
            onPointerLeave={endDraw}
            className="w-full touch-none"
            style={{ touchAction: 'none' }}
          />
        </div>
      </div>
      <div className="flex gap-2 items-center flex-wrap">
        {colors.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setColor(c)}
            style={{ backgroundColor: c }}
            className={`w-7 h-7 rounded-full transition-transform ${color === c ? 'scale-110 ring-2 ring-white shadow-md' : 'hover:scale-105'}`}
          />
        ))}
        <div className="flex items-center gap-2 ml-auto">
          <label className="text-xs text-cloud-500">粗细</label>
          <input type="range" min="2" max="20" value={brushSize} onChange={(e) => setBrushSize(Number(e.target.value))} className="w-20" />
          <button type="button" onClick={clearCanvas} className="text-xs text-cloud-400 hover:text-red-400 transition-colors ml-2">
            清除
          </button>
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-cloud-700 mb-1">你画的是什么？（只有你能看到）</label>
        <input
          value={word}
          onChange={(e) => setWord(e.target.value)}
          placeholder="例如：苹果、小猫..."
          required
          className="w-full px-4 py-2 rounded-xl border border-cloud-200 focus:border-sakura-400 focus:ring-2 focus:ring-sakura-200/50 outline-none"
        />
      </div>
      <div className="flex gap-2 justify-end">
        <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-cloud-500 hover:bg-cloud-100 rounded-xl transition-colors">取消</button>
        <button
          type="submit"
          disabled={submitting || !word}
          className="px-4 py-2 text-sm text-white bg-gradient-to-r from-sakura-400 to-sakura-500 hover:from-sakura-500 hover:to-sakura-600 disabled:bg-cloud-300 rounded-xl transition-all shadow-sm"
        >
          {submitting ? '提交中...' : '发起'}
        </button>
      </div>
    </form>
  )
}

function DrawRoundDetail({
  round,
  showAnswer,
  onToggleAnswer,
  isDrawer,
  drawerName,
  onGuessed,
  onDelete,
}: {
  round: DrawGuessRound
  showAnswer: boolean
  onToggleAnswer: () => void
  isDrawer: boolean
  drawerName: string
  onGuessed: (updated: DrawGuessRound) => void
  onDelete: () => void
}) {
  const { user } = useAuth()
  const [guess, setGuess] = useState(round.guess ?? '')
  const [submitting, setSubmitting] = useState(false)

  async function handleGuess() {
    if (!user || isDrawer || !guess.trim()) return
    setSubmitting(true)
    try {
      const isCorrect = guess.trim().toLowerCase() === round.word.toLowerCase()
      const { error } = await supabase
        .from('draw_guess_rounds')
        .update({ guess: guess.trim(), guessed: true, guessed_correctly: isCorrect })
        .eq('id', round.id)
      if (error) {
        console.error('Guess error:', error)
        alert(`提交答案失败: ${error.message}`)
        return
      }
      onGuessed({
        ...round,
        guess: guess.trim(),
        guessed: true,
        guessed_correctly: isCorrect,
      })
    } catch (err) {
      console.error('Guess exception:', err)
      alert(`提交答案失败: ${(err as Error).message}`)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="text-center">
        <p className="text-sm text-cloud-500 mb-2">{drawerName} 画的</p>
        <div className="rounded-xl overflow-hidden bg-white border border-cloud-200">
          <img src={round.drawing_data ?? undefined} alt="drawing" className="w-full" />
        </div>
      </div>

      {!isDrawer && !round.guessed ? (
        <div className="space-y-3">
          <input
            value={guess}
            onChange={(e) => setGuess(e.target.value)}
            placeholder="猜猜这是什么？"
            className="w-full px-4 py-2 rounded-xl border border-cloud-200 focus:border-sakura-400 focus:ring-2 focus:ring-sakura-200/50 outline-none"
          />
          <button
            onClick={handleGuess}
            disabled={submitting || !guess.trim()}
            className="w-full py-2 text-sm text-white bg-gradient-to-r from-sakura-400 to-sakura-500 hover:from-sakura-500 hover:to-sakura-600 disabled:bg-cloud-300 rounded-xl transition-all shadow-sm"
          >
            {submitting ? '提交中...' : '提交答案'}
          </button>
        </div>
      ) : (
        <div className="text-center space-y-3">
          {round.guessed && (
            <div className={`rounded-xl py-3 px-4 ${round.guessed_correctly ? 'bg-green-50' : 'bg-red-50'}`}>
              <p className={`text-base font-bold ${round.guessed_correctly ? 'text-green-600' : 'text-red-500'}`}>
                {round.guessed_correctly ? '🎉 猜对了！' : '😅 猜错了'}
              </p>
              {round.guess && (
                <p className="text-sm text-cloud-500 mt-1">
                  Ta的答案：<span className="font-medium">{round.guess}</span>
                </p>
              )}
            </div>
          )}
          {!showAnswer ? (
            <button onClick={onToggleAnswer} className="text-sm text-sakura-500 hover:text-sakura-600 transition-colors">
              👁️ 查看答案
            </button>
          ) : (
            <div className="bg-sakura-50 rounded-xl py-3 px-4">
              <p className="text-xs text-cloud-400">正确答案</p>
              <p className="text-lg font-bold text-sakura-600" style={{ fontFamily: "'Quicksand', sans-serif" }}>{round.word}</p>
            </div>
          )}
        </div>
      )}

      {isDrawer && (
        <div className="pt-2 border-t border-cloud-100">
          <button
            onClick={onDelete}
            className="w-full py-2 text-sm text-red-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors"
          >
            🗑️ 删除这一轮
          </button>
        </div>
      )}
    </div>
  )
}

// ==================== 真心话大冒险 ====================
function TruthDareGame({ partner }: { partner: Profile | null }) {
  const { user } = useAuth()
  const [rounds, setRounds] = useState<TruthDareRound[]>([])
  const [loading, setLoading] = useState(true)
  const [showChooser, setShowChooser] = useState(false)
  const [currentCard, setCurrentCard] = useState<{ type: 'truth' | 'dare'; content: string } | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [selectedRound, setSelectedRound] = useState<TruthDareRound | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  async function loadData() {
    setLoading(true)
    try {
      const { data } = await supabase
        .from('truth_dare_rounds')
        .select('*')
        .order('created_at', { ascending: false })
      if (data) setRounds(data as TruthDareRound[])
    } catch (err) {
      console.error('Failed to load truth dare rounds:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  function drawCard(type: 'truth' | 'dare') {
    const pool = type === 'truth' ? TRUTH_QUESTIONS : DARE_CHALLENGES
    const content = pool[Math.floor(Math.random() * pool.length)]
    setCurrentCard({ type, content })
  }

  async function confirmDone(type: 'truth' | 'dare', content: string) {
    if (!user || !currentCard || submitting) return
    if (!partner) {
      alert('未找到对方，无法创建真心话大冒险')
      return
    }
    setSubmitting(true)
    try {
      const { error } = await supabase.from('truth_dare_rounds').insert({
        type,
        content,
        created_by: user.id,
        challenger: user.id,
        target_user: partner.id,
        response: null,
        responded: false,
      })
      if (error) {
        console.error('Create truth dare error:', error)
        alert(`提交失败: ${error.message}`)
        return
      }
      setCurrentCard(null)
      setShowChooser(false)
      loadData()
    } catch (err) {
      console.error('Create truth dare exception:', err)
      alert(`提交失败: ${(err as Error).message}`)
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete(roundId: string) {
    if (!confirm('确定要删除这条记录吗？')) return
    setDeletingId(roundId)
    try {
      const { error } = await supabase
        .from('truth_dare_rounds')
        .delete()
        .eq('id', roundId)
      if (error) {
        alert(`删除失败: ${error.message}`)
        return
      }
      setRounds(prev => prev.filter(r => r.id !== roundId))
      if (selectedRound?.id === roundId) {
        setSelectedRound(null)
      }
    } catch (err) {
      console.error('Delete truth dare error:', err)
      alert(`删除失败: ${(err as Error).message}`)
    } finally {
      setDeletingId(null)
    }
  }

  if (loading) return <div className="text-center py-12 text-cloud-400">加载中...</div>

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-cloud-400">真心话还是大冒险？🎭</p>
        <button
          onClick={() => setShowChooser(true)}
          className="px-4 py-2 text-sm text-white bg-gradient-to-r from-sakura-400 to-sakura-500 hover:from-sakura-500 hover:to-sakura-600 rounded-xl transition-all shadow-sm"
        >
          抽一张
        </button>
      </div>

      {rounds.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-cloud-600 mb-2">最近记录</h3>
          <div className="space-y-2">
            {rounds.slice(0, 10).map((r) => (
              <Card
                key={r.id}
                onClick={() => setSelectedRound(r)}
                className="flex items-center gap-3 cursor-pointer hover:shadow-md transition-shadow"
              >
                <span className="text-2xl">{r.type === 'truth' ? '🤫' : '🎯'}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-xs text-cloud-400">{r.type === 'truth' ? '真心话' : '大冒险'}</p>
                    {r.responded ? (
                      <span className="text-xs text-green-500">✅ 已回答</span>
                    ) : (
                      <span className="text-xs text-cloud-300">⏳ 等待回答</span>
                    )}
                  </div>
                  <p className="text-sm text-cloud-700 line-clamp-2">{r.content}</p>
                </div>
                <span className="text-xs text-cloud-300 shrink-0">{formatRelative(r.created_at)}</span>
              </Card>
            ))}
          </div>
        </div>
      )}

      {rounds.length === 0 && <EmptyState icon="🎭" title="开始真心话大冒险" description="抽一张牌，看看命运如何" />}

      <Modal isOpen={showChooser} onClose={() => { setShowChooser(false); setCurrentCard(null) }} title="真心话大冒险">
        {!currentCard ? (
          <div className="space-y-3 py-4">
            <button
              onClick={() => drawCard('truth')}
              className="w-full py-4 text-lg bg-gradient-to-r from-sakura-100 to-sakura-200 hover:from-sakura-200 hover:to-sakura-300 rounded-2xl text-sakura-700 font-bold transition-all shadow-sm"
              style={{ fontFamily: "'Quicksand', sans-serif" }}
            >
              🤫 真心话
            </button>
            <button
              onClick={() => drawCard('dare')}
              className="w-full py-4 text-lg bg-gradient-to-r from-peach-100 to-peach-200 hover:from-peach-200 hover:to-peach-300 rounded-2xl text-peach-700 font-bold transition-all shadow-sm"
              style={{ fontFamily: "'Quicksand', sans-serif" }}
            >
              🎯 大冒险
            </button>
          </div>
        ) : (
          <div className="space-y-4 py-2">
            <div
              className={`p-6 rounded-2xl text-center ${currentCard.type === 'truth' ? 'bg-gradient-to-br from-sakura-100 to-sakura-200' : 'bg-gradient-to-br from-peach-100 to-peach-200'}`}
              style={{ animation: 'flip-in 0.5s ease-out' }}
            >
              <div className="text-4xl mb-3">{currentCard.type === 'truth' ? '🤫' : '🎯'}</div>
              <p className="text-xs text-cloud-500 mb-2">{currentCard.type === 'truth' ? '真心话' : '大冒险'}</p>
              <p className="text-lg font-bold text-cloud-800" style={{ fontFamily: "'Quicksand', sans-serif" }}>
                {currentCard.content}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentCard(null)}
                disabled={submitting}
                className="flex-1 py-2 text-sm text-cloud-500 bg-cloud-50 hover:bg-cloud-100 disabled:opacity-50 rounded-xl transition-colors"
              >
                再抽一张
              </button>
              <button
                onClick={() => confirmDone(currentCard.type, currentCard.content)}
                disabled={submitting}
                className="flex-1 py-2 text-sm text-white bg-gradient-to-r from-sakura-400 to-sakura-500 hover:from-sakura-500 hover:to-sakura-600 disabled:opacity-50 rounded-xl transition-all shadow-sm"
              >
                {submitting ? '提交中...' : '完成 ✅'}
              </button>
            </div>
          </div>
        )}
      </Modal>

      <Modal isOpen={!!selectedRound} onClose={() => setSelectedRound(null)} title="真心话大冒险详情">
        {selectedRound && (
          <TruthDareDetail
            key={selectedRound.id + '-' + selectedRound.responded}
            round={selectedRound}
            isChallenger={selectedRound.created_by === user?.id}
            onResponded={() => { loadData(); setSelectedRound(null) }}
            onDelete={() => handleDelete(selectedRound.id)}
            deleting={deletingId === selectedRound.id}
          />
        )}
      </Modal>
    </div>
  )
}

function TruthDareDetail({
  round,
  isChallenger,
  onResponded,
  onDelete,
  deleting,
}: {
  round: TruthDareRound
  isChallenger: boolean
  onResponded: () => void
  onDelete: () => void
  deleting: boolean
}) {
  const { user } = useAuth()
  const [response, setResponse] = useState(round.response ?? '')
  const [submitting, setSubmitting] = useState(false)

  async function handleRespond() {
    if (!user || isChallenger || !response.trim()) return
    setSubmitting(true)
    try {
      const { error } = await supabase
        .from('truth_dare_rounds')
        .update({ response: response.trim(), responded: true })
        .eq('id', round.id)
      if (error) {
        console.error('Respond error:', error)
        alert(`回答失败: ${error.message}`)
        return
      }
      onResponded()
    } catch (err) {
      console.error('Respond exception:', err)
      alert(`回答失败: ${(err as Error).message}`)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-4">
      <div
        className={`p-6 rounded-2xl text-center ${round.type === 'truth' ? 'bg-gradient-to-br from-sakura-100 to-sakura-200' : 'bg-gradient-to-br from-peach-100 to-peach-200'}`}
      >
        <div className="text-4xl mb-3">{round.type === 'truth' ? '🤫' : '🎯'}</div>
        <p className="text-xs text-cloud-500 mb-2">
          {round.type === 'truth' ? '真心话' : '大冒险'} · {isChallenger ? '我出的' : 'Ta出的'}
        </p>
        <p className="text-lg font-bold text-cloud-800" style={{ fontFamily: "'Quicksand', sans-serif" }}>
          {round.content}
        </p>
      </div>

      {!isChallenger && !round.responded ? (
        <div className="space-y-3">
          <label className="block text-sm font-medium text-cloud-700">
            {round.type === 'truth' ? '说说你的真心话' : '说说你完成了什么'}
          </label>
          <textarea
            value={response}
            onChange={(e) => setResponse(e.target.value)}
            placeholder={round.type === 'truth' ? '如实回答吧~' : '描述一下你的大冒险过程~'}
            rows={3}
            className="w-full px-4 py-2 rounded-xl border border-cloud-200 focus:border-sakura-400 focus:ring-2 focus:ring-sakura-200/50 outline-none resize-none"
          />
          <button
            onClick={handleRespond}
            disabled={submitting || !response.trim()}
            className="w-full py-2 text-sm text-white bg-gradient-to-r from-sakura-400 to-sakura-500 hover:from-sakura-500 hover:to-sakura-600 disabled:bg-cloud-300 rounded-xl transition-all shadow-sm"
          >
            {submitting ? '提交中...' : '提交回答'}
          </button>
        </div>
      ) : round.responded ? (
        <div className="bg-green-50 rounded-xl py-3 px-4">
          <p className="text-xs text-cloud-400 mb-1">回答</p>
          <p className="text-sm text-cloud-800">{round.response}</p>
        </div>
      ) : (
        <div className="text-center text-sm text-cloud-400 py-2">
          ⏳ 等待对方回答...
        </div>
      )}

      {isChallenger && (
        <div className="pt-2 border-t border-cloud-100">
          <button
            onClick={onDelete}
            disabled={deleting}
            className="w-full py-2 text-sm text-red-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors disabled:opacity-50"
          >
            {deleting ? '删除中...' : '🗑️ 删除这条记录'}
          </button>
        </div>
      )}
    </div>
  )
}
