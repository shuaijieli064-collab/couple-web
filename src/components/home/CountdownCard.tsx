import { countdownDays } from '../../utils/dateUtils'
import { Card } from '../common/Card'
import { type Anniversary } from '../../types/database'

interface CountdownCardProps {
  anniversary: Anniversary
}

export function CountdownCard({ anniversary }: CountdownCardProps) {
  const { label, isToday } = countdownDays(anniversary.date, anniversary.recurring)

  return (
    <Card className={isToday ? 'bg-gradient-to-r from-sakura-50 to-peach-50 border-sakura-200 shadow-sakura-100/30 animate-[sparkle_3s_ease-in-out_infinite]' : ''}>
      <div className="text-center">
        <p className="text-sm text-cloud-500 mb-1">{anniversary.title}</p>
        <p className={`text-3xl font-bold ${isToday ? 'text-sakura-600' : 'text-cloud-800'}`} style={{ fontFamily: "'Quicksand', sans-serif" }}>
          {isToday ? '🎉 ' : ''}{label}
        </p>
        <p className="text-xs text-cloud-400 mt-2">
          {new Date(anniversary.date).toLocaleDateString('zh-CN', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </p>
      </div>
    </Card>
  )
}
