"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import createGlobe, { type Globe } from "cobe"
import { motion, useReducedMotion } from "framer-motion"

interface TourStop {
  id: string
  name: string
  location: [number, number]
  flag: string
}

interface GlobeWorldTourProps {
  stops?: TourStop[]
  destination?: TourStop
  className?: string
  /** Total time for the continuous sweep through every stop, ending at
   * the destination — NOT a per-stop dwell time (there is no per-stop
   * dwell; see the module doc comment). */
  tourDurationMs?: number
}

const defaultStops: TourStop[] = [
  { id: "germany", name: "Germany", location: [52.52, 13.405], flag: "🇩🇪" },
  { id: "netherlands", name: "Netherlands", location: [52.3676, 4.9041], flag: "🇳🇱" },
  { id: "spain", name: "Spain", location: [40.4168, -3.7038], flag: "🇪🇸" },
  { id: "england", name: "England", location: [51.5074, -0.1278], flag: "🇬🇧" },
  { id: "china", name: "China", location: [39.9042, 116.4074], flag: "🇨🇳" },
  { id: "switzerland", name: "Switzerland", location: [46.948, 7.4474], flag: "🇨🇭" },
  { id: "japan", name: "Japan", location: [35.6762, 139.6503], flag: "🇯🇵" },
  { id: "australia", name: "Australia", location: [-35.2809, 149.13], flag: "🇦🇺" },
  { id: "united-states", name: "United States", location: [38.9072, -77.0369], flag: "🇺🇸" },
  { id: "colombia", name: "Colombia", location: [4.711, -74.0721], flag: "🇨🇴" },
  { id: "sweden", name: "Sweden", location: [59.3293, 18.0686], flag: "🇸🇪" },
  { id: "norway", name: "Norway", location: [59.9139, 10.7522], flag: "🇳🇴" },
  { id: "russia", name: "Russia", location: [55.7558, 37.6173], flag: "🇷🇺" },
]

const defaultDestination: TourStop = {
  id: "peru",
  name: "Peru",
  location: [-12.0464, -77.0428],
  flag: "🇵🇪",
}

/** Radians of idle auto-rotation per millisecond once parked on Peru — a
 * full lap takes ~100s, deliberately barely-perceptible ("very slow idle
 * rotation," not a second tour). */
const IDLE_DRIFT_RAD_PER_MS = (Math.PI * 2) / 100_000

/** The final "into Peru" leg is deliberately allocated more of the total
 * duration than its raw angular distance alone would give it (see
 * `buildFlightPath`), and is the only leg that eases instead of moving at
 * the sweep's constant speed — the one deliberate deceleration/landing in
 * an otherwise unbroken pass. */
const LANDING_LEG_WEIGHT_MULTIPLIER = 2.4

function locationToAngles(lat: number, lng: number): [number, number] {
  return [
    Math.PI - ((lng * Math.PI) / 180 - Math.PI / 2),
    (lat * Math.PI) / 180,
  ]
}

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3)
}

interface FlightLeg {
  fromPhi: number
  fromTheta: number
  toPhi: number
  toTheta: number
  /** Share of tourDurationMs this leg consumes. */
  durationMs: number
  /** Cumulative ms at which this leg ends. */
  endsAtMs: number
  eased: boolean
}

/**
 * Builds one continuous flight path through every waypoint, phi-unwrapped
 * so each leg always takes the visually-shortest turn (never spins the
 * long way around), with per-leg duration allocated proportional to
 * angular distance so the camera holds a roughly constant angular speed
 * across the whole sweep — the thing that makes it read as one continuous
 * pass instead of a series of stops. Only the final leg (into the
 * destination) is weighted longer and eased, for the one deliberate
 * landing deceleration.
 */
function buildFlightPath(itinerary: TourStop[], tourDurationMs: number): FlightLeg[] {
  const angles = itinerary.map((s) => locationToAngles(s.location[0], s.location[1]))

  // Unwrap phi so consecutive legs never jump more than half a turn.
  const unwrapped: [number, number][] = []
  let prevPhi: number | null = null
  for (const [phi, theta] of angles) {
    let p = phi
    if (prevPhi !== null) {
      while (p - prevPhi > Math.PI) p -= Math.PI * 2
      while (p - prevPhi < -Math.PI) p += Math.PI * 2
    }
    unwrapped.push([p, theta])
    prevPhi = p
  }

  const rawLegs: { fromPhi: number; fromTheta: number; toPhi: number; toTheta: number; weight: number }[] = []
  for (let i = 0; i < unwrapped.length - 1; i++) {
    const from = unwrapped[i]
    const to = unwrapped[i + 1]
    if (!from || !to) continue
    const dPhi = to[0] - from[0]
    const dTheta = to[1] - from[1]
    const isLandingLeg = i === unwrapped.length - 2
    const distance = Math.sqrt(dPhi * dPhi + dTheta * dTheta) || 0.05
    rawLegs.push({
      fromPhi: from[0],
      fromTheta: from[1],
      toPhi: to[0],
      toTheta: to[1],
      weight: isLandingLeg ? distance * LANDING_LEG_WEIGHT_MULTIPLIER : distance,
    })
  }

  const totalWeight = rawLegs.reduce((sum, leg) => sum + leg.weight, 0) || 1
  let cumulative = 0
  return rawLegs.map((leg, i) => {
    const durationMs = (leg.weight / totalWeight) * tourDurationMs
    cumulative += durationMs
    return {
      fromPhi: leg.fromPhi,
      fromTheta: leg.fromTheta,
      toPhi: leg.toPhi,
      toTheta: leg.toTheta,
      durationMs,
      endsAtMs: cumulative,
      eased: i === rawLegs.length - 1,
    }
  })
}

