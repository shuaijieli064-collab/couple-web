import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import { Card } from '../common/Card'
import { EmptyState } from '../common/EmptyState'
import { Avatar } from '../common/Avatar'
import { type DailyTask, type TaskCompletion, type QuizQuestion, type QuizSession, type QuizAnswer, type Profile } from '../../types/database'

type GameTab = 'tasks' | 'quiz'

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

// ==================== 答案相似度算法 ====================
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

// ==================== 按日期种子选取今日任务 ====================
function getTodayTask(tasks: DailyTask[]): DailyTask | null {
  if (tasks.length === 0) return null
  const today = new Date().toDateString()
  let seed = 0
  for (let i = 0; i < today.length; i++) {
    seed = (seed * 31 + today.charCodeAt(i)) % tasks.length
  }
  return tasks[seed]
}

// ==================== 计算连续打卡天数 ====================
function calculateStreak(completions: TaskCompletion[]): number {
  if (completions.length === 0) return 0
  const dates = [...new Set(completions.map((c) => c.completed_date))].sort().reverse()

  const today = new Date().toISOString().split('T')[0]
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]

  const hasToday = dates.includes(today)
  const hasYesterday = dates.includes(yesterday)

  if (!hasToday && !hasYesterday) return 0

  let streak = 0
  const checkDate = hasToday ? new Date() : new Date(Date.now() - 86400000)
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

  // 通用数据
  const [partner, setPartner] = useState<Profile | null>(null)
  const [loadingPartner, setLoadingPartner] = useState(true)

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1
          className="text-xl md:text-2xl font-bold text-cloud-800"
          style={{ fontFamily: "'Quicksand', sans-serif" }}
        >
          互动游戏 🎮
        </h1>
      </div>

      {/* Tab 切换 */}
      <div className="flex bg-sakura-100/60 rounded-xl p-1">
        <button
          onClick={() => setActiveTab('tasks')}
          className={`flex-1 px-4 py-2 text-sm rounded-lg transition-colors ${
            activeTab === 'tasks'
              ? 'bg-white text-cloud-800 shadow-sm font-medium'
              : 'text-cloud-400'
          }`}
        >
          每日任务
        </button>
        <button
          onClick={() => setActiveTab('quiz')}
          className={`flex-1 px-4 py-2 text-sm rounded-lg transition-colors ${
            activeTab === 'quiz'
              ? 'bg-white text-cloud-800 shadow-sm font-medium'
              : 'text-cloud-400'
          }`}
        >
          默契问答
        </button>
      </div>

      {activeTab === 'tasks' ? (
        <DailyTaskSection user={user} profile={profile} partner={partner} loadingPartner={loadingPartner} />
      ) : (
        <QuizSection user={user} profile={profile} partner={partner} loadingPartner={loadingPartner} />
      )}
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
    // eslint-disable-next-line react-hooks/set-state-in-effect
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
      {/* 连续打卡 */}
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

      {/* 今日任务 */}
      {todayTask ? (
        <Card className={myCompletedToday && partnerCompletedToday ? 'bg-gradient-to-r from-sakura-50 to-peach-50 border-sakura-200' : ''}>
          <div className="flex items-center gap-2 mb-3">
            <span className={`text-xs px-2 py-1 rounded-full font-medium ${CATEGORY_COLORS[todayTask.category] || CATEGORY_COLORS.sweet}`}>
              {CATEGORY_LABELS[todayTask.category] || '甜蜜'}
            </span>
            <span className="text-xs text-cloud-400">今日任务</span>
          </div>

          <p className="text-lg font-medium text-cloud-800 mb-4">{todayTask.content}</p>

          {/* 双方完成状态 */}
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

          {/* 打卡按钮 */}
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
              className="w-full py-2.5 text-sm text-white bg-gradient-to-r from-sakura-400 to-sakura-500 hover:from-sakura-500 hover:to-sakura-600 rounded-xl transition-all shadow-sm hover:shadow-md hover:shadow-sakura-200/40"
            >
              完成打卡 ✓
            </button>
          )}

          {myCompletedToday && partnerCompletedToday && (
            <div className="mt-3 text-center text-sm text-sakura-600 animate-[sparkle_3s_ease-in-out_infinite]">
              🎉 双方都完成了！今天也是甜蜜的一天 ~
            </div>
          )}
        </Card>
      ) : (
        <EmptyState icon="📋" title="还没有任务" description="任务模板库为空" />
      )}

      {/* 历史记录 */}
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

  // 答题状态
  const [currentAnswers, setCurrentAnswers] = useState<Record<string, string>>({})
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [submitting, setSubmitting] = useState(false)

  async function loadData() {
    if (!user) return
    setLoading(true)
    try {
      const { data: qData } = await supabase.from('quiz_questions').select('*')
      if (qData) setQuestions(qData as QuizQuestion[])

      // 查找自己参与的未完成或刚完成的session
      const { data: sData } = await supabase
        .from('quiz_sessions')
        .select('*')
        .or(`player1_id.eq.${user.id},player2_id.eq.${user.id}`)
        .order('created_at', { ascending: false })
        .limit(1)

      if (sData && sData.length > 0) {
        const session = sData[0] as QuizSession
        // 只关注最近24小时内的session
        const sessionTime = new Date(session.created_at).getTime()
        if (Date.now() - sessionTime < 24 * 60 * 60 * 1000) {
          setActiveSession(session)
          // 加载答案
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
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  async function startNewSession() {
    if (!user || !partner || questions.length < 5) return
    setSubmitting(true)

    // 随机选5题
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
      // 全部答完
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
        // 重新加载答案
        const { data: aData } = await supabase
          .from('quiz_answers')
          .select('*')
          .eq('session_id', activeSession.id)
        if (aData) setSessionAnswers(aData as QuizAnswer[])
      }
      setSubmitting(false)
    }
  }

  async function joinSession() {
    if (!user || !activeSession) return
    setSubmitting(true)
    const { data: updated } = await supabase
      .from('quiz_sessions')
      .update({ player2_id: user.id, status: 'active' })
      .eq('id', activeSession.id)
      .select()
      .single()
    if (updated) {
      setActiveSession(updated as QuizSession)
      setCurrentAnswers({})
      setCurrentQuestionIndex(0)
    }
    setSubmitting(false)
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

  // ==================== 计算结果 ====================
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

  // ==================== 渲染 ====================
  if (loading || loadingPartner) {
    return <div className="text-center py-12 text-cloud-400">加载中...</div>
  }

  // 没有活跃session -> 显示开始界面
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
              className="px-6 py-2.5 text-sm text-white bg-gradient-to-r from-sakura-400 to-sakura-500 hover:from-sakura-500 hover:to-sakura-600 disabled:bg-cloud-300 rounded-xl transition-all shadow-sm hover:shadow-md hover:shadow-sakura-200/40"
            >
              {submitting ? '准备中...' : questions.length < 5 ? '题目不足' : '开始挑战'}
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

  // Session存在但player2_id还没设置（异常情况）或需要加入
  if (!myDone && activeSession.status === 'waiting' && !isPlayer1 && activeSession.player2_id !== user.id) {
    return (
      <Card className="text-center">
        <div className="text-4xl mb-3">🎯</div>
        <h2 className="text-lg font-semibold text-cloud-800 mb-2">新的挑战！</h2>
        <p className="text-sm text-cloud-500 mb-4">
          {partner?.display_name ?? '对方'} 发起了一场默契挑战，快来参与吧！
        </p>
        <button
          onClick={joinSession}
          disabled={submitting}
          className="px-6 py-2.5 text-sm text-white bg-gradient-to-r from-sakura-400 to-sakura-500 hover:from-sakura-500 hover:to-sakura-600 rounded-xl transition-all shadow-sm"
        >
          {submitting ? '加入中...' : '参与挑战'}
        </button>
      </Card>
    )
  }

  // 结果显示
  if (resultData) {
    const comment = getCommentByScore(resultData.totalScore)
    return (
      <div className="space-y-6">
        <Card className="text-center bg-gradient-to-r from-sakura-50 to-peach-50 border-sakura-200">
          <div className="text-5xl mb-2">{comment.emoji}</div>
          <div
            className="text-5xl font-bold text-sakura-600 mb-1"
            style={{ fontFamily: "'Quicksand', sans-serif" }}
          >
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

  // 我已答完，等待对方
  if (myDone && !otherDone) {
    return (
      <Card className="text-center">
        <div className="text-4xl mb-3 animate-[float-gentle_3s_ease-in-out_infinite]">⏳</div>
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

  // 双方都答完了，但status还没更新为completed（轮询刷新）
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

  // 答题界面
  const currentQId = activeSession.question_ids[currentQuestionIndex]
  const currentQuestion = questions.find((q) => q.id === currentQId)

  if (!currentQuestion) {
    return <div className="text-center py-12 text-cloud-400">题目加载失败</div>
  }

  return (
    <div className="space-y-6">
      {/* 进度条 */}
      <div className="flex items-center gap-2">
        <div className="flex-1 h-2 bg-cloud-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-sakura-400 to-sakura-500 rounded-full transition-all"
            style={{ width: `${((currentQuestionIndex) / activeSession.question_ids.length) * 100}%` }}
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
