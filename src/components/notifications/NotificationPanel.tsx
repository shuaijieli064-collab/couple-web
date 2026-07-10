import { useNotifications } from '../../contexts/NotificationContext'
import { NotificationItem } from './NotificationItem'

interface Props {
  onClose: () => void
}

export function NotificationPanel({ onClose }: Props) {
  const { notifications, loading, markAllAsRead, unreadCount } = useNotifications()

  return (
    <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-xl shadow-sakura-200/30 border border-sakura-100/50 overflow-hidden z-50">
      <div className="flex items-center justify-between px-4 py-3 border-b border-sakura-100/50">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-bold text-cloud-800">通知</h3>
          {unreadCount > 0 && (
            <span className="text-[10px] font-bold bg-sakura-100 text-sakura-600 px-1.5 py-0.5 rounded-full">
              {unreadCount} 条未读
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="text-xs text-sakura-500 hover:text-sakura-600 font-medium transition-colors"
            >
              全部已读
            </button>
          )}
          <button
            onClick={onClose}
            className="text-cloud-400 hover:text-cloud-600 text-xs transition-colors"
          >
            关闭
          </button>
        </div>
      </div>

      <div className="max-h-96 overflow-y-auto">
        {loading ? (
          <div className="p-8 text-center text-cloud-400 text-sm">加载中...</div>
        ) : notifications.length === 0 ? (
          <div className="p-8 text-center">
            <div className="text-3xl mb-2">📭</div>
            <p className="text-sm text-cloud-400">暂无通知</p>
          </div>
        ) : (
          <div className="divide-y divide-sakura-50">
            {notifications.map(n => (
              <NotificationItem key={n.id} notification={n} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
