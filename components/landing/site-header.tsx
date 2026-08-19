import Link from 'next/link'

import { LifelineLogo } from '@/components/brand/logo'
import { Button } from '@/components/ui/button'

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4 sm:px-6">
        <Link href="/" aria-label="LifelineX home">
          <LifelineLogo />
        </Link>

        <nav
          className="ml-6 hidden items-center gap-1 md:flex"
          aria-label="Main navigation"
        >
          <Button variant="ghost" size="sm" render={<Link href="/dashboard" />} nativeButton={false}>
            Donor Dashboard
          </Button>
          <Button variant="ghost" size="sm" render={<Link href="/emergency/new" />} nativeButton={false}>
            Raise Emergency
          </Button>
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <Button variant="ghost" size="sm" render={<Link href="/login" />} nativeButton={false}>
            Sign in
          </Button>
          <Button size="sm" render={<Link href="/register" />} nativeButton={false}>
            Register
          </Button>
        </div>
      </div>
    </header>
  )
}

