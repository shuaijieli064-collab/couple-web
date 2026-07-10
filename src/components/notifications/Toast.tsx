import { useNotifications } from '../../contexts/NotificationContext'

const typeIcons: Record<string, string> = {
  diary_comment: '💬',
  checkin: '☀️',
  mood: '💭',
  wish_update: '🌟',
  love_letter: '💌',
  calendar_event: '📅',
  anniversary_reminder: '🎉',
}

export function ToastContainer() {
  const { toasts, dismissToast } = useNotifications()

  if (toasts.length === 0) return null

  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
      {toasts.map(toast => (
        <div
          key={toast.id}
          className="pointer-events-auto w-80 bg-white rounded-xl shadow-lg shadow-sakura-200/40 border border-sakura-100/50 p-3 flex items-start gap-3 animate-[slideInRight_0.3s_ease-out]"
        >
          <div className="text-xl flex-shrink-0">
            {typeIcons[toast.type] || '🔔'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-cloud-800 leading-snug">{toast.title}</p>
            {toast.message && (
              <p className="text-xs text-cloud-400 mt-0.5 truncate">{toast.message}</p>
            )}
          </div>
          <button
            onClick={() => dismissToast(toast.id)}
            className="text-cloud-300 hover:text-cloud-500 text-sm flex-shrink-0 p-1 transition-colors"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  )
}
