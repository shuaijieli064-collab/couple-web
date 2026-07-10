import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { Card } from '../common/Card'
import { type DrawGuessRound, type TruthDareRound } from '../../types/database'
import { formatRelative } from '../../utils/dateUtils'

type GameMode = 'menu' | 'draw' | 'truth'

// ==================== 你画我猜词库 ====================
const DRAW_WORDS = [
  '猫咪', '小狗', '蛋糕', '彩虹', '气球', '花朵', '太阳', '月亮', '星星', '爱心',
  '冰淇淋', '咖啡', '披萨', '汉堡', '苹果', '香蕉', '西瓜', '草莓', '蝴蝶', '蜜蜂',
  '雨伞', '帽子', '眼镜', '鞋子', '礼物', '钢琴', '吉他', '相机', '手机', '电脑',
  '飞机', '火车', '汽车', '自行车', '轮船', '热气球', '城堡', '风车', '灯塔', '桥梁',
  '雪人', '南瓜', '圣诞树', '灯笼', '风筝', '足球', '篮球', '羽毛球', '闹钟', '蜡烛',
]

// ==================== 真心话大冒险题库 ====================
const TRUTH_QUESTIONS = [
  '你第一次见到对方时，心里在想什么？',
  '对方最吸引你的特质是什么？',
  '你做过最浪漫的事是什么？',
  '你最想和对方一起去的地方是哪里？',
  '你最喜欢对方的一个瞬间是什么？',
  '你有没有偷偷为对方准备过惊喜？',
  '你最害怕失去什么？',
  '你对未来最大的期待是什么？',
  '对方做过什么让你最感动的事？',
  '你最近一次想对方是什么时候？',
  '你觉得两人之间最珍贵的回忆是什么？',
  '如果你只能保留一个关于对方的记忆，你会选哪个？',
]

const DARE_TASKS = [
  '给对方发一张现在的自拍',
  '录一段10秒的语音说"我想你了"',
  '发一条朋友圈夸夸对方',
  '唱一首歌发给对方',
  '模仿一个可爱的表情包',
  '写下三件感谢对方的事',
  '用最甜的语气说一句情话',
  '做十个深蹲并拍照记录',
  '画一幅简笔画发给对方',
  '回忆你们第一次约会的细节',
]

export function DistanceGamesTab() {
  const [mode, setMode] = useState<GameMode>('menu')

  if (mode === 'menu') {
    return <GameMenu onSelect={setMode} />
  }
  if (mode === 'draw') {
    return <DrawGuessGame onExit={() => setMode('menu')} />
  }
  return <TruthDareGame onExit={() => setMode('menu')} />
}

// ==================== 游戏选择菜单 ====================
function GameMenu({ onSelect }: { onSelect: (mode: GameMode) => void }) {
  return (
    <div className="space-y-4">
      <Card onClick={() => onSelect('draw')} className="bg-gradient-to-br from-sakura-50 to-peach-50 border-sakura-200">
        <div className="flex items-center gap-4">
          <div className="text-4xl">🎨</div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-cloud-800">你画我猜</h3>
            <p className="text-sm text-cloud-500">画下你的心意，让Ta来猜</p>
          </div>
          <span className="text-cloud-300">›</span>
        </div>
      </Card>
      <Card onClick={() => onSelect('truth')} className="bg-gradient-to-br from-lilac-50 to-sakura-50 border-lilac-200">
        <div className="flex items-center gap-4">
          <div className="text-4xl">🎲</div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-cloud-800">真心话大冒险</h3>
            <p className="text-sm text-cloud-500">坦诚相见，或者来点小挑战</p>
          </div>
          <span className="text-cloud-300">›</span>
        </div>
      </Card>
    </div>
  )
}

// ==================== 你画我猜 ====================
type DrawPhase = 'idle' | 'drawing' | 'guessing' | 'result'

