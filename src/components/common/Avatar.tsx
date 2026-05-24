import { cn } from '../../utils/cn'

const sizeMap = {
  xs: 'w-6 h-6 text-xs',
  sm: 'w-8 h-8 text-sm',
  md: 'w-10 h-10 text-base',
  lg: 'w-14 h-14 text-lg',
  xl: 'w-20 h-20 text-2xl',
}

interface AvatarProps {
  url?: string | null
  name: string
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  online?: boolean
}

export function Avatar({ url, name, size = 'md', online }: AvatarProps) {
  const initials = name.slice(0, 2).toUpperCase()

  return (
    <div className="relative inline-flex shrink-0">
      {url ? (
        <img
          src={url}
          alt={name}
          className={cn('rounded-full object-cover', sizeMap[size])}
        />
      ) : (
        <div
          className={cn(
            'rounded-full bg-gradient-to-br from-sakura-200 to-peach-200 text-sakura-700 flex items-center justify-center font-semibold',
            sizeMap[size]
          )}
        >
          {initials}
        </div>
      )}
      {online !== undefined && size !== 'xs' && (
        <span
          className={cn(
            'absolute bottom-0 right-0 block rounded-full ring-2 ring-white',
            online ? 'bg-sakura-400' : 'bg-cloud-300',
            size === 'xl' ? 'w-5 h-5' : 'w-3 h-3'
          )}
        />
      )}
    </div>
  )
}
