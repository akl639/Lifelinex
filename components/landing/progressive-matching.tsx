'use client'

import * as React from 'react'

import { RadiusRadar } from '@/components/shared/radius-radar'
import { Button } from '@/components/ui/button'
import { DONORS } from '@/lib/mock/data'
import { RADIUS_SEQUENCE, radiusLabel } from '@/lib/services/request-service'
import type { MatchRadius } from '@/lib/types'
import { cn } from '@/lib/utils'

const RING_COPY: Record<string, { title: string; body: string }> = {
  '500': {
    title: 'Immediate vicinity',
    body: 'Donors inside the same block or hostel wing are alerted first — they can reach the bed in under five minutes.',
  },
  '1000': {
    title: 'Adjacent blocks',
    body: 'If units are still short after the escalation window, the search widens to neighbouring academic and residential blocks.',
  },
  '3000': {
    title: 'Extended campus belt',
    body: 'Off-campus housing, faculty quarters and the sports annexe join the alert wave.',
  },
  campus: {
    title: 'Campus-wide broadcast',
    body: 'Every compatible opted-in donor receives the alert. Reserved for rare groups and critical shortfalls.',
  },
}

export function ProgressiveMatching() {
  const [radius, setRadius] = React.useState<MatchRadius>(500)
  const copy = RING_COPY[String(radius)]

  return (
    <section className="border-b border-border">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-20">
        <div className="flex flex-col gap-3">
          <p className="font-mono text-[11px] tracking-[0.18em] text-primary uppercase">
            Progressive matching
          </p>
          <h2 className="max-w-2xl text-3xl font-extrabold tracking-tight text-balance sm:text-4xl">
            The alert grows only as far as it has to.
          </h2>
          <p className="max-w-2xl leading-relaxed text-muted-foreground text-pretty">
            Blasting the whole campus for every request burns goodwill. LifelineX
            starts tight and escalates on a timer, so the closest willing donor is
            always reached first.
          </p>
        </div>

        <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_1.1fr] lg:items-center">
          <RadiusRadar activeRadius={radius} donors={DONORS} />

          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap gap-2">
              {RADIUS_SEQUENCE.map((value) => (
                <Button
                  key={String(value)}
                  size="sm"
                  variant={value === radius ? 'default' : 'outline'}
                  onClick={() => setRadius(value)}
                  className={cn('font-mono')}
                >
                  {radiusLabel(value)}
                </Button>
              ))}
            </div>

            <div className="rounded-xl border border-border bg-card p-5">
              <p className="font-mono text-[10px] tracking-[0.14em] text-muted-foreground uppercase">
                Ring {RADIUS_SEQUENCE.indexOf(radius) + 1} of 4
              </p>
              <h3 className="mt-2 text-xl font-bold tracking-tight">{copy.title}</h3>
              <p className="mt-2 leading-relaxed text-muted-foreground">{copy.body}</p>
            </div>

            <ol className="flex flex-col gap-2">
              {RADIUS_SEQUENCE.map((value, index) => {
                const active = RADIUS_SEQUENCE.indexOf(radius) >= index
                return (
                  <li
                    key={String(value)}
                    className={cn(
                      'flex items-center gap-3 rounded-lg border px-3 py-2 text-sm transition-colors',
                      active
                        ? 'border-primary/30 bg-primary/8 text-foreground'
                        : 'border-border text-muted-foreground',
                    )}
                  >
                    <span
                      className={cn(
                        'flex size-5 shrink-0 items-center justify-center rounded-full font-mono text-[10px]',
                        active
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-secondary text-muted-foreground',
                      )}
                    >
                      {index + 1}
                    </span>
                    <span className="font-medium">{radiusLabel(value)}</span>
                    <span className="ml-auto font-mono text-xs">
                      {value === 'campus' ? 'final' : `+${(index + 1) * 60}s`}
                    </span>
                  </li>
                )
              })}
            </ol>
          </div>
        </div>
      </div>
    </section>
  )
}
