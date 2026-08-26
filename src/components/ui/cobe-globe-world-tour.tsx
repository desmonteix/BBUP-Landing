"use client"

import { useEffect, useRef, useState, useMemo } from "react"
import createGlobe from "cobe"
import { useReducedMotion } from "framer-motion"

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
  stopDuration?: number
  destinationDuration?: number
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

function locationToAngles(lat: number, lng: number): [number, number] {
  return [
    Math.PI - ((lng * Math.PI) / 180 - Math.PI / 2),
    (lat * Math.PI) / 180,
  ]
}

/**
 * Signature Home hero visual (added per coordinator direction, supersedes
 * the earlier static hero photo — "Crossing Paths" remains as the
 * section-divider motif, but this globe is now the first thing a visitor
 * sees). A rotating globe that tours a handful of countries exchange
 * students come from and always lands on, and lingers longest on, Peru —
 * a literal visualization of the org's mission instead of a stock photo.
 *
 * // VERIFICAR / adaptation note: the coordinator-supplied source used an
 * // `onRender` callback option on `createGlobe`, which is real in cobe
 * // 0.6.x's API but does NOT exist in cobe 2.x (the current published
 * // version, installed here, which added `arcs`/`markerElevation`
 * // instead — no single published cobe version has both). Verified
 * // directly against node_modules/cobe/dist/index.d.ts for 2.0.1: no
 * // `onRender` field. Rather than drop the flight-path arcs (the nicest
 * // part of the "world tour" visual) or silently downgrade to 0.6.x,
 * // this drives the exact same phi/theta easing manually via
 * // requestAnimationFrame + `globe.update()` (2.x's actual per-frame
 * // API) instead of relying on a callback the library invokes itself.
 * // Visual behavior is identical to the original onRender version.
 *
 * Accessibility: under `prefers-reduced-motion`, the auto-touring stops
 * entirely and the globe freezes on Peru rather than continuously cycling
 * — see the `prefersReducedMotion` branches below. The globe still
 * renders (a WebGL canvas needs a render loop to draw at all), but
 * nothing visibly moves once the camera reaches Peru, so there's no
 * perceived animation.
 */
export function GlobeWorldTour({
  stops = defaultStops,
  destination = defaultDestination,
  className = "",
  stopDuration = 2200,
  destinationDuration = 4500,
}: GlobeWorldTourProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const phiRef = useRef(0)
  const thetaRef = useRef(0.2)
  const targetPhiRef = useRef(0)
  const targetThetaRef = useRef(0.2)
  const prefersReducedMotion = useReducedMotion()

  const itinerary = useMemo(() => [...stops, destination], [stops, destination])
  const destinationIndex = itinerary.length - 1

  const [stepIndex, setStepIndex] = useState(
    prefersReducedMotion ? destinationIndex : 0
  )
  const currentStop = itinerary[stepIndex % itinerary.length] ?? destination
  const isDestination = currentStop.id === destination.id

  useEffect(() => {
    // Reduced motion: land on Peru once and stop — no touring loop at all.
    if (prefersReducedMotion) return

    const delay = isDestination ? destinationDuration : stopDuration
    const timeout = setTimeout(() => {
      setStepIndex((i) => (i + 1) % itinerary.length)
    }, delay)
    return () => clearTimeout(timeout)
  }, [stepIndex, isDestination, destinationDuration, stopDuration, itinerary.length, prefersReducedMotion])

  useEffect(() => {
    const [phi, theta] = locationToAngles(currentStop.location[0], currentStop.location[1])
    targetPhiRef.current = phi
    targetThetaRef.current = theta
    // Reduced motion: snap the camera straight to Peru instead of easing
    // toward it frame by frame, so there's no perceptible motion at all.
    if (prefersReducedMotion) {
      phiRef.current = phi
      thetaRef.current = theta
    }
  }, [currentStop, prefersReducedMotion])

  const markers = useMemo(
    () =>
      itinerary.map((stop) => ({
        location: stop.location,
        size: stop.id === destination.id ? 0.09 : 0.05,
      })),
    [itinerary, destination.id]
  )

  const arcs = useMemo(() => {
    const result: { start: [number, number]; end: [number, number]; color: [number, number, number] }[] = []
    for (let i = 0; i < itinerary.length - 1; i++) {
      const stop = itinerary[i]
      const next = itinerary[i + 1]
      if (!stop || !next) continue
      result.push({
        start: stop.location,
        end: next.location,
        color:
          next.id === destination.id
            ? ([0.86, 0.15, 0.15] as [number, number, number])
            : ([0, 0, 0] as [number, number, number]),
      })
    }
    return result
  }, [itinerary, destination.id])

  useEffect(() => {
    if (!canvasRef.current) return
    const canvas = canvasRef.current
    let globe: ReturnType<typeof createGlobe> | null = null
    let raf = 0

    function frame() {
      if (globe) {
        const ease = prefersReducedMotion ? 1 : 0.04
        phiRef.current += (targetPhiRef.current - phiRef.current) * ease
        thetaRef.current += (targetThetaRef.current - thetaRef.current) * ease
        globe.update({ phi: phiRef.current, theta: thetaRef.current })
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
        phi: phiRef.current,
        theta: thetaRef.current,
        dark: 0,
        diffuse: 1.5,
        mapSamples: 16000,
        mapBrightness: 10,
        baseColor: [1, 1, 1],
        markerColor: [0.13, 0.13, 0.13],
        glowColor: [0.94, 0.93, 0.91],
        markerElevation: 0.02,
        markers,
        arcs: arcs.map((arc) => ({ from: arc.start, to: arc.end, color: arc.color })),
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
  }, [markers, arcs, prefersReducedMotion])

  return (
    <div className={`relative aspect-square select-none ${className}`}>
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
            isDestination ? "bg-red-600 text-white" : "bg-black/85 text-white"
          }`}
        >
          <span className="text-base leading-none">{currentStop.flag}</span>
          <span>{isDestination ? `${currentStop.name} — final destination` : currentStop.name}</span>
        </div>
      </div>
      {!prefersReducedMotion && (
        <div className="pointer-events-none absolute inset-x-0 top-3 flex justify-center gap-1.5">
          {itinerary.map((stop, i) => (
            <span
              key={stop.id}
              className={`h-1.5 rounded-full transition-all duration-500 ${
                i === stepIndex % itinerary.length
                  ? stop.id === destination.id
                    ? "w-4 bg-red-600"
                    : "w-4 bg-black"
                  : "w-1.5 bg-black/20"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  )
}
