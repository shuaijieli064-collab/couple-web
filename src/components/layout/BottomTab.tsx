import { NavLink } from 'react-router-dom'
import { NotificationBell } from '../notifications/NotificationBell'

const navItems = [
  { path: '/', label: '首页', icon: '🏠' },
  { path: '/calendar', label: '日历', icon: '📅' },
  { path: '/checkin', label: '打卡', icon: '☀️' },
  { path: '/diary', label: '日记', icon: '📝' },
  { path: '/mood', label: '心情', icon: '💭' },
  { path: '/wishes', label: '愿望', icon: '🌟' },
  { path: '/photos', label: '照片', icon: '📷' },
  { path: '/games', label: '游戏', icon: '🎮' },
  { path: '/settings', label: '设置', icon: '⚙️' },
]

export function BottomTab() {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-md border-t border-sakura-100/50" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0)' }}>
      <ul className="flex items-center justify-around h-16 overflow-x-auto no-scrollbar">
        {navItems.map((item) => (
          <li key={item.path} className="flex-1 min-w-[3.5rem]">
            <NavLink
              to={item.path}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center gap-0.5 h-full text-xs transition-all duration-200 ${
                  isActive
                    ? 'text-sakura-500'
                    : 'text-cloud-400'
                }`
              }
            >
              <span className="text-lg">{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          </li>
        ))}
        <li className="flex-1 min-w-[3.5rem]">
          <NotificationBell />
        </li>
      </ul>
    </nav>
  )
}