function DrawGuessGame({ onExit }: { onExit: () => void }) {
  const { user } = useAuth()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const isDrawingRef = useRef(false)
  const lastPosRef = useRef<{ x: number; y: number } | null>(null)

  const [phase, setPhase] = useState<DrawPhase>('idle')
  const [currentWord, setCurrentWord] = useState('')
  const [guess, setGuess] = useState('')
  const [result, setResult] = useState<{ correct: boolean; score: number } | null>(null)
  const [history, setHistory] = useState<DrawGuessRound[]>([])
  const [loading, setLoading] = useState(true)

  async function loadHistory() {
    if (!user) return
    try {
      const { data } = await supabase
        .from('draw_guess_rounds')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10)
      if (data) setHistory(data as DrawGuessRound[])
    } catch (err) {
      console.error('Failed to load draw history:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadHistory()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  // 画布初始化
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.strokeStyle = '#3f3f46'
    ctx.lineWidth = 3
  }, [phase])

  function getCanvasPos(e: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    }
  }

  function handlePointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    if (phase !== 'drawing') return
    e.currentTarget.setPointerCapture(e.pointerId)
    isDrawingRef.current = true
    lastPosRef.current = getCanvasPos(e)
  }

  function handlePointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!isDrawingRef.current || phase !== 'drawing') return
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    const pos = getCanvasPos(e)
    ctx.beginPath()
    ctx.moveTo(lastPosRef.current!.x, lastPosRef.current!.y)
    ctx.lineTo(pos.x, pos.y)
    ctx.stroke()
    lastPosRef.current = pos
  }

  function handlePointerUp() {
    isDrawingRef.current = false
    lastPosRef.current = null
  }

  function clearCanvas() {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
  }

  function startGame() {
    const word = DRAW_WORDS[Math.floor(Math.random() * DRAW_WORDS.length)]
    setCurrentWord(word)
    setPhase('drawing')
    setGuess('')
    setResult(null)
  }

  function finishDrawing() {
    setPhase('guessing')
  }

  // 简单的相似度判断
  function checkGuess() {
    const g = guess.trim()
    if (!g) return
    const correct = g === currentWord || currentWord.includes(g) || g.includes(currentWord)
    setResult({ correct, score: correct ? 100 : 0 })
    setPhase('result')
    // 保存到数据库
    saveRound(correct)
  }

  async function saveRound(correct: boolean) {
    if (!user) return
    try {
      await supabase.from('draw_guess_rounds').insert({
        word: currentWord,
        drawer_id: user.id,
        guesser_id: null,
        guess: guess || null,
        correct,
        status: 'completed',
        completed_at: new Date().toISOString(),
      })
      loadHistory()
    } catch (err) {
      console.error('Save draw round failed:', err)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={onExit} className="text-sm text-cloud-400 hover:text-cloud-600 transition-colors">
          ‹ 返回
        </button>
        <h2 className="text-lg font-semibold text-cloud-700">🎨 你画我猜</h2>
      </div>

      {phase === 'idle' && (
        <Card className="text-center">
          <div className="text-5xl mb-3">🎨</div>
          <h3 className="text-base font-semibold text-cloud-800 mb-2">来画一画吧</h3>
          <p className="text-sm text-cloud-500 mb-4">
            系统随机抽一个词，你来画，然后猜猜画的是什么
          </p>
          <button
            onClick={startGame}
            className="px-6 py-2.5 text-sm text-white bg-gradient-to-r from-sakura-400 to-sakura-500 hover:from-sakura-500 hover:to-sakura-600 rounded-xl transition-all shadow-sm"
          >
            开始画画
          </button>
        </Card>
      )}

      {phase === 'drawing' && (
        <Card>
          <div className="bg-sakura-50 rounded-xl p-3 mb-3 text-center">
            <p className="text-xs text-cloud-400">你要画的词是</p>
            <p className="text-2xl font-bold text-sakura-600" style={{ fontFamily: "'Quicksand', sans-serif" }}>
              {currentWord}
            </p>
          </div>
          <canvas
            ref={canvasRef}
            width={600}
            height={400}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
            className="w-full rounded-xl border-2 border-cloud-200 touch-none bg-white cursor-crosshair"
            style={{ aspectRatio: '3 / 2' }}
          />
          <div className="flex gap-2 mt-3">
            <button
              onClick={clearCanvas}
              className="flex-1 py-2 text-sm text-cloud-500 bg-cloud-100 hover:bg-cloud-200 rounded-xl transition-colors"
            >
              清空
            </button>
            <button
              onClick={finishDrawing}
              className="flex-1 py-2 text-sm text-white bg-gradient-to-r from-sakura-400 to-sakura-500 hover:from-sakura-500 hover:to-sakura-600 rounded-xl transition-all shadow-sm"
            >
              画完了
            </button>
          </div>
        </Card>
      )}

      {phase === 'guessing' && (
        <Card>
          <p className="text-sm text-cloud-500 text-center mb-3">看看这幅画，猜猜画的是什么？</p>
          <canvas
            ref={canvasRef}
            width={600}
            height={400}
            className="w-full rounded-xl border-2 border-cloud-200 bg-white mb-3"
            style={{ aspectRatio: '3 / 2' }}
          />
          <input
            value={guess}
            onChange={(e) => setGuess(e.target.value)}
            placeholder="输入你的猜测..."
            className="w-full px-4 py-2 rounded-xl border border-cloud-200 focus:border-sakura-400 focus:ring-2 focus:ring-sakura-200/50 outline-none mb-3 text-center"
            onKeyDown={(e) => { if (e.key === 'Enter') checkGuess() }}
            autoFocus
          />
          <button
            onClick={checkGuess}
            disabled={!guess.trim()}
            className="w-full py-2.5 text-sm text-white bg-gradient-to-r from-sakura-400 to-sakura-500 hover:from-sakura-500 hover:to-sakura-600 disabled:bg-cloud-300 rounded-xl transition-all shadow-sm"
          >
            确认猜测
          </button>
        </Card>
      )}

      {phase === 'result' && result && (
        <Card className="text-center">
          <div className="text-5xl mb-3">{result.correct ? '🎉' : '😅'}</div>
          <h3 className="text-lg font-semibold text-cloud-800 mb-1">
            {result.correct ? '猜对了！' : '差一点~'}
          </h3>
          <p className="text-sm text-cloud-500 mb-1">
            正确答案：<span className="font-medium text-sakura-600">{currentWord}</span>
          </p>
          <p className="text-sm text-cloud-500 mb-4">
            你的猜测：<span className="text-cloud-700">{guess}</span>
          </p>
          <button
            onClick={startGame}
            className="px-6 py-2.5 text-sm text-white bg-gradient-to-r from-sakura-400 to-sakura-500 hover:from-sakura-500 hover:to-sakura-600 rounded-xl transition-all shadow-sm"
          >
            再来一局
          </button>
        </Card>
      )}

      {/* 历史记录 */}
      {!loading && history.length > 0 && phase === 'idle' && (
        <div>
          <h3 className="text-sm font-semibold text-cloud-600 mb-2">最近的游戏记录</h3>
          <div className="space-y-2">
            {history.map((r) => (
              <div key={r.id} className="flex items-center justify-between bg-white rounded-xl p-3 border border-sakura-100/50">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-cloud-700">{r.word}</span>
                  {r.guess && <span className="text-xs text-cloud-400">→ {r.guess}</span>}
                </div>
                <span className={`text-xs ${r.correct ? 'text-sakura-500' : 'text-cloud-400'}`}>
                  {r.correct ? '✓ 猜对' : '✗ 没猜对'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ==================== 真心话大冒险 ====================
type TruthPhase = 'idle' | 'choosing' | 'playing'

function TruthDareGame({ onExit }: { onExit: () => void }) {
  const { user } = useAuth()
  const [phase, setPhase] = useState<TruthPhase>('idle')
  const [currentContent, setCurrentContent] = useState('')
  const [currentType, setCurrentType] = useState<'truth' | 'dare'>('truth')
  const [response, setResponse] = useState('')
  const [history, setHistory] = useState<TruthDareRound[]>([])
  const [loading, setLoading] = useState(true)

  async function loadHistory() {
    if (!user) return
    try {
      const { data } = await supabase
        .from('truth_dare_rounds')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10)
      if (data) setHistory(data as TruthDareRound[])
    } catch (err) {
      console.error('Failed to load truth dare history:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadHistory()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  function startRound() {
    // 随机选一道题
    const isTruth = Math.random() > 0.5
    const pool = isTruth ? TRUTH_QUESTIONS : DARE_TASKS
    const content = pool[Math.floor(Math.random() * pool.length)]
    setCurrentType(isTruth ? 'truth' : 'dare')
    setCurrentContent(content)
    setResponse('')
    setPhase('choosing')
  }

  function confirmPlay() {
    setPhase('playing')
  }

  async function saveRound(skipped: boolean) {
    if (!user) return
    try {
      await supabase.from('truth_dare_rounds').insert({
        type: currentType,
        content: currentContent,
        created_by: user.id,
        target_user: user.id,
        response: skipped ? null : response || null,
        status: skipped ? 'skipped' : 'answered',
        responded_at: new Date().toISOString(),
      })
      loadHistory()
    } catch (err) {
      console.error('Save truth dare round failed:', err)
    }
    setPhase('idle')
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={onExit} className="text-sm text-cloud-400 hover:text-cloud-600 transition-colors">
          ‹ 返回
        </button>
        <h2 className="text-lg font-semibold text-cloud-700">🎲 真心话大冒险</h2>
      </div>

      {phase === 'idle' && (
        <>
          <Card className="text-center">
            <div className="text-5xl mb-3">🎲</div>
            <h3 className="text-base font-semibold text-cloud-800 mb-2">来玩一局吧</h3>
            <p className="text-sm text-cloud-500 mb-4">
              随机抽取真心话或大冒险，坦诚面对彼此
            </p>
            <button
              onClick={startRound}
              className="px-6 py-2.5 text-sm text-white bg-gradient-to-r from-lilac-400 to-sakura-400 hover:from-lilac-500 hover:to-sakura-500 rounded-xl transition-all shadow-sm"
            >
              开始抽题
            </button>
          </Card>

          {!loading && history.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-cloud-600 mb-2">最近的游戏记录</h3>
              <div className="space-y-2">
                {history.map((r) => (
                  <div key={r.id} className="bg-white rounded-xl p-3 border border-sakura-100/50">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        r.type === 'truth' ? 'bg-lilac-100 text-lilac-700' : 'bg-peach-100 text-peach-700'
                      }`}>
                        {r.type === 'truth' ? '真心话' : '大冒险'}
                      </span>
                      <span className="text-xs text-cloud-400">{formatRelative(r.created_at)}</span>
                      {r.status === 'skipped' && <span className="text-xs text-cloud-300 ml-auto">已跳过</span>}
                    </div>
                    <p className="text-sm text-cloud-700">{r.content}</p>
                    {r.response && <p className="text-xs text-cloud-500 mt-1">→ {r.response}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {phase === 'choosing' && (
        <Card className="text-center">
          <div className={`inline-block px-4 py-1 rounded-full text-sm font-medium mb-4 ${
            currentType === 'truth' ? 'bg-lilac-100 text-lilac-700' : 'bg-peach-100 text-peach-700'
          }`}>
            {currentType === 'truth' ? '💬 真心话' : '🎯 大冒险'}
          </div>
          <p className="text-lg font-medium text-cloud-800 mb-6">{currentContent}</p>
          <div className="flex gap-2">
            <button
              onClick={() => { setPhase('idle') }}
              className="flex-1 py-2.5 text-sm text-cloud-500 bg-cloud-100 hover:bg-cloud-200 rounded-xl transition-colors"
            >
              换一题
            </button>
            <button
              onClick={confirmPlay}
              className="flex-1 py-2.5 text-sm text-white bg-gradient-to-r from-sakura-400 to-sakura-500 hover:from-sakura-500 hover:to-sakura-600 rounded-xl transition-all shadow-sm"
            >
              接受挑战
            </button>
          </div>
        </Card>
      )}

      {phase === 'playing' && (
        <Card>
          <div className={`inline-block px-3 py-1 rounded-full text-xs font-medium mb-3 ${
            currentType === 'truth' ? 'bg-lilac-100 text-lilac-700' : 'bg-peach-100 text-peach-700'
          }`}>
            {currentType === 'truth' ? '💬 真心话' : '🎯 大冒险'}
          </div>
          <p className="text-base font-medium text-cloud-800 mb-4">{currentContent}</p>
          <textarea
            value={response}
            onChange={(e) => setResponse(e.target.value)}
            placeholder={currentType === 'truth' ? '写下你的真心话...' : '记录你的挑战过程...'}
            rows={4}
            className="w-full px-4 py-2 rounded-xl border border-cloud-200 focus:border-sakura-400 focus:ring-2 focus:ring-sakura-200/50 outline-none resize-none mb-3"
            autoFocus
          />
          <div className="flex gap-2">
            <button
              onClick={() => saveRound(true)}
              className="flex-1 py-2.5 text-sm text-cloud-500 bg-cloud-100 hover:bg-cloud-200 rounded-xl transition-colors"
            >
              跳过
            </button>
            <button
              onClick={() => saveRound(false)}
              className="flex-1 py-2.5 text-sm text-white bg-gradient-to-r from-sakura-400 to-sakura-500 hover:from-sakura-500 hover:to-sakura-600 rounded-xl transition-all shadow-sm"
            >
              完成记录
            </button>
          </div>
        </Card>
      )}
    </div>
  )
}
