import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { NotificationProvider } from './contexts/NotificationContext'
import { AuthPage } from './components/auth/AuthPage'
import { AppLayout } from './components/layout/AppLayout'
import { HomePage } from './components/home/HomePage'
import { PhotosPage } from './components/photos/PhotosPage'
import { DiaryPage } from './components/diary/DiaryPage'
import { AnniversariesPage } from './components/anniversaries/AnniversariesPage'
import { GamesPage } from './components/games/GamesPage'
import { CheckInPage } from './components/checkin/CheckInPage'
import { MoodPage } from './components/mood/MoodPage'
import { WishListPage } from './components/wishes/WishListPage'
import { SettingsPage } from './components/settings/SettingsPage'

function AppRoutes() {
  const { user, loading, authError } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-sakura-50 via-peach-50 to-lilac-50">
        <div className="text-center">
          <div className="text-4xl mb-3 animate-[bounce-subtle_1s_ease-in-out_infinite]">💕</div>
          <p className="text-cloud-400 text-sm">加载中...</p>
        </div>
      </div>
    )
  }

  if (authError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-sakura-50 via-peach-50 to-lilac-50 p-4">
        <div className="bg-white rounded-3xl shadow-xl shadow-sakura-200/30 p-8 max-w-md w-full text-center">
          <div className="text-5xl mb-4">📡</div>
          <h1 className="text-lg font-bold text-cloud-800 mb-2" style={{ fontFamily: "'Quicksand', sans-serif" }}>
            连接出现问题
          </h1>
          <p className="text-sm text-cloud-500 mb-4">{authError}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-2.5 text-sm text-white bg-gradient-to-r from-sakura-400 to-sakura-500 hover:from-sakura-500 hover:to-sakura-600 rounded-xl transition-all shadow-sm"
          >
            刷新重试
          </button>
        </div>
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
        <Route path="/calendar" element={<AnniversariesPage />} />
        <Route path="/games" element={<GamesPage />} />
        <Route path="/checkin" element={<CheckInPage />} />
        <Route path="/mood" element={<MoodPage />} />
        <Route path="/wishes" element={<WishListPage />} />
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
        <NotificationProvider>
          <Routes>
            <Route path="/login" element={<AuthPage />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route path="/*" element={<AppRoutes />} />
          </Routes>
        </NotificationProvider>
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
