import {
  BellRingIcon,
  FingerprintIcon,
  HandHeartIcon,
  MapPinnedIcon,
  ShieldCheckIcon,
  ToggleRightIcon,
} from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

const FEATURES = [
  {
    icon: FingerprintIcon,
    title: 'Unique LifelineX IDs',
    body: 'Every donor and coordinator gets a permanent public ID such as LFX-8241-A, so records stay traceable without exposing phone numbers.',
  },
  {
    icon: HandHeartIcon,
    title: 'One-tap I CAN HELP',
    body: 'Donors accept from the alert itself. Their ETA, distance and ring are attached to the request instantly.',
  },
  {
    icon: ToggleRightIcon,
    title: 'Availability that respects cooldown',
    body: 'Donors toggle themselves available, and the 56-day post-donation cooldown is enforced automatically.',
  },
  {
    icon: MapPinnedIcon,
    title: 'Location opt-in, not surveillance',
    body: 'Coarse campus location is shared only while a donor is opted in, and only to rank distance for an active request.',
  },
  {
    icon: BellRingIcon,
    title: 'Granular alert control',
    body: 'Separate switches for location matching and emergency alerts mean donors choose exactly how they participate.',
  },
  {
    icon: ShieldCheckIcon,
    title: 'Coordinator verification',
    body: 'Health-centre coordinators verify donors, confirm collected units and close requests from a dedicated desk.',
  },
]

export function Features() {
  return (
    <section className="border-b border-border">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-20">
        <div className="flex flex-col gap-3">
          <p className="font-mono text-[11px] tracking-[0.18em] text-primary uppercase">
            Built for the ward, not the demo
          </p>
          <h2 className="max-w-2xl text-3xl font-extrabold tracking-tight text-balance sm:text-4xl">
            Everything a campus response actually needs.
          </h2>
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature) => {
            const Icon = feature.icon
            return (
              <Card key={feature.title} className="h-full">
                <CardHeader>
                  <span className="mb-1 flex size-9 items-center justify-center rounded-lg bg-primary/12 text-primary">
                    <Icon className="size-4" />
                  </span>
                  <CardTitle className="text-base font-bold">
                    {feature.title}
                  </CardTitle>
                  <CardDescription className="leading-relaxed">
                    {feature.body}
                  </CardDescription>
                </CardHeader>
                <CardContent />
              </Card>
            )
          })}
        </div>
      </div>
    </section>
  )
}
