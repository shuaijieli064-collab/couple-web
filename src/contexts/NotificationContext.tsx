import { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './AuthContext'
import { subscribeToPush } from '../utils/pushManager'
import type { Notification } from '../types/database'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || ''
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

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
  const toastTimerRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())

  const unreadCount = notifications.filter(n => !n.read_at).length

  const triggerPush = useCallback(async (notification: Notification) => {
    try {
      await fetch(`${SUPABASE_URL}/functions/v1/send-push`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          notification_id: notification.id,
          user_id: notification.user_id,
          title: notification.title,
          message: notification.message,
          url: '/',
        }),
      })
    } catch {
      // Push trigger is best-effort
    }
  }, [])

  const dismissToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
    const timer = toastTimerRef.current.get(id)
    if (timer) {
      clearTimeout(timer)
      toastTimerRef.current.delete(id)
    }
  }, [])

  const addToast = useCallback((notification: Notification) => {
    setToasts(prev => {
      if (prev.some(t => t.id === notification.id)) return prev
      return [notification, ...prev].slice(0, 3)
    })
    const timer = setTimeout(() => {
      dismissToast(notification.id)
    }, 5000)
    toastTimerRef.current.set(notification.id, timer)
  }, [dismissToast])

  useEffect(() => {
    if (!user) return

    const loadNotifications = async () => {
      setLoading(true)
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50)

      if (data) setNotifications(data as Notification[])
      setLoading(false)
    }

    loadNotifications()

    subscribeToPush(user.id).catch(() => {})

    const channel = supabase
      .channel('notifications-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const newNotification = payload.new as Notification
          setNotifications(prev => [newNotification, ...prev])
          addToast(newNotification)
          triggerPush(newNotification)
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
          const updated = payload.new as Notification
          setNotifications(prev =>
            prev.map(n => n.id === updated.id ? updated : n)
          )
        }
      )
      .subscribe()

    const timers = toastTimerRef.current
    return () => {
      channel.unsubscribe()
      timers.forEach(timer => clearTimeout(timer))
      timers.clear()
    }
  }, [user, addToast, triggerPush])

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

  return (
    <NotificationContext.Provider value={{
      notifications,
      unreadCount,
      loading,
      markAsRead,
      markAllAsRead,
      deleteNotification,
      toasts,
      dismissToast,
    }}>
      {children}
    </NotificationContext.Provider>
  )
}
