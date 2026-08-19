'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import * as React from 'react'
import {
  ActivityIcon,
  BellIcon,
  GaugeIcon,
  LogOutIcon,
  MenuIcon,
  RadarIcon,
  ShieldPlusIcon,
  SirenIcon,
  UserRoundIcon,
  XIcon,
} from 'lucide-react'

import { LifelineLogo } from '@/components/brand/logo'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { CURRENT_COORDINATOR, CURRENT_DONOR } from '@/lib/mock/data'
import { initials } from '@/lib/format'
import { cn } from '@/lib/utils'

type NavItem = {
  href: string
  label: string
  icon: React.ComponentType<{ className?: string }>
}

const donorNav: NavItem[] = [
  { href: '/dashboard', label: 'Donor Dashboard', icon: GaugeIcon },
  { href: '/emergency/new', label: 'Raise Emergency', icon: SirenIcon },
  { href: '/matching', label: 'Donor Matching', icon: RadarIcon },
  { href: '/tracking', label: 'Emergency Tracking', icon: ActivityIcon },
  { href: '/profile', label: 'Profile', icon: UserRoundIcon },
]

const coordinatorNav: NavItem[] = [
  { href: '/coordinator', label: 'Coordinator Desk', icon: ShieldPlusIcon },
]

export function AppShell({
  children,
  role = 'donor',
}: {
  children: React.ReactNode
  role?: 'donor' | 'coordinator'
}) {
  const pathname = usePathname()
  const [open, setOpen] = React.useState(false)
  const user = role === 'coordinator' ? CURRENT_COORDINATOR : CURRENT_DONOR

  React.useEffect(() => {
    setOpen(false)
  }, [pathname])

  const nav = (
    <nav className="flex flex-col gap-1" aria-label="Primary">
      <p className="px-3 pt-2 pb-1 font-mono text-[10px] tracking-[0.16em] text-muted-foreground uppercase">
        Response
      </p>
      {donorNav.map((item) => (
        <NavLink key={item.href} item={item} active={pathname === item.href} />
      ))}
      <p className="px-3 pt-4 pb-1 font-mono text-[10px] tracking-[0.16em] text-muted-foreground uppercase">
        Command
      </p>
      {coordinatorNav.map((item) => (
        <NavLink key={item.href} item={item} active={pathname === item.href} />
      ))}
    </nav>
  )

  return (
    <div className="min-h-dvh bg-background">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-border bg-sidebar px-3 py-4 lg:flex">
        <Link href="/" className="px-2">
          <LifelineLogo />
        </Link>
        <Separator className="my-4" />
        {nav}
        <div className="mt-auto flex flex-col gap-3">
          <div className="rounded-xl border border-border bg-card p-3">
            <div className="flex items-center gap-2.5">
              <Avatar className="size-9">
                <AvatarFallback className="bg-primary/15 text-xs text-primary">
                  {initials(user.name)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{user.name}</p>
                <p className="truncate font-mono text-[11px] text-muted-foreground">
                  {user.userId}
                </p>
              </div>
            </div>
          </div>
          <Button variant="ghost" size="sm" className="justify-start" render={<Link href="/login" />} nativeButton={false}>
            <LogOutIcon data-icon="inline-start" />
            Sign out
          </Button>
        </div>
      </aside>

      {/* Mobile drawer */}
      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Close navigation"
            className="absolute inset-0 bg-background/80 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <div className="relative flex h-full w-72 max-w-[85vw] flex-col border-r border-border bg-sidebar px-3 py-4">
            <div className="flex items-center justify-between px-2">
              <LifelineLogo />
              <Button variant="ghost" size="icon-sm" onClick={() => setOpen(false)}>
                <XIcon />
                <span className="sr-only">Close navigation</span>
              </Button>
            </div>
            <Separator className="my-4" />
            {nav}
          </div>
        </div>
      ) : null}

      {/* Main */}
      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-background/85 px-4 backdrop-blur-md sm:px-6">
          <Button
            variant="outline"
            size="icon-sm"
            className="lg:hidden"
            onClick={() => setOpen(true)}
          >
            <MenuIcon />
            <span className="sr-only">Open navigation</span>
          </Button>

          <div className="flex min-w-0 items-center gap-2">
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-2 rounded-full bg-primary [animation:lifeline-ping_1.8s_ease-out_infinite]" />
              <span className="relative inline-flex size-2 rounded-full bg-primary" />
            </span>
            <p className="truncate text-sm font-medium">
              3 active emergencies on campus
            </p>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <Badge variant="outline" className="hidden font-mono sm:flex">
              {user.bloodGroup}
            </Badge>
            <Button variant="outline" size="icon-sm" aria-label="Alerts">
              <BellIcon />
            </Button>
            <Button size="sm" render={<Link href="/emergency/new" />} nativeButton={false}>
              <SirenIcon data-icon="inline-start" />
              <span className="hidden sm:inline">Raise emergency</span>
              <span className="sm:hidden">SOS</span>
            </Button>
          </div>
        </header>

        <main className="px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  )
}

function NavLink({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = item.icon
  return (
    <Link
      href={item.href}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
        active
          ? 'bg-primary/12 text-primary'
          : 'text-muted-foreground hover:bg-sidebar-accent hover:text-foreground',
      )}
    >
      <Icon className="size-4 shrink-0" />
      <span className="truncate">{item.label}</span>
    </Link>
  )
}
