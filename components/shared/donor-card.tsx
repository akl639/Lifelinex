'use client'

import {
  BellIcon,
  BellOffIcon,
  ClockIcon,
  MapPinIcon,
  NavigationIcon,
  ShieldCheckIcon,
} from 'lucide-react'

import { BloodGroupTag } from '@/components/shared/blood-group-tag'
import { StatusPill } from '@/components/shared/status-pill'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  donorStatusLabel,
  donorStatusTone,
  formatDistance,
  initials,
} from '@/lib/format'
import type { DonorProfile } from '@/lib/types'

export function DonorCard({
  donor,
  onNotify,
  notifying = false,
}: {
  donor: DonorProfile
  onNotify?: (donor: DonorProfile) => void
  notifying?: boolean
}) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-3">
        <div className="flex items-start gap-3">
          <Avatar className="size-10">
            <AvatarFallback className="bg-secondary text-xs">
              {initials(donor.name)}
            </AvatarFallback>
          </Avatar>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <p className="truncate font-semibold">{donor.name}</p>
              {donor.verified ? (
                <ShieldCheckIcon
                  className="size-3.5 shrink-0 text-success"
                  aria-label="Verified donor"
                />
              ) : null}
            </div>
            <p className="truncate font-mono text-[11px] text-muted-foreground">
              {donor.userId} · {donor.department}
            </p>
          </div>

          <BloodGroupTag group={donor.bloodGroup} size="sm" />
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <StatusPill
            label={donorStatusLabel[donor.status]}
            tone={donorStatusTone[donor.status]}
            pulse={donor.status === 'responding'}
          />
          <span className="inline-flex items-center gap-1">
            <NavigationIcon className="size-3" />
            {formatDistance(donor.distanceMeters)}
          </span>
          {donor.etaMinutes ? (
            <span className="inline-flex items-center gap-1">
              <ClockIcon className="size-3" />
              ETA {donor.etaMinutes}m
            </span>
          ) : null}
        </div>

        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="inline-flex min-w-0 items-center gap-1">
            <MapPinIcon className="size-3 shrink-0" />
            <span className="truncate">{donor.location.label}</span>
          </span>
          <span className="inline-flex items-center gap-1">
            {donor.alertOptIn ? (
              <BellIcon className="size-3" />
            ) : (
              <BellOffIcon className="size-3" />
            )}
            {donor.alertOptIn ? 'Alerts on' : 'Alerts off'}
          </span>
        </div>

        {onNotify ? (
          <Button
            size="sm"
            variant={donor.status === 'available' ? 'default' : 'outline'}
            disabled={notifying || donor.status === 'cooldown'}
            onClick={() => onNotify(donor)}
            className="w-full"
          >
            {donor.status === 'cooldown'
              ? `Cooldown · ${donor.cooldownDaysLeft}d left`
              : notifying
                ? 'Sending alert…'
                : 'Send alert'}
          </Button>
        ) : null}
      </CardContent>
    </Card>
  )
}
