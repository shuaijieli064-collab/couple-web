import { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './AuthContext'
import type { Notification } from '../types/database'

interface NotificationContextValue {
  notifications: Notification[]
  unreadCount: number
  loading: boolean
  markAsRead: (id: string) => Promise<void>
  markAllAsRead: () => Promise<void>
  deleteNotification: (id: string) => Promise<void>
  toasts: Notification[]
  dismissToast: (id: string) => void
}

const NotificationContext = createContext<NotificationContextValue | null>(null)

// eslint-disable-next-line react-refresh/only-export-components
export function useNotifications() {
  const ctx = useContext(NotificationContext)
  if (!ctx) throw new Error('useNotifications must be used within NotificationProvider')
  return ctx
}

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [toasts, setToasts] = useState<Notification[]>([])
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)

  const unreadCount = notifications.filter(n => !n.read_at).length

  useEffect(() => {
    if (!user) {
      setLoading(false)
      return
    }

    let cancelled = false

    const loadNotifications = async () => {
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50)

      if (!cancelled && data) setNotifications(data as Notification[])
      if (!cancelled) setLoading(false)
    }

    loadNotifications()

    if (channelRef.current) {
      channelRef.current.unsubscribe()
    }

    const channel = supabase
      .channel(`notifications-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          if (cancelled) return
          const n = payload.new as Notification
          setNotifications(prev => [n, ...prev])
          setToasts(prev => {
            if (prev.some(t => t.id === n.id)) return prev
            const next = [n, ...prev].slice(0, 3)
            return next
          })
          const timer = setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== n.id))
            timersRef.current.delete(n.id)
          }, 5000)
          timersRef.current.set(n.id, timer)
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          if (cancelled) return
          const updated = payload.new as Notification
          setNotifications(prev =>
            prev.map(n => n.id === updated.id ? updated : n)
          )
        }
      )
      .subscribe()

    channelRef.current = channel

    return () => {
      cancelled = true
      channel.unsubscribe()
      channelRef.current = null
      timersRef.current.forEach(timer => clearTimeout(timer))
      timersRef.current.clear()
    }
  }, [user?.id])

  const markAsRead = useCallback(async (id: string) => {
    const { error } = await supabase
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('id', id)

    if (!error) {
      setNotifications(prev =>
        prev.map(n => n.id === id ? { ...n, read_at: new Date().toISOString() } : n)
      )
    }
  }, [])

  const markAllAsRead = useCallback(async () => {
    if (!user) return
    const { error } = await supabase
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('user_id', user.id)
      .is('read_at', null)

    if (!error) {
      setNotifications(prev =>
        prev.map(n => n.read_at ? n : { ...n, read_at: new Date().toISOString() })
      )
    }
  }, [user])

  const deleteNotification = useCallback(async (id: string) => {
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', id)

    if (!error) {
      setNotifications(prev => prev.filter(n => n.id !== id))
    }
  }, [])

  const dismissToastStable = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
    const timer = timersRef.current.get(id)
    if (timer) {
      clearTimeout(timer)
      timersRef.current.delete(id)
    }
  }, [])

  const value = useRef<NotificationContextValue>({
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    toasts,
    dismissToast: dismissToastStable,
  })

  value.current = {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    toasts,
    dismissToast: dismissToastStable,
  }

  return (
    <NotificationContext.Provider value={value.current}>
      {children}
    </NotificationContext.Provider>
  )
}
