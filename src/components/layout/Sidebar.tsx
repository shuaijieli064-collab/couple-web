import { NavLink } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { Avatar } from '../common/Avatar'

const navItems = [
  { path: '/', label: '首页', icon: '🏠' },
  { path: '/photos', label: '照片', icon: '📷' },
  { path: '/diary', label: '日记', icon: '📝' },
  { path: '/anniversaries', label: '纪念日', icon: '💝' },
  { path: '/games', label: '游戏', icon: '🎮' },
  { path: '/settings', label: '设置', icon: '⚙️' },
]

export function Sidebar({ className = '' }: { className?: string }) {
  const { profile, signOut } = useAuth()

  return (
    <aside className={`w-64 bg-white border-r border-sakura-100/50 flex flex-col ${className}`}>
      <div className="p-6 border-b border-sakura-100/50">
        <div className="flex items-center gap-3">
          <div className="text-2xl animate-[pulse-slow_3s_ease-in-out_infinite]">💕</div>
          <h1 className="text-lg font-bold text-cloud-800">我们的时光</h1>
        </div>
      </div>

      <nav className="flex-1 p-4">
        <ul className="space-y-1">
          {navItems.map((item) => (
            <li key={item.path}>
              <NavLink
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? 'bg-sakura-50 text-sakura-600 shadow-sm shadow-sakura-100/30'
                      : 'text-cloud-500 hover:bg-sakura-50/50 hover:text-cloud-800'
                  }`
                }
              >
                <span className="text-lg">{item.icon}</span>
                {item.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <div className="p-4 border-t border-sakura-100/50">
        <div className="flex items-center gap-3 mb-3">
          <Avatar url={profile?.avatar_url} name={profile?.display_name ?? '我'} size="sm" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-cloud-800 truncate">{profile?.display_name}</p>
            {profile?.mood_status && (
              <p className="text-xs text-cloud-400 truncate">{profile.mood_status}</p>
            )}
          </div>
        </div>
        <button
          onClick={signOut}
          className="w-full text-sm text-cloud-400 hover:text-sakura-500 py-2 transition-colors"
        >
          退出登录
        </button>
      </div>
    </aside>
  )
}