/**
 * Signature Home hero visual: a full-bleed globe that makes one continuous
 * ~5-second flight through a handful of countries exchange students come
 * from, then lands on and stays parked on Peru (highlighted red) — a
 * literal visualization of the org's mission instead of a stock photo.
 *
 * Motion design (per explicit direction — this is NOT a "hold on country
 * A, jump to B, hold, jump to C" slideshow): the camera moves continuously
 * for the whole pass, computed directly from elapsed wall-clock time
 * against a precomputed flight path (`buildFlightPath`) rather than
 * chasing a per-stop target with frame-count-based easing — the latter
 * either never visually arrives within a short dwell or, if sped up
 * enough to arrive, still reads as discrete hops between rests. A single
 * continuous parametric path has no such rest points by construction; the
 * only deliberate deceleration is the final leg into Peru.
 *
 * // VERIFICAR / adaptation note: the originally-referenced source used an
 * // `onRender` callback option on `createGlobe`, which is real in cobe
 * // 0.6.x's API but does NOT exist in cobe 2.x (the current published
 * // version, installed here — verified directly against
 * // node_modules/cobe/dist/index.d.ts). This drives the camera by calling
 * // the real 2.x per-frame API, `globe.update()`, from its own
 * // requestAnimationFrame loop instead.
 *
 * Marker color: cobe 2.x's `Marker.color` is a real documented per-marker
 * override (confirmed in the same type file) — used directly to render
 * Peru's marker in red without needing a DOM-overlay fallback.
 *
 * Accessibility: under `prefers-reduced-motion`, the flight never plays —
 * the globe starts parked on Peru already (see `initialArrived`). The
 * brief arrival zoom (see `arrived`) still plays once even in that case,
 * since it's a small purposeful transition rather than a distracting
 * loop; there is no idle auto-rotation under reduced motion either.
 */
