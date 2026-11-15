"use client"
import { useEffect, useRef } from "react"
import gsap from "gsap"
import ScrollTrigger from "gsap/ScrollTrigger"
import { HeroHud } from "@/components/hero/HeroHud"
import { HeroOverlays } from "@/components/hero/heroLayers"

gsap.registerPlugin(ScrollTrigger)

// Scroll-driven descent through Neo-Tokyo, rendered as a canvas frame-sequence.
// The clip is pre-extracted to individual WebP frames; on scroll we just draw
// the matching (already-decoded) frame onto a <canvas>. Drawing a decoded image
// is instant, so the scrub is frame-perfect smooth — unlike seeking a <video>,
// which decodes on demand and stutters. ScrollTrigger pins the hero, synced to
// Lenis (lib/lenis.tsx).
//
// Two frame sets: 16:9 desktop (edge-to-edge immersion) and 9:16 mobile.
// `fw`/`fh` are the native frame size (for cover-fit math) and `wm` is the
// generator-watermark center, normalized in frame space — used to park the
// district card over the watermark so it stays covered at any viewport size.
const PIN_LENGTH = 3200
// Share of the sequence fetched up front (the stretch a visitor scrubs through
// first). The rest waits until they actually start descending.
const EAGER_HEAD = 0.25
const DESKTOP = { dir: "/frames/desktop", count: 240, fw: 1600, fh: 900, wm: { x: 0.923, y: 0.861 } }
const MOBILE = { dir: "/frames/mobile", count: 150, fw: 760, fh: 1351, wm: { x: 0.9, y: 0.93 } }

// District title cards, keyed by scroll progress (active = last threshold <= p).
const CARDS = [
  { at: 0.0, label: "ABOVE THE CLOUDS", kana: "雲上 · UNKAI" },
  { at: 0.2, label: "GLASS MILE", kana: "硝子街 · OBSIDIAN-9" },
  { at: 0.5, label: "KUROSHIBUYA", kana: "黒渋谷 · NEON SPINE" },
  { at: 0.8, label: "THE RUST", kana: "上野 UNDER-UENO · 錆" },
]

const cardIndexFor = (p: number): number => {
  let idx = 0
  for (let i = 0; i < CARDS.length; i++) if (p >= CARDS[i].at) idx = i
  return idx
}

