"use client"
import Lenis from "@studio-freight/lenis"
import { useEffect } from "react"
import gsap from "gsap"
import ScrollTrigger from "gsap/ScrollTrigger"

gsap.registerPlugin(ScrollTrigger)

declare global {
  interface Window {
    lenis?: Lenis
  }
}

export function LenisProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Reduced motion: leave scrolling native (no smoothing, no ticker).
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return

    const lenis = new Lenis({
      // Lerp mode: frame-based, accumulates flicks naturally (no tween reset).
      // 0.15 = 15% toward target per frame → immediate response, ~400ms settle.
      lerp: 0.15,
      wheelMultiplier: 1.3,
      smoothWheel: true,
      syncTouch: false,
      normalizeWheel: true,
    } as ConstructorParameters<typeof Lenis>[0])
    window.lenis = lenis

    // Drive Lenis from GSAP's ticker so ScrollTrigger scrub stays in sync — but
    // only while a smooth scroll is in flight. Wheel input is the one thing Lenis
    // animates here (touch is native), so a wheel event starts the tick and the
    // tick removes itself once Lenis settles. Idle pages run no per-frame work.
    lenis.on("scroll", ScrollTrigger.update)
    let ticking = false
    let lastWheel = 0
    const tick = () => {
      lenis.raf(performance.now())
      // Grace period: GSAP can run the first tick synchronously (waking a sleeping
      // ticker), i.e. before Lenis has seen the wheel event and begun scrolling.
      if (!lenis.isScrolling && performance.now() - lastWheel > 150) {
        ticking = false
        gsap.ticker.remove(tick)
      }
    }
    const wake = () => {
      lastWheel = performance.now()
      if (ticking) return
      ticking = true
      // Reset Lenis's clock first, or the idle gap would count as one huge frame
      // and the first wheel tick would snap instead of ease.
      lenis.raf(performance.now())
      gsap.ticker.add(tick)
    }
    // Capture phase, so this runs before Lenis's own wheel handler on window.
    window.addEventListener("wheel", wake, { capture: true, passive: true })
    gsap.ticker.lagSmoothing(0)

    return () => {
      window.removeEventListener("wheel", wake, { capture: true })
      gsap.ticker.remove(tick)
      gsap.ticker.lagSmoothing(500, 33) // GSAP's defaults
      lenis.destroy()
      window.lenis = undefined
    }
  }, [])
  return <>{children}</>
}
