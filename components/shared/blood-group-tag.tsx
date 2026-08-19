import type { BloodGroup } from '@/lib/types'
import { cn } from '@/lib/utils'

export function BloodGroupTag({
  group,
  size = 'default',
  className,
}: {
  group: BloodGroup
  size?: 'sm' | 'default' | 'lg'
  className?: string
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center justify-center rounded-lg border border-primary/35 bg-primary/12 font-mono font-bold tracking-tight text-primary',
        size === 'sm' && 'h-6 min-w-9 px-1.5 text-xs',
        size === 'default' && 'h-8 min-w-11 px-2 text-sm',
        size === 'lg' && 'h-12 min-w-14 px-2.5 text-lg',
        className,
      )}
    >
      {group}
      <span className="sr-only"> blood group</span>
    </span>
  )
}
