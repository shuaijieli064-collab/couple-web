import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { AuthPage } from './components/auth/AuthPage'
import { AppLayout } from './components/layout/AppLayout'
import { HomePage } from './components/home/HomePage'
import { PhotosPage } from './components/photos/PhotosPage'
import { DiaryPage } from './components/diary/DiaryPage'
import { AnniversariesPage } from './components/anniversaries/AnniversariesPage'
import { SettingsPage } from './components/settings/SettingsPage'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-cloud-400">
        加载中...
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}

function AppRoutes() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-cloud-400">
        加载中...
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return (
    <AppLayout>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/photos" element={<PhotosPage />} />
        <Route path="/diary" element={<DiaryPage />} />
        <Route path="/anniversaries" element={<AnniversariesPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppLayout>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<AuthPage />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/*" element={<AppRoutes />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

function AuthCallback() {
  const { loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-sakura-50 via-peach-50 to-lilac-50">
        <div className="text-cloud-400">登录中...</div>
      </div>
    )
  }

  return <Navigate to="/" replace />
}
