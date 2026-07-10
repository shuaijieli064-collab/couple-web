import { useState, useEffect, useRef } from 'react'
import { useNotifications } from '../../contexts/NotificationContext'
import { NotificationPanel } from './NotificationPanel'

export function NotificationBell() {
  const { unreadCount } = useNotifications()
  const [open, setOpen] = useState(false)
  const bellRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return

    function handleClickOutside(e: MouseEvent) {
      const target = e.target as HTMLElement
      if (!target.closest('[data-notification-panel]') && !target.closest('[data-notification-bell]')) {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  return (
    <div ref={bellRef} className="relative" data-notification-bell>
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2.5 rounded-2xl bg-white shadow-lg shadow-sakura-200/30 border border-sakura-100/50 text-cloud-400 hover:text-sakura-500 hover:bg-sakura-50 transition-all duration-200"
      >
        <span className="text-xl">🔔</span>
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center bg-sakura-500 text-white text-[10px] font-bold rounded-full px-1 animate-bounce">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>
      {open && (
        <NotificationPanel onClose={() => setOpen(false)} />
      )}
    </div>
  )
}
