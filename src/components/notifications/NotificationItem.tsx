import { formatDistanceToNow } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { useNotifications } from '../../contexts/NotificationContext'
import type { Notification } from '../../types/database'

const typeIcons: Record<string, string> = {
  diary_comment: '💬',
  checkin: '☀️',
  mood: '💭',
  wish_update: '🌟',
  love_letter: '💌',
  calendar_event: '📅',
  anniversary_reminder: '🎉',
}

export function NotificationItem({ notification }: { notification: Notification }) {
  const { markAsRead, deleteNotification } = useNotifications()
  const isUnread = !notification.read_at

  const timeAgo = formatDistanceToNow(new Date(notification.created_at), {
    addSuffix: true,
    locale: zhCN,
  })

  return (
    <div
      className={`flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors ${
        isUnread
          ? 'bg-sakura-50/50'
          : 'hover:bg-cloud-50/50'
      }`}
      onClick={() => isUnread && markAsRead(notification.id)}
    >
      <div className="text-xl flex-shrink-0 mt-0.5">
        {typeIcons[notification.type] || '🔔'}
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm leading-snug ${isUnread ? 'font-semibold text-cloud-800' : 'text-cloud-600'}`}>
          {notification.title}
        </p>
        {notification.message && (
          <p className="text-xs text-cloud-400 mt-0.5 truncate">{notification.message}</p>
        )}
        <p className="text-[10px] text-cloud-300 mt-1">{timeAgo}</p>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        {isUnread && (
          <div className="w-2 h-2 rounded-full bg-sakura-500" />
        )}
        <button
          onClick={(e) => {
            e.stopPropagation()
            deleteNotification(notification.id)
          }}
          className="text-cloud-300 hover:text-red-500 hover:bg-red-50 text-xs p-1.5 rounded-lg transition-all"
          title="删除通知"
        >
          ✕
        </button>
      </div>
    </div>
  )
}
