import Link from "next/link"
import { LifelineLogo } from "@/components/brand/logo"
import { Button } from "@/components/ui/button"
import { ArrowRightIcon } from "lucide-react"

export function SiteFooter() {
  return (
    <footer className="border-t border-border/60">
      <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="rounded-2xl border border-primary/25 bg-[linear-gradient(135deg,color-mix(in_oklab,var(--primary)_16%,transparent),transparent_65%)] p-8 sm:p-12">
          <h2 className="max-w-xl font-serif text-3xl leading-tight tracking-tight text-balance sm:text-4xl">
            Every registered donor shortens someone&apos;s wait.
          </h2>
          <p className="mt-4 max-w-lg leading-relaxed text-muted-foreground">
            Registration takes under two minutes. Verify your blood group once, set your availability, and the network
            will only ever contact you when a matching request is live nearby.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button size="lg" render={<Link href="/register" />} nativeButton={false}>
              Register as a donor
              <ArrowRightIcon data-icon="inline-end" />
            </Button>
            <Button size="lg" variant="outline" render={<Link href="/emergency/new" />} nativeButton={false}>
              Raise a request
            </Button>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-6 border-t border-border/60 pt-8 sm:flex-row sm:items-center sm:justify-between">
          <LifelineLogo />
          <nav aria-label="Footer" className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
            <Link href="/login" className="transition-colors hover:text-foreground">
              Sign in
            </Link>
            <Link href="/register" className="transition-colors hover:text-foreground">
              Register
            </Link>
            <Link href="/dashboard" className="transition-colors hover:text-foreground">
              Donor dashboard
            </Link>
            <Link href="/emergency/new" className="transition-colors hover:text-foreground">
              Raise emergency
            </Link>
          </nav>
          <p className="text-xs text-muted-foreground">
            Campus Health Services &middot; Not a substitute for emergency medical care
          </p>
        </div>
      </div>
    </footer>
  )
}
