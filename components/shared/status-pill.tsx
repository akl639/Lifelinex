import { cn } from '@/lib/utils'

export function StatusPill({
  label,
  tone,
  pulse = false,
  className,
}: {
  label: string
  /** Tailwind classes for border/bg/text, from lib/format tone maps. */
  tone: string
  pulse?: boolean
  className?: string
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold',
        tone,
        className,
      )}
    >
      {pulse ? (
        <span className="relative flex size-1.5">
          <span className="absolute inline-flex size-1.5 rounded-full bg-current [animation:lifeline-ping_1.6s_ease-out_infinite]" />
          <span className="relative inline-flex size-1.5 rounded-full bg-current" />
        </span>
      ) : null}
      {label}
    </span>
  )
}
