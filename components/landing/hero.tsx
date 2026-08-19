import Image from 'next/image'
import Link from 'next/link'
import { ArrowRightIcon, RadioIcon, ShieldCheckIcon } from 'lucide-react'

import { BloodGroupTag } from '@/components/shared/blood-group-tag'
import { Button } from '@/components/ui/button'

export function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-border">
      <div className="absolute inset-0 grid-navy opacity-60" aria-hidden="true" />

      <div className="relative mx-auto grid max-w-6xl gap-10 px-4 pt-14 pb-16 sm:px-6 lg:grid-cols-[1.05fr_1fr] lg:items-center lg:gap-14 lg:pt-20 lg:pb-24">
        <div className="flex flex-col gap-6">
          <span className="inline-flex w-fit items-center gap-2 rounded-full border border-primary/35 bg-primary/12 px-3 py-1 text-xs font-semibold text-primary">
            <span className="relative flex size-1.5">
              <span className="absolute inline-flex size-1.5 rounded-full bg-primary [animation:lifeline-ping_1.8s_ease-out_infinite]" />
              <span className="relative inline-flex size-1.5 rounded-full bg-primary" />
            </span>
            Campus emergency blood response
          </span>

          <h1 className="text-4xl leading-[1.05] font-extrabold tracking-tight text-balance sm:text-5xl lg:text-6xl">
            When minutes decide,
            <br />
            <span className="text-primary">LifelineX</span> finds the
            <br />
            nearest suitable donor.
          </h1>

          <p className="max-w-xl text-base leading-relaxed text-muted-foreground text-pretty">
            A campus-wide emergency blood network. Raise a request and LifelineX
            identifies opted-in donors using blood-group matching, availability,
            and expanding search rings — 500&nbsp;m, then 1&nbsp;km, 3&nbsp;km,
            and finally campus-wide escalation.
          </p>

          <div className="flex flex-wrap gap-3">
            <Button size="lg" render={<Link href="/emergency/new" />} nativeButton={false}>
              Raise an emergency
              <ArrowRightIcon data-icon="inline-end" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              render={<Link href="/register" />}
              nativeButton={false}
            >
              Become a donor
            </Button>
          </div>

          <dl className="flex flex-wrap gap-x-8 gap-y-4 pt-2">
            <Stat value="500 m" label="First search radius" />
            <Stat value="Targeted" label="Donor alerts" />
            <Stat value="Blood group" label="Matching" />
          </dl>
        </div>

        <div className="relative">
          <div className="relative overflow-hidden rounded-2xl border border-border">
            <Image
              src="/images/campus-response.png"
              alt="A student running toward a campus health centre lit by red emergency signage at dusk"
              width={1200}
              height={900}
              priority
              className="h-full w-full object-cover"
            />
            <div
              className="absolute inset-0 bg-gradient-to-t from-background via-background/25 to-transparent"
              aria-hidden="true"
            />

            <div className="absolute inset-x-3 bottom-3 rounded-xl border border-border bg-card/95 p-3 backdrop-blur-sm">
              <div className="flex items-center gap-3">
                <BloodGroupTag group="O-" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">
                    Emergency blood request
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    Progressive search · Targeted donor alerts
                  </p>
                </div>
                <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
                  <RadioIcon className="size-4" />
                </span>
              </div>
            </div>
          </div>

          <div className="mt-3 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
            <ShieldCheckIcon className="size-3.5 text-success" />
            Opt-in donor participation
          </div>
        </div>
      </div>
    </section>
  )
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <dt className="sr-only">{label}</dt>
      <dd className="text-2xl font-extrabold tracking-tight tabular-nums">{value}</dd>
      <p className="mt-0.5 font-mono text-[10px] tracking-[0.14em] text-muted-foreground uppercase">
        {label}
      </p>
    </div>
  )
}