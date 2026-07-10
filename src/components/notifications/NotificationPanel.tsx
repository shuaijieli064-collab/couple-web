import { useNotifications } from '../../contexts/NotificationContext'
import { NotificationItem } from './NotificationItem'

interface Props {
  onClose: () => void
  placement?: 'desktop' | 'mobile'
}

export function NotificationPanel({ onClose, placement = 'desktop' }: Props) {
  const { notifications, loading, markAllAsRead, unreadCount } = useNotifications()

  const isMobile = placement === 'mobile'

  return (
    <div
      data-notification-panel
      className={`fixed w-80 sm:w-96 bg-white rounded-2xl shadow-xl shadow-sakura-200/30 border border-sakura-100/50 overflow-hidden z-50 ${
        isMobile ? '' : 'animate-[slideInRight_0.2s_ease-out]'
      }`}
      style={{
        top: isMobile
          ? 'calc(64px + env(safe-area-inset-top, 0))'
          : 'calc(12px + env(safe-area-inset-top, 0))',
        right: isMobile ? '1rem' : 'auto',
        left: isMobile ? 'auto' : 'calc(16rem + 12px)',
      }}
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-sakura-100/50 bg-gradient-to-r from-sakura-50/50 to-transparent">
        <div className="flex items-center gap-2">
          <span className="text-lg">🔔</span>
          <h3 className="text-sm font-bold text-cloud-800">通知</h3>
          {unreadCount > 0 && (
            <span className="text-[10px] font-bold bg-sakura-500 text-white px-1.5 py-0.5 rounded-full">
              {unreadCount} 未读
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="text-xs text-sakura-600 hover:text-sakura-700 font-medium transition-colors"
            >
              全部已读
            </button>
          )}
          <button
            onClick={onClose}
            className="text-cloud-400 hover:text-cloud-600 text-sm transition-colors p-1 rounded hover:bg-cloud-50"
          >
            ✕
          </button>
        </div>
      </div>

      <div className="max-h-[60vh] overflow-y-auto">
        {loading ? (
          <div className="p-8 text-center text-cloud-400 text-sm">加载中...</div>
        ) : notifications.length === 0 ? (
          <div className="p-8 text-center">
            <div className="text-4xl mb-3">📭</div>
            <p className="text-sm text-cloud-400">暂无通知</p>
          </div>
        ) : (
          <div className="divide-y divide-sakura-50/80">
            {notifications.map(n => (
              <NotificationItem key={n.id} notification={n} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
