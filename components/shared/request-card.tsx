import Link from 'next/link'
import { DropletIcon, MapPinIcon, RadarIcon, TimerIcon } from 'lucide-react'

import { BloodGroupTag } from '@/components/shared/blood-group-tag'
import { StatusPill } from '@/components/shared/status-pill'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  countdown,
  relativeTime,
  requestStatusLabel,
  requestStatusTone,
  urgencyLabel,
  urgencyTone,
} from '@/lib/format'
import { radiusLabel } from '@/lib/services/request-service'
import type { EmergencyRequest } from '@/lib/types'

export function RequestCard({
  request,
  action,
}: {
  request: EmergencyRequest
  action?: React.ReactNode
}) {
  const unitsNeeded = request.unitsNeeded || 1
  const unitsSecured = request.unitsSecured || 0
  const progress = Math.round((unitsSecured / unitsNeeded) * 100)
  const urgencyKey = request.urgency || 'Critical'
  const statusKey = request.status || 'active'

  return (
    <Card
      className={
        urgencyKey === 'critical' || urgencyKey === 'Critical' ? 'border-primary/30 ring-primary/25' : undefined
      }
    >
      <CardContent className="flex flex-col gap-4">
        <div className="flex items-start gap-3">
          <BloodGroupTag group={request.bloodGroup} size="lg" />

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-mono text-xs text-muted-foreground">
                {request.requestId}
              </p>
              <StatusPill
                label={urgencyLabel[urgencyKey] ?? String(urgencyKey)}
                tone={urgencyTone[urgencyKey] ?? 'border-border bg-secondary text-muted-foreground'}
                pulse={urgencyKey === 'critical' || urgencyKey === 'Critical'}
              />
              <StatusPill
                label={requestStatusLabel[statusKey] ?? String(statusKey)}
                tone={requestStatusTone[statusKey] ?? 'border-border bg-secondary text-muted-foreground'}
              />
            </div>
            <p className="mt-1 truncate font-semibold">
              {request.patientName} · {unitsNeeded} unit(s) needed
            </p>
            <p className="truncate text-xs text-muted-foreground">
              Raised {relativeTime(request.createdAt)} {request.raisedBy?.name ? `by ${request.raisedBy.name}` : ''}
            </p>
          </div>
        </div>

        <dl className="grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
          <Meta icon={MapPinIcon} label="Location">
            {request.ward || request.hospital || request.requesterAddress || 'Campus'}
          </Meta>
          <Meta icon={DropletIcon} label="Secured">
            {unitsSecured}/{unitsNeeded} units
          </Meta>
          <Meta icon={RadarIcon} label="Search ring">
            {radiusLabel(request.currentRadius || 500)}
          </Meta>
          <Meta icon={TimerIcon} label="Window">
            {request.neededBy ? countdown(request.neededBy) : 'Immediate'}
          </Meta>
        </dl>

        <div>
          <div
            className="h-1.5 w-full overflow-hidden rounded-full bg-secondary"
            role="progressbar"
            aria-valuenow={progress}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`${unitsSecured} of ${unitsNeeded} units secured`}
          >
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${Math.max(progress, 3)}%` }}
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {action ?? (
            <>
              <Button
                size="sm"
                render={<Link href={`/emergency/new`} />}
                nativeButton={false}
              >
                Track live
              </Button>
              <Button
                size="sm"
                variant="outline"
                render={<Link href={`/dashboard`} />}
                nativeButton={false}
              >
                View details
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

function Meta({
  icon: Icon,
  label,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="min-w-0">
      <dt className="flex items-center gap-1 font-mono text-[10px] tracking-[0.12em] text-muted-foreground uppercase">
        <Icon className="size-3" />
        {label}
      </dt>
      <dd className="mt-0.5 truncate font-medium">{children}</dd>
    </div>
  )
}