export function GlobeWorldTour({
  stops = defaultStops,
  destination = defaultDestination,
  className = "",
  tourDurationMs = 5000,
}: GlobeWorldTourProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const prefersReducedMotion = useReducedMotion()

  const itinerary = useMemo(() => [...stops, destination], [stops, destination])
  const flightPath = useMemo(
    () => buildFlightPath(itinerary, tourDurationMs),
    [itinerary, tourDurationMs]
  )
  const finalLeg = flightPath[flightPath.length - 1]

  const [displayIndex, setDisplayIndex] = useState(prefersReducedMotion ? itinerary.length - 1 : 0)
  const [arrived, setArrived] = useState(prefersReducedMotion ?? false)

  // `useReducedMotion()` resolves to null on the very first client render
  // (matchMedia isn't readable until mount) and only becomes true/false a
  // moment later — this catches that case so a user with the preference
  // set doesn't briefly see the tour start before the corrective render.
  useEffect(() => {
    if (prefersReducedMotion) {
      setDisplayIndex(itinerary.length - 1)
      setArrived(true)
    }
  }, [prefersReducedMotion, itinerary.length])

  const currentStop = itinerary[displayIndex] ?? destination
  const isDestinationLabel = currentStop.id === destination.id

  const markers = useMemo(
    () =>
      itinerary.map((stop) => ({
        location: stop.location,
        size: stop.id === destination.id ? 0.09 : 0.05,
        // Real per-marker override (cobe 2.x) — Peru renders red, every
        // other stop uses the shared dark markerColor.
        color:
          stop.id === destination.id
            ? ([0.86, 0.15, 0.15] as [number, number, number])
            : ([0.13, 0.13, 0.13] as [number, number, number]),
      })),
    [itinerary, destination.id]
  )

  const arcs = useMemo(() => {
    const result: { from: [number, number]; to: [number, number]; color: [number, number, number] }[] = []
    for (let i = 0; i < itinerary.length - 1; i++) {
      const stop = itinerary[i]
      const next = itinerary[i + 1]
      if (!stop || !next) continue
      result.push({
        from: stop.location,
        to: next.location,
        color:
          next.id === destination.id
            ? ([0.86, 0.15, 0.15] as [number, number, number])
            : ([0, 0, 0] as [number, number, number]),
      })
    }
    return result
  }, [itinerary, destination.id])

  useEffect(() => {
    if (!canvasRef.current || !finalLeg) return
    const canvas = canvasRef.current
    let globe: Globe | null = null
    let raf = 0
    let startTime: number | null = null

    function frame(now: number) {
      if (!globe) {
        raf = requestAnimationFrame(frame)
        return
      }

      if (prefersReducedMotion || !finalLeg) {
        globe.update({ phi: finalLeg?.toPhi ?? 0, theta: finalLeg?.toTheta ?? 0.2 })
        raf = requestAnimationFrame(frame)
        return
      }

      if (startTime === null) startTime = now
      const elapsed = now - startTime

      if (elapsed < tourDurationMs) {
        let legIndex = flightPath.findIndex((leg) => elapsed <= leg.endsAtMs)
        if (legIndex === -1) legIndex = flightPath.length - 1
        const leg = flightPath[legIndex]
        if (leg) {
          const legStart = legIndex === 0 ? 0 : (flightPath[legIndex - 1]?.endsAtMs ?? 0)
          const rawT = leg.durationMs > 0 ? (elapsed - legStart) / leg.durationMs : 1
          const t = Math.min(Math.max(rawT, 0), 1)
          const eased = leg.eased ? easeOutCubic(t) : t
          const phi = leg.fromPhi + (leg.toPhi - leg.fromPhi) * eased
          const theta = leg.fromTheta + (leg.toTheta - leg.fromTheta) * eased
          globe.update({ phi, theta })

          const labelIndex = t < 0.5 ? legIndex : legIndex + 1
          setDisplayIndex((prev) => (prev === labelIndex ? prev : labelIndex))
        }
      } else {
        if (!arrived) setArrived(true)
        const idleElapsed = elapsed - tourDurationMs
        const phi = finalLeg.toPhi + idleElapsed * IDLE_DRIFT_RAD_PER_MS
        globe.update({ phi, theta: finalLeg.toTheta })
      }

      raf = requestAnimationFrame(frame)
    }

    function init() {
      const width = canvas.offsetWidth
      if (width === 0 || globe) return

      globe = createGlobe(canvas, {
        devicePixelRatio: Math.min(window.devicePixelRatio || 1, 2),
        width,
        height: width,
        phi: prefersReducedMotion ? finalLeg!.toPhi : (flightPath[0]?.fromPhi ?? 0),
        theta: prefersReducedMotion ? finalLeg!.toTheta : (flightPath[0]?.fromTheta ?? 0.2),
        dark: 0,
        diffuse: 1.5,
        mapSamples: 16000,
        mapBrightness: 10,
        baseColor: [1, 1, 1],
        markerColor: [0.13, 0.13, 0.13],
        glowColor: [0.94, 0.93, 0.91],
        markerElevation: 0.02,
        markers,
        arcs,
        arcWidth: 0.6,
        arcHeight: 0.25,
        opacity: 0.7,
      })
      raf = requestAnimationFrame(frame)
      setTimeout(() => canvas && (canvas.style.opacity = "1"))
    }

    if (canvas.offsetWidth > 0) {
      init()
    } else {
      const ro = new ResizeObserver((entries) => {
        if (entries[0] && entries[0].contentRect.width > 0) {
          ro.disconnect()
          init()
        }
      })
      ro.observe(canvas)
    }

    return () => {
      cancelAnimationFrame(raf)
      if (globe) globe.destroy()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [markers, arcs, flightPath, finalLeg, tourDurationMs, prefersReducedMotion])

  return (
    <motion.div
      className={`relative select-none ${className}`}
      initial={{ scale: 1 }}
      animate={{ scale: arrived ? 1.06 : 1 }}
      transition={{ duration: 0.65, ease: "easeOut" }}
    >
      <canvas
        ref={canvasRef}
        style={{
          width: "100%",
          height: "100%",
          cursor: "default",
          opacity: 0,
          transition: "opacity 1.2s ease",
        }}
      />
      <div className="pointer-events-none absolute inset-x-0 bottom-4 flex justify-center">
        <div
          className={`flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium shadow-md transition-colors duration-500 ${
            isDestinationLabel ? "bg-red-600 text-white" : "bg-black/85 text-white"
          }`}
        >
          <span className="text-base leading-none">{currentStop.flag}</span>
          <span>{isDestinationLabel ? `${currentStop.name} — final destination` : currentStop.name}</span>
        </div>
      </div>
    </motion.div>
  )
}
