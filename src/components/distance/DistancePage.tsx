import { useState } from 'react'
import { CalendarTab } from './CalendarTab'
import { CheckInTab } from './CheckInTab'
import { MoodTab } from './MoodTab'
import { WishListTab } from './WishListTab'
import { LoveLetterTab } from './LoveLetterTab'
import { DistanceGamesTab } from './DistanceGamesTab'

type DistanceTab = 'calendar' | 'checkin' | 'mood' | 'wish' | 'letter' | 'games'

const TABS: { key: DistanceTab; label: string; icon: string }[] = [
  { key: 'calendar', label: '共享日历', icon: '📅' },
  { key: 'checkin', label: '早安晚安', icon: '🌅' },
  { key: 'mood', label: '心情气泡', icon: '💭' },
  { key: 'wish', label: '愿望清单', icon: '🌟' },
  { key: 'letter', label: '定时情书', icon: '💌' },
  { key: 'games', label: '异地游戏', icon: '🎲' },
]

export function DistancePage() {
  const [activeTab, setActiveTab] = useState<DistanceTab>('calendar')

  return (
    <div className="space-y-6">
      <div>
        <h1
          className="text-xl md:text-2xl font-bold text-cloud-800"
          style={{ fontFamily: "'Quicksand', sans-serif" }}
        >
          异地恋 💞
        </h1>
        <p className="text-sm text-cloud-400 mt-1">距离再远，也隔不断我们的心</p>
      </div>

      {/* Tab 切换 - 横向滚动以适配 6 个标签 */}
      <div className="flex bg-sakura-100/60 rounded-xl p-1 overflow-x-auto gap-1">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`shrink-0 px-4 py-2 text-sm rounded-lg transition-colors whitespace-nowrap ${
              activeTab === tab.key
                ? 'bg-white text-cloud-800 shadow-sm font-medium'
                : 'text-cloud-400 hover:text-cloud-600'
            }`}
          >
            <span className="mr-1">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'calendar' && <CalendarTab />}
      {activeTab === 'checkin' && <CheckInTab />}
      {activeTab === 'mood' && <MoodTab />}
      {activeTab === 'wish' && <WishListTab />}
      {activeTab === 'letter' && <LoveLetterTab />}
      {activeTab === 'games' && <DistanceGamesTab />}
    </div>
  )
}
