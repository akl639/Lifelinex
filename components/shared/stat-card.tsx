import type * as React from 'react'

import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  accent = false,
}: {
  label: string
  value: React.ReactNode
  hint?: string
  icon: React.ComponentType<{ className?: string }>
  accent?: boolean
}) {
  return (
    <Card className={cn(accent && 'border-primary/35 bg-primary/8')}>
      <CardContent className="flex items-start gap-3">
        <span
          className={cn(
            'flex size-9 shrink-0 items-center justify-center rounded-lg',
            accent ? 'bg-primary/18 text-primary' : 'bg-secondary text-muted-foreground',
          )}
        >
          <Icon className="size-4" />
        </span>
        <div className="min-w-0">
          <p className="font-mono text-[10px] tracking-[0.14em] text-muted-foreground uppercase">
            {label}
          </p>
          <p className="mt-1 text-2xl font-extrabold tracking-tight tabular-nums">
            {value}
          </p>
          {hint ? (
            <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>
          ) : null}
        </div>
      </CardContent>
    </Card>
  )
}
