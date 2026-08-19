import { cn } from '@/lib/utils'

export function LifelineMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'relative flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground',
        className,
      )}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="size-5 stroke-current"
      >
        <path d="M2 12h4l2-4 3 8 2.5-5 2 3H22" />
      </svg>
    </span>
  )
}

export function LifelineLogo({
  className,
  showWordmark = true,
}: {
  className?: string
  showWordmark?: boolean
}) {
  return (
    <span className={cn('flex items-center gap-2.5', className)}>
      <LifelineMark />
      {showWordmark ? (
        <span className="flex flex-col leading-none">
          <span className="text-base font-extrabold tracking-tight">
            Lifeline<span className="text-primary">X</span>
          </span>
          <span className="font-mono text-[10px] tracking-[0.18em] text-muted-foreground uppercase">
            Campus blood net
          </span>
        </span>
      ) : null}
    </span>
  )
}
