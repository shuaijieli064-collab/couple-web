import { type ReactNode } from 'react'
import { cn } from '../../utils/cn'

interface CardProps {
  children: ReactNode
  className?: string
  onClick?: () => void
}

export function Card({ children, className, onClick }: CardProps) {
  return (
    <div
      className={cn(
        'bg-white rounded-2xl shadow-sm border border-sakura-100/50 p-5',
        onClick && 'cursor-pointer hover:shadow-md hover:shadow-sakura-100/40 hover:border-sakura-200 transition-all duration-200 hover:-translate-y-0.5',
        className
      )}
      onClick={onClick}
    >
      {children}
    </div>
  )
}