export function CityDescent() {
  const root = useRef<HTMLElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  const hud = useRef<HTMLDivElement>(null)
  const cardWrap = useRef<HTMLDivElement>(null)
  const cardText = useRef<HTMLDivElement>(null)
  const cardLabel = useRef<HTMLDivElement>(null)
  const cardKana = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const section = root.current
    const cv = canvas.current
    const hudEl = hud.current
    if (!section || !cv || !hudEl) return
    const ctx = cv.getContext("2d")
    if (!ctx) return

    const set = window.matchMedia("(max-width: 768px)").matches ? MOBILE : DESKTOP
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches

    const images: HTMLImageElement[] = new Array(set.count)
    const loaded: boolean[] = new Array(set.count).fill(false)
    let current = -1
    let disposed = false
    let filled = false
    let cardRaf = 0
    // On a hash load (/#feed) the browser's own fragment scroll crosses the pin
    // while we mount — that is not the visitor descending, so hold the fill
    // until the hash has been re-applied and things have settled.
    const hashId = decodeURIComponent(window.location.hash.slice(1))
    const fillAfter = hashId ? performance.now() + 400 : 0

    const pad = (n: number) => String(n).padStart(3, "0")

    const nearestLoaded = (idx: number): number => {
      if (loaded[idx]) return idx
      for (let d = 1; d < set.count; d++) {
        if (idx - d >= 0 && loaded[idx - d]) return idx - d
        if (idx + d < set.count && loaded[idx + d]) return idx + d
      }
      return -1
    }

    const draw = (idx: number) => {
      const use = nearestLoaded(idx)
      if (use < 0) return
      const img = images[use]
      const cw = cv.width
      const ch = cv.height
      const ir = img.naturalWidth / img.naturalHeight
      const cr = cw / ch
      let dw: number, dh: number, dx: number, dy: number
      if (ir > cr) {
        dh = ch
        dw = ch * ir
        dx = (cw - dw) / 2
        dy = 0
      } else {
        dw = cw
        dh = cw / ir
        dx = 0
        dy = (ch - dh) / 2
      }
      ctx.drawImage(img, dx, dy, dw, dh)
    }

    const sizeCanvas = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      cv.width = Math.round(section.clientWidth * dpr)
      cv.height = Math.round(section.clientHeight * dpr)
    }

    // Park the card over the watermark for the current viewport (cover-fit math
    // in CSS px, so the card box and watermark are in the same coordinate space).
    const placeCard = () => {
      const wrap = cardWrap.current
      if (!wrap) return
      const W = section.clientWidth
      const H = section.clientHeight
      const s = Math.max(W / set.fw, H / set.fh)
      const rw = set.fw * s
      const rh = set.fh * s
      const wmX = (W - rw) / 2 + set.wm.x * rw
      const wmY = (H - rh) / 2 + set.wm.y * rh
      const rect = wrap.getBoundingClientRect()
      const right = Math.max(12, Math.min(W - (wmX + rect.width / 2), W - rect.width - 12))
      const bottom = Math.max(12, Math.min(H - (wmY + rect.height / 2), H - rect.height - 12))
      wrap.style.right = `${Math.round(right)}px`
      wrap.style.bottom = `${Math.round(bottom)}px`
    }

    const load = (i: number) => {
      if (images[i]) return
      const img = new Image()
      img.decoding = "async"
      if (i === 0) img.fetchPriority = "high" // pairs with the <link rel="preload"> below
      img.src = `${set.dir}/f-${pad(i + 1)}.webp`
      img.onload = () => {
        if (disposed) return
        loaded[i] = true
        if (current < 0) {
          current = 0
          draw(0)
        } else if (i === current) {
          draw(current)
        }
      }
      images[i] = img
    }

    // Up front: frame 1, then every 8th frame for coarse coverage (so on slow
    // networks nearestLoaded() degrades to a sparse sequence instead of a blank
    // canvas), then the opening stretch in full. Reduced motion only ever shows
    // frame 1, so that is all it fetches.
    const head = Math.ceil(set.count * EAGER_HEAD)
    load(0)
    if (!reduce) {
      for (let i = 8; i < set.count; i += 8) load(i)
      for (let i = 1; i < head; i++) load(i)
    }
    // The remaining frames, requested once the visitor starts the descent.
    const fill = () => {
      if (filled || disposed) return
      filled = true
      // Nearest to the current frame first — a visitor entering from below
      // (scrolling up out of the feed) needs the end of the sequence, not frame 61.
      const rest: number[] = []
      for (let i = head; i < set.count; i++) rest.push(i)
      rest.sort((a, b) => Math.abs(a - current) - Math.abs(b - current))
      for (const i of rest) load(i)
    }

    // Abort in-flight frame requests and drop their handlers so nothing draws
    // into an unmounted canvas after a route change.
    const dispose = () => {
      disposed = true
      cancelAnimationFrame(cardRaf)
      window.removeEventListener("resize", onResize)
      for (const img of images) {
        if (!img) continue
        img.onload = null
        img.src = ""
      }
    }

    sizeCanvas()
    placeCard()

    const onResize = () => {
      sizeCanvas()
      draw(current < 0 ? 0 : current)
      placeCard()
      ScrollTrigger.refresh()
    }
    window.addEventListener("resize", onResize)

    if (reduce) {
      current = 0
      draw(0)
      return dispose
    }

    let activeCard = -1
    const updateCard = (p: number) => {
      const ci = cardIndexFor(p)
      if (ci === activeCard) return
      activeCard = ci
      if (cardLabel.current) cardLabel.current.textContent = CARDS[ci].label
      if (cardKana.current) cardKana.current.textContent = CARDS[ci].kana
      if (cardText.current) {
        gsap.fromTo(cardText.current, { autoAlpha: 0, x: 12 }, { autoAlpha: 1, x: 0, duration: 0.4, ease: "power2.out" })
      }
      cardRaf = requestAnimationFrame(placeCard) // label width changed → re-center over watermark
    }

    const st = ScrollTrigger.create({
      trigger: section,
      start: "top top",
      end: `+=${PIN_LENGTH}`,
      pin: true,
      scrub: 0.5,
      anticipatePin: 1,
      invalidateOnRefresh: true,
      onUpdate: (self) => {
        const idx = Math.min(set.count - 1, Math.max(0, Math.round(self.progress * (set.count - 1))))
        if (idx !== current) {
          current = idx
          draw(idx)
        }
        // scrollY guard: ScrollTrigger also calls onUpdate with a transient progress
        // while it measures the pin on refresh — that is not the visitor descending.
        if (window.scrollY > 0 && self.progress > 0 && self.progress < 1 && performance.now() > fillAfter) fill()
        updateCard(self.progress)
        // Once (all but) faded, take the HUD out of the tree: its links must not stay
        // clickable/focusable while invisible, and its pulse should stop running.
        const hudOpacity = gsap.utils.clamp(0, 1, 1 - self.progress / 0.15)
        gsap.set(hudEl, { opacity: hudOpacity, yPercent: -self.progress * 12, display: hudOpacity < 0.02 ? "none" : "block" })
      },
    })

    // Arriving on a hash link (/#feed from another page, or a direct load): the pin
    // spacer just pushed the target ~3200px further down, so the browser's own hash
    // scroll landed short. Re-apply it once the pin is in place.
    const hashRaf = hashId
      ? requestAnimationFrame(() => document.getElementById(hashId)?.scrollIntoView({ behavior: "instant" }))
      : 0

    return () => {
      cancelAnimationFrame(hashRaf)
      dispose()
      st.kill()
    }
  }, [])

  return (
    <section ref={root} className="relative h-screen min-h-[560px] w-full overflow-hidden bg-bg">
      {/* React hoists these into <head>; media gates which set downloads, matching
          the 768px breakpoint above — so the first frame paints before hydration. */}
      <link rel="preload" as="image" href="/frames/desktop/f-001.webp" fetchPriority="high" media="(min-width: 769px)" />
      <link rel="preload" as="image" href="/frames/mobile/f-001.webp" fetchPriority="high" media="(max-width: 768px)" />
      <canvas ref={canvas} aria-hidden="true" className="absolute inset-0 h-full w-full" />
      <HeroOverlays />
      <div ref={hud} className="absolute inset-0 z-20">
        <HeroHud />
      </div>

      {/* District card — parked over the clip's corner watermark so it stays covered. */}
      <div ref={cardWrap} className="pointer-events-none absolute z-30 select-none" style={{ right: 24, bottom: 96 }}>
        <div
          className="flex items-stretch gap-3 rounded-md border border-line bg-bg/95 px-4 py-2.5 backdrop-blur-md"
          style={{ boxShadow: "inset 0 0 18px rgba(25,230,255,0.12), 0 6px 24px rgba(5,8,10,0.6)" }}
        >
          <div className="w-px shrink-0 bg-gradient-to-b from-accent via-text to-accent-2 opacity-70" />
          <div ref={cardText} className="font-mono leading-tight">
            <div ref={cardLabel} className="text-sm font-bold tracking-[0.12em] text-text">
              {CARDS[0].label}
            </div>
            <div ref={cardKana} className="mt-0.5 text-[10px] tracking-[0.12em] text-accent/85">
              {CARDS[0].kana}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
