import { type ReactNode } from 'react'
import { InstallPrompt } from '../common/InstallPrompt'
import { Sidebar } from './Sidebar'
import { BottomTab } from './BottomTab'
import { ToastContainer } from '../notifications/Toast'

interface AppLayoutProps {
  children: ReactNode
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <div
      className="flex h-screen bg-sakura-50"
      style={{ paddingTop: 'env(safe-area-inset-top, 0)' }}
    >
      <Sidebar className="hidden md:flex" />
      <main className="flex-1 overflow-y-auto pb-20 md:pb-6">
        <div className="max-w-6xl mx-auto p-4 md:p-6">
          {children}
        </div>
      </main>
      <BottomTab />
      <InstallPrompt />
      <ToastContainer />
    </div>
  )
}
