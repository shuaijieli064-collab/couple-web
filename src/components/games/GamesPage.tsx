import { useState, useEffect, useRef, type FormEvent } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { Card } from '../common/Card'
import { EmptyState } from '../common/EmptyState'
import { Modal } from '../common/Modal'
import {
  type DrawGuessRound,
  type TruthDareRound,
  type Profile,
} from '../../types/database'
import { formatRelative } from '../../utils/dateUtils'

type GameTab = 'tap' | 'draw' | 'truth'

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

export function GamesPage() {
  const [activeTab, setActiveTab] = useState<GameTab>('tap')
  const [tapCount, setTapCount] = useState(0)
  const [floatingEmojis, setFloatingEmojis] = useState<{ id: number; x: number; y: number; emoji: string }[]>([])
  const emojiIdRef = useRef(0)

  function handleTap(e: React.MouseEvent<HTMLButtonElement>) {
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

  return (
    <div className="space-y-6">
      <h1 className="text-xl md:text-2xl font-bold text-cloud-800" style={{ fontFamily: "'Quicksand', sans-serif" }}>
        游戏 🎮
      </h1>

      <div className="flex bg-sakura-100/60 rounded-xl p-1">
        <button
          onClick={() => setActiveTab('tap')}
          className={`flex-1 px-4 py-2 text-sm rounded-lg transition-colors ${
            activeTab === 'tap' ? 'bg-white text-cloud-800 shadow-sm font-medium' : 'text-cloud-400'
          }`}
        >
          戳戳
        </button>
        <button
          onClick={() => setActiveTab('draw')}
          className={`flex-1 px-4 py-2 text-sm rounded-lg transition-colors ${
            activeTab === 'draw' ? 'bg-white text-cloud-800 shadow-sm font-medium' : 'text-cloud-400'
          }`}
        >
          你画我猜
        </button>
        <button
          onClick={() => setActiveTab('truth')}
          className={`flex-1 px-4 py-2 text-sm rounded-lg transition-colors ${
            activeTab === 'truth' ? 'bg-white text-cloud-800 shadow-sm font-medium' : 'text-cloud-400'
          }`}
        >
          真心话大冒险
        </button>
      </div>

      {activeTab === 'tap' && (
        <div>
          <TapGame
            tapCount={tapCount}
            setTapCount={setTapCount}
            floatingEmojis={floatingEmojis}
            onTap={handleTap}
          />
        </div>
      )}

      {activeTab === 'draw' && <DrawGuessGame />}

      {activeTab === 'truth' && <TruthDareGame />}
    </div>
  )
}

function TapGame({
  tapCount,
  setTapCount,
  floatingEmojis,
  onTap,
}: {
  tapCount: number
  setTapCount: (n: number) => void
  floatingEmojis: { id: number; x: number; y: number; emoji: string }[]
  onTap: (e: React.MouseEvent<HTMLButtonElement>) => void
}) {
  const [scale, setScale] = useState(1)
  const { user } = useAuth()
  const [partner, setPartner] = useState<Profile | null>(null)
  const [tapGoal, setTapGoal] = useState(52)

  useEffect(() => {
    async function loadPartner() {
      if (!user) return
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .neq('id', user.id)
        .limit(1)
      if (data && data[0]) setPartner(data[0] as Profile)
    }
    loadPartner()
  }, [user])

  const progress = Math.min((tapCount / tapGoal) * 100, 100)

  function handlePress() {
    setScale(0.95)
  }

  function handleRelease() {
    setScale(1)
  }

  return (
    <div className="text-center space-y-6">
      <p className="text-cloud-400 text-sm">戳一下Ta的脸 🫵</p>

      <div className="relative mx-auto w-64 h-64">
        <button
          onClick={onTap}
          onMouseDown={handlePress}
          onMouseUp={handleRelease}
          onMouseLeave={handleRelease}
          onTouchStart={handlePress}
          onTouchEnd={handleRelease}
          style={{ transform: `scale(${scale})` }}
          className="relative w-full h-full rounded-full overflow-hidden shadow-lg transition-transform duration-100 cursor-pointer ring-4 ring-sakura-200 ring-offset-4 ring-offset-peach-50"
        >
          {partner?.avatar_url ? (
            <img
              src={partner.avatar_url}
              alt={partner.display_name ?? 'Ta'}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-sakura-200 to-sakura-300 flex items-center justify-center text-6xl">
              😊
            </div>
          )}
          {floatingEmojis.map((em) => (
            <span
              key={em.id}
              style={{ left: em.x, top: em.y, animation: 'float-up 1.2s ease-out forwards' }}
              className="absolute -translate-x-1/2 -translate-y-1/2 text-3xl pointer-events-none"
            >
              {em.emoji}
            </span>
          ))}
        </button>
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
          {tapCount >= tapGoal
            ? '🎉 达成目标！你们好甜～'
            : `再戳 ${tapGoal - tapCount} 下就满啦`}
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
            round={selectedRound}
            showAnswer={showAnswer}
            onToggleAnswer={() => setShowAnswer(!showAnswer)}
            isDrawer={selectedRound.drawer_id === user?.id}
            drawerName={selectedRound.drawer_id === user?.id ? (profile?.display_name ?? '我') : 'Ta'}
            onGuessed={loadData}
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
}: {
  round: DrawGuessRound
  onClick: () => void
  isMine: boolean
}) {
  return (
    <Card onClick={onClick} className="flex items-center gap-3 cursor-pointer hover:shadow-md transition-shadow">
      <div className="w-16 h-16 rounded-xl overflow-hidden bg-cloud-50 flex-shrink-0">
        {round.drawing_data ? (
          <img
            src={round.drawing_data}
            alt="drawing"
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-2xl">🎨</div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-cloud-800">
          {isMine ? '我画的' : 'Ta画的'}
        </p>
        <p className="text-xs text-cloud-400">
          {round.guessed ? (round.guessed_correctly ? '✅ 猜对了' : '❌ 猜错了') : '⏳ 等待猜题'}
        </p>
        <p className="text-xs text-cloud-300 mt-1">{formatRelative(round.created_at)}</p>
      </div>
      <span className="text-cloud-300">›</span>
    </Card>
  )
}

function DrawRoundCreator({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const { user } = useAuth()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
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

  function getPos(e: React.MouseEvent | React.TouchEvent) {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    let clientX: number, clientY: number
    if ('touches' in e) {
      clientX = e.touches[0].clientX
      clientY = e.touches[0].clientY
    } else {
      clientX = e.clientX
      clientY = e.clientY
    }
    return { x: (clientX - rect.left) * scaleX, y: (clientY - rect.top) * scaleY }
  }

  function startDraw(e: React.MouseEvent | React.TouchEvent) {
    setIsDrawing(true)
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return
    const { x, y } = getPos(e)
    ctx.beginPath()
    ctx.moveTo(x, y)
  }

  function draw(e: React.MouseEvent | React.TouchEvent) {
    if (!isDrawing) return
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

  function endDraw() {
    setIsDrawing(false)
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
    const dataUrl = canvasRef.current.toDataURL('image/png')
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
      setSubmitting(false)
      return
    }
    onCreated()
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
            onMouseDown={startDraw}
            onMouseMove={draw}
            onMouseUp={endDraw}
            onMouseLeave={endDraw}
            onTouchStart={startDraw}
            onTouchMove={draw}
            onTouchEnd={endDraw}
            className="w-full touch-none"
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
          <input
            type="range"
            min="2"
            max="20"
            value={brushSize}
            onChange={(e) => setBrushSize(Number(e.target.value))}
            className="w-20"
          />
          <button
            type="button"
            onClick={clearCanvas}
            className="text-xs text-cloud-400 hover:text-red-400 transition-colors ml-2"
          >
            清除
          </button>
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-cloud-700 mb-1">
          你画的是什么？（只有你能看到）
        </label>
        <input
          value={word}
          onChange={(e) => setWord(e.target.value)}
          placeholder="例如：苹果、小猫..."
          required
          className="w-full px-4 py-2 rounded-xl border border-cloud-200 focus:border-sakura-400 focus:ring-2 focus:ring-sakura-200/50 outline-none"
        />
      </div>
      <div className="flex gap-2 justify-end">
        <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-cloud-500 hover:bg-cloud-100 rounded-xl transition-colors">
          取消
        </button>
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
}: {
  round: DrawGuessRound
  showAnswer: boolean
  onToggleAnswer: () => void
  isDrawer: boolean
  drawerName: string
  onGuessed: () => void
}) {
  const { user } = useAuth()
  const [guess, setGuess] = useState(round.guess ?? '')
  const [submitting, setSubmitting] = useState(false)

  async function handleGuess() {
    if (!user || isDrawer) return
    setSubmitting(true)
    const isCorrect = guess.trim().toLowerCase() === round.word.toLowerCase()
    const { error } = await supabase
      .from('draw_guess_rounds')
      .update({
        guess: guess.trim(),
        guessed: true,
        guessed_correctly: isCorrect,
      })
      .eq('id', round.id)
    if (error) {
      console.error('Guess error:', error)
      setSubmitting(false)
      return
    }
    setSubmitting(false)
    onGuessed()
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
            <p className={`text-sm font-medium ${round.guessed_correctly ? 'text-green-500' : 'text-red-400'}`}>
              {round.guessed_correctly ? '🎉 猜对了！' : '😅 猜错了'}
            </p>
          )}
          {!showAnswer ? (
            <button
              onClick={onToggleAnswer}
              className="text-sm text-sakura-500 hover:text-sakura-600 transition-colors"
            >
              👁️ 查看答案
            </button>
          ) : (
            <div className="bg-sakura-50 rounded-xl py-3 px-4">
              <p className="text-xs text-cloud-400">答案</p>
              <p className="text-lg font-bold text-sakura-600" style={{ fontFamily: "'Quicksand', sans-serif" }}>
                {round.word}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ==================== 真心话大冒险 ====================

function TruthDareGame() {
  const { user } = useAuth()
  const [rounds, setRounds] = useState<TruthDareRound[]>([])
  const [loading, setLoading] = useState(true)
  const [showChooser, setShowChooser] = useState(false)
  const [currentCard, setCurrentCard] = useState<{ type: 'truth' | 'dare'; content: string } | null>(null)

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
    if (!user || !currentCard) return
    const { error } = await supabase.from('truth_dare_rounds').insert({
      type,
      content,
      challenger: user.id,
    })
    if (error) {
      console.error('Create truth dare error:', error)
      return
    }
    setCurrentCard(null)
    setShowChooser(false)
    loadData()
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
              <Card key={r.id} className="flex items-center gap-3">
                <span className="text-2xl">{r.type === 'truth' ? '🤫' : '🎯'}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-cloud-400 mb-0.5">
                    {r.type === 'truth' ? '真心话' : '大冒险'}
                  </p>
                  <p className="text-sm text-cloud-700">{r.content}</p>
                </div>
                <span className="text-xs text-cloud-300 shrink-0">{formatRelative(r.created_at)}</span>
              </Card>
            ))}
          </div>
        </div>
      )}

      {rounds.length === 0 && (
        <EmptyState icon="🎭" title="开始真心话大冒险" description="抽一张牌，看看命运如何" />
      )}

      <Modal isOpen={showChooser} onClose={() => { setShowChooser(false); setCurrentCard(null) }} title="真心话大冒险">
        {!currentCard ? (
          <div className="space-y-3 py-4">
            <button
              onClick={() => drawCard('truth')}
              className="w-full py-4 text-lg bg-gradient-to-r from-sakura-100 to-sakura-200 hover:from-sakura-200 hover:to-sakura-300 rounded-2xl text-sakura-700 font-bold transition-all shadow-sm hover:shadow-md"
              style={{ fontFamily: "'Quicksand', sans-serif" }}
            >
              🤫 真心话
            </button>
            <button
              onClick={() => drawCard('dare')}
              className="w-full py-4 text-lg bg-gradient-to-r from-peach-100 to-peach-200 hover:from-peach-200 hover:to-peach-300 rounded-2xl text-peach-700 font-bold transition-all shadow-sm hover:shadow-md"
              style={{ fontFamily: "'Quicksand', sans-serif" }}
            >
              🎯 大冒险
            </button>
          </div>
        ) : (
          <div className="space-y-4 py-2">
            <div
              className={`p-6 rounded-2xl text-center ${
                currentCard.type === 'truth'
                  ? 'bg-gradient-to-br from-sakura-100 to-sakura-200'
                  : 'bg-gradient-to-br from-peach-100 to-peach-200'
              }`}
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
                onClick={() => { setCurrentCard(null) }}
                className="flex-1 py-2 text-sm text-cloud-500 bg-cloud-50 hover:bg-cloud-100 rounded-xl transition-colors"
              >
                再抽一张
              </button>
              <button
                onClick={() => confirmDone(currentCard.type, currentCard.content)}
                className="flex-1 py-2 text-sm text-white bg-gradient-to-r from-sakura-400 to-sakura-500 hover:from-sakura-500 hover:to-sakura-600 rounded-xl transition-all shadow-sm"
              >
                完成 ✅
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
