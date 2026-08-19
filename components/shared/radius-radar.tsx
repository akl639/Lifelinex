"use client"

import * as React from "react"
import { HeartPulseIcon } from "lucide-react"

import {
  RADIUS_SEQUENCE,
  radiusLabel,
} from "@/lib/services/request-service"

import type {
  DonorProfile,
  MatchRadius,
} from "@/lib/types"

import { cn } from "@/lib/utils"

const RING_SIZES = [
  "28%",
  "48%",
  "72%",
  "96%",
]

/**
 * Signature visual: concentric campus rings with donor blips positioned by
 * their distance from the request.
 *
 * Purely presentational — feed it donors
 * from `donorService.matchesFor()`.
 */
export function RadiusRadar({
  activeRadius,
  donors,
  className,
}: {
  activeRadius: MatchRadius
  donors: DonorProfile[]
  className?: string
}) {
  const activeIndex =
    RADIUS_SEQUENCE.indexOf(
      activeRadius,
    )

  const maxMeters =
    activeRadius === "campus"
      ? 4000
      : activeRadius * 1.35

  const blips =
    React.useMemo(
      () =>
        donors
          .slice(0, 12)
          .map(
            (
              donor,
              index,
            ) => {
              const distance =
                donor.distanceMeters ??
                0

              const ratio =
                Math.min(
                  distance /
                  maxMeters,
                  0.97,
                )

              // Deterministic angle so the layout is stable between renders.
              const angle =
                (index * 137.5 +
                  distance / 7) %
                360

              const radians =
                (angle * Math.PI) /
                180

              return {
                id: donor._id,
                name: donor.name,

                inRange:
                  activeRadius ===
                    "campus"
                    ? true
                    : distance <=
                    (activeRadius as number),

                left:
                  (
                    50 +
                    Math.cos(
                      radians,
                    ) *
                    ratio *
                    47
                  ).toFixed(2),

                top:
                  (
                    50 +
                    Math.sin(
                      radians,
                    ) *
                    ratio *
                    47
                  ).toFixed(2),
              }
            },
          ),
      [
        donors,
        activeRadius,
        maxMeters,
      ],
    )

  return (
    <div
      className={cn(
        "relative aspect-square w-full overflow-hidden rounded-2xl border border-border bg-card grid-navy",
        className,
      )}
      role="img"
      aria-label={`Progressive donor matching radar, active ring ${radiusLabel(
        activeRadius,
      )}, ${donors.length} donors plotted`}
    >
      {/* sweep */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div
          className="size-full origin-center [animation:lifeline-sweep_6s_linear_infinite]"
          style={{
            background:
              "conic-gradient(from 0deg, color-mix(in oklab, var(--primary) 22%, transparent) 0deg, transparent 55deg, transparent 360deg)",
          }}
        />
      </div>

      {/* rings */}
      {RING_SIZES.map(
        (
          size,
          index,
        ) => {
          const isActive =
            index ===
            activeIndex

          const isCleared =
            index <
            activeIndex

          return (
            <div
              key={size}
              className={cn(
                "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border",

                isActive &&
                "border-primary/70",

                isCleared &&
                "border-success/35 border-dashed",

                !isActive &&
                !isCleared &&
                "border-border",
              )}
              style={{
                width: size,
                height: size,
              }}
            >
              <span
                className={cn(
                  "absolute -top-2 left-1/2 -translate-x-1/2 rounded-full bg-background px-1.5 font-mono text-[9px] tracking-wider uppercase",

                  isActive
                    ? "text-primary"
                    : isCleared
                      ? "text-success"
                      : "text-muted-foreground",
                )}
              >
                {radiusLabel(
                  RADIUS_SEQUENCE[
                  index
                  ],
                )}
              </span>

              {isActive ? (
                <span className="absolute inset-0 rounded-full border border-primary/50 [animation:lifeline-ping_2.4s_ease-out_infinite]" />
              ) : null}
            </div>
          )
        },
      )}

      {/* donor blips */}
      {blips.map(
        (blip) => (
          <span
            key={blip.id}
            title={blip.name}
            className={cn(
              "absolute size-2 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2",

              blip.inRange
                ? "bg-success ring-success/25"
                : "bg-muted-foreground/60 ring-transparent",
            )}
            style={{
              left: `${Number(
                blip.left,
              ).toFixed(2)}%`,

              top: `${Number(
                blip.top,
              ).toFixed(2)}%`,
            }}
          />
        ),
      )}

      {/* epicentre */}
      <div className="absolute top-1/2 left-1/2 flex size-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg">
        <HeartPulseIcon className="size-5" />
      </div>
    </div>
  )
}