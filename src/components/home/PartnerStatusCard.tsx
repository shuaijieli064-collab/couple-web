import { Avatar } from '../common/Avatar'
import { Card } from '../common/Card'
import { type Profile } from '../../types/database'

interface PartnerStatusCardProps {
  partner: Profile
  isOnline: boolean
}

export function PartnerStatusCard({ partner, isOnline }: PartnerStatusCardProps) {
  const lastActive = partner.last_active_at
    ? new Date(partner.last_active_at).toLocaleString('zh-CN', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '未知'

  return (
    <Card>
      <div className="flex items-center gap-4">
        <Avatar url={partner.avatar_url} name={partner.display_name} size="lg" online={isOnline} />
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-cloud-800" style={{ fontFamily: "'Quicksand', sans-serif" }}>{partner.display_name}</h3>
          {partner.mood_status ? (
            <p className="text-sm text-cloud-500 mt-0.5">💭 {partner.mood_status}</p>
          ) : (
            <p className="text-sm text-cloud-400 mt-0.5">
              {isOnline ? '在线 ✨' : `最后活跃: ${lastActive}`}
            </p>
          )}
        </div>
      </div>
    </Card>
  )
}
