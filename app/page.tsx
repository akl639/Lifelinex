import { SiteHeader } from "@/components/landing/site-header"
import { Hero } from "@/components/landing/hero"
import { ProgressiveMatching } from "@/components/landing/progressive-matching"
import { Features } from "@/components/landing/features"
import { SiteFooter } from "@/components/landing/site-footer"

export default function LandingPage() {
  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader />
      <main className="flex-1">
        <Hero />
        <ProgressiveMatching />
        <Features />
      </main>
      <SiteFooter />
    </div>
  )
}
