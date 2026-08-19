import type { ReactNode } from "react"
import Link from "next/link"
import { LifelineLogo } from "@/components/brand/logo"

export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string
  subtitle: string
  children: ReactNode
  footer?: ReactNode
}) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1fr_1.05fr]">
      {/* LEFT SIDE */}
      <aside className="relative hidden flex-col justify-between overflow-hidden border-r border-border/60 bg-card p-10 lg:flex">
        {/* Background glow */}
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-[radial-gradient(circle_at_15%_10%,color-mix(in_oklab,var(--primary)_22%,transparent),transparent_55%)]"
        />

        {/* Grid */}
        <div
          aria-hidden="true"
          className="absolute inset-0 opacity-[0.07] [background-image:linear-gradient(var(--foreground)_1px,transparent_1px),linear-gradient(90deg,var(--foreground)_1px,transparent_1px)] [background-size:56px_56px]"
        />

        {/* Logo */}
        <Link
          href="/"
          className="relative z-10"
        >
          <LifelineLogo />
        </Link>

        {/* Main content */}
        <div className="relative z-10 flex flex-col gap-8">
          <h2 className="max-w-sm font-serif text-4xl leading-[1.1] tracking-tight text-balance">
            The fastest route to a matching donor is the one already on campus.
          </h2>

          <p className="max-w-sm leading-relaxed text-muted-foreground">
            LifelineX connects emergency blood requests with appropriate
            registered donors, helping people coordinate faster when every
            minute matters.
          </p>

          {/* REAL FEATURES — no fake statistics */}
          <div className="mt-2 space-y-4">
            {/* Feature 1 */}
            <div className="flex items-start gap-4 border-b border-border/60 pb-5">
              <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <span className="text-xl font-bold">ϟ</span>
              </div>

              <div>
                <h3 className="font-semibold text-foreground">
                  One-tap emergency requests
                </h3>

                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  Create and coordinate urgent blood requests quickly.
                </p>
              </div>
            </div>

            {/* Feature 2 */}
            <div className="flex items-start gap-4 border-b border-border/60 pb-5">
              <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <span className="text-xl font-bold">◉</span>
              </div>

              <div>
                <h3 className="font-semibold text-foreground">
                  Blood-group based matching
                </h3>

                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  Find suitable opted-in donors based on blood-group
                  compatibility.
                </p>
              </div>
            </div>

            {/* Feature 3 */}
            <div className="flex items-start gap-4">
              <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <span className="text-xl font-bold">⌖</span>
              </div>

              <div>
                <h3 className="font-semibold text-foreground">
                  Campus-first response
                </h3>

                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  Prioritise nearby registered responders when an emergency
                  occurs.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <p className="relative z-10 text-xs text-muted-foreground">
          Campus Health Services &middot; For life-threatening emergencies
          always call campus security first.
        </p>
      </aside>

      {/* RIGHT SIDE */}
      <main className="flex items-center justify-center px-4 py-12 sm:px-8">
        <div className="flex w-full max-w-md flex-col gap-8">
          {/* Mobile logo */}
          <Link
            href="/"
            className="lg:hidden"
          >
            <LifelineLogo />
          </Link>

          {/* Heading */}
          <div className="flex flex-col gap-2">
            <h1 className="font-serif text-3xl tracking-tight">
              {title}
            </h1>

            <p className="leading-relaxed text-muted-foreground">
              {subtitle}
            </p>
          </div>

          {/* Login/Register form */}
          {children}

          {/* Footer */}
          {footer ? (
            <div className="text-sm text-muted-foreground">
              {footer}
            </div>
          ) : null}
        </div>
      </main>
    </div>
  )
}