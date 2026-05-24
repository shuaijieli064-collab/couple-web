import { type ReactNode } from 'react'

interface EmptyStateProps {
  icon?: string
  title: string
  description?: string
  action?: ReactNode
}

export function EmptyState({ icon = '📭', title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="text-5xl mb-4 animate-[float-gentle_3s_ease-in-out_infinite]">{icon}</div>
      <h3 className="text-lg font-medium text-cloud-700 mb-1">{title}</h3>
      {description && <p className="text-sm text-cloud-400 mb-4">{description}</p>}
      {action}
    </div>
  )
}
