import { NavLink } from 'react-router-dom'

const navItems = [
  { path: '/', label: '首页', icon: '🏠' },
  { path: '/photos', label: '照片', icon: '📷' },
  { path: '/diary', label: '日记', icon: '📝' },
  { path: '/anniversaries', label: '纪念日', icon: '💝' },
  { path: '/settings', label: '设置', icon: '⚙️' },
]

export function BottomTab() {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-md border-t border-sakura-100/50" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0)' }}>
      <ul className="flex items-center justify-around h-16">
        {navItems.map((item) => (
          <li key={item.path} className="flex-1">
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
              <span className={`text-lg transition-transform ${
                // Will add animation via CSS class
                ''
              }`}>{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
