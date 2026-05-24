import { formatDistanceToNow, format, differenceInDays, parseISO } from 'date-fns'
import { zhCN } from 'date-fns/locale'

export function formatDate(dateStr: string): string {
  return format(parseISO(dateStr), 'yyyy年M月d日', { locale: zhCN })
}

export function formatRelative(dateStr: string): string {
  return formatDistanceToNow(parseISO(dateStr), { addSuffix: true, locale: zhCN })
}

export function countdownDays(dateStr: string, recurring = false): { days: number; label: string; isToday: boolean } {
  const target = parseISO(dateStr)
  const now = new Date()

  let targetDate = new Date(now.getFullYear(), target.getMonth(), target.getDate())
  if (targetDate < now && recurring) {
    targetDate = new Date(now.getFullYear() + 1, target.getMonth(), target.getDate())
  }

  const days = differenceInDays(targetDate, now)
  const isToday = days === 0

  let label: string
  if (isToday) {
    label = '就是今天！'
  } else if (days > 0) {
    label = `还有 ${days} 天`
  } else {
    label = `${Math.abs(days)} 天前`
  }

  return { days, label, isToday }
}
