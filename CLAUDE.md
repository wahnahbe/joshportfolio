# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # Start dev server at localhost:3000
npm run build     # Production build — MUST pass with zero TypeScript + lint errors
npm run lint      # ESLint check
npm test          # Vitest (unit + component smoke tests)
```

Run `npm run build` after every component change. Zero errors is the gate — a task is not done until the build is clean.

## Architecture

**Wahnahbe** is a single-column typed-feed builder/creator hub for Joshua Gutierrez. Next.js 16 App Router, TypeScript, Tailwind v4, Lenis smooth scroll + GSAP ScrollTrigger (driven from one shared ticker in `lib/lenis.tsx`).

### Pages

| Route | File | Description |
|-------|------|-------------|
| `/` | `app/page.tsx` | `<CityHero>` over `<Feed>` |
| `/about` | `app/about/page.tsx` | Bio, arc timeline, resume link |
| `/p/[slug]` | `app/p/[slug]/page.tsx` | Project case study (MDX) |

### Hero — `components/hero/`

`<CityHero>` (`CityHero.tsx`) is a thin **swap boundary**: it renders `<CityDescent>` today and can be swapped for an R3F/Three.js renderer later without touching callers.

**`<CityDescent>`** (`CityDescent.tsx`) is a scroll-driven canvas descent through Neo-Tokyo:

- GSAP ScrollTrigger **pins** the hero (`PIN_LENGTH` 3200px runway, `scrub: 0.5`), synced to Lenis via the shared `gsap.ticker` in `lib/lenis.tsx`. Scroll progress maps to a frame index drawn onto a `<canvas>` (decorative, `aria-hidden`; DPR capped at 2; cover-fit math).
- **Two committed frame sets** (counts/dimensions are constants in `CityDescent.tsx`): desktop `/frames/desktop/f-001..240.webp` (1600×900) and mobile `/frames/mobile/f-001..150.webp` (760×1351), chosen at a 768px breakpoint.
- **Preload:** frame 1 is `<link rel="preload">`-hoisted from SSR (media-gated per breakpoint, `fetchPriority` high) so the canvas paints before hydration; then every 8th frame (coarse coverage) and the first quarter of the sequence (`EAGER_HEAD`) load up front; the remaining fill is requested (nearest-to-current-frame first) only once the visitor scrolls into the descent — held for 400ms on a hash load so the browser's own fragment scroll doesn't count — and `nearestLoaded()` draws the closest decoded frame meanwhile. Unmount aborts in-flight frame requests. `/frames/*` is served with a one-day `Cache-Control` (`next.config.ts`) — after regenerating frames, expect up to a day of cached old frames for returning visitors.
- **Reduced motion:** no pin, no scrub — frame 0 drawn statically, and it is the only frame fetched.
- **District cards** (`CARDS`) swap by scroll progress and are positioned over the clip's corner watermark (`wm` coords, normalized frame space) so it stays covered at any viewport. The HUD (`HeroHud.tsx` — h1 wordmark, name + role line, building pill, socials) fades out over the first 15% of the descent and is set to `display: none` once fully faded (so its links aren't clickable while invisible). A `/#feed` hash is re-applied after the pin mounts, since the pin spacer moves the target.
- **Overlays:** `HeroOverlays` (`heroLayers.tsx`) paints the legibility vignette, `CameraGrid` (`heroFx.tsx`), faint scanlines, and the bottom fade into `--bg`.

**Regenerating frames:** the source clips are gitignored (`/public/*.mp4`, `/public/*.png` — they exist only on the local machine; back them up). Recipe (desktop; mobile is the same with the portrait clip and `scale=760:-2`):

```bash
ffmpeg -i public/<clip>.mp4 -vf "scale=1600:-2" -c:v libwebp -quality 72 -compression_level 6 -preset picture public/frames/desktop/f-%03d.webp
```

Then update `count`, `fw`/`fh`, and the `wm` watermark coords in `CityDescent.tsx` to match the new output. (The clip's generator watermark is never removed from footage — the district card parks over it.)

### Feed + Post taxonomy — `components/feed/`

The feed renders a reverse-chronological list of typed posts. Every post is one MDX file in `content/feed/`. Post types:

| Type | Schema | Card |
|------|--------|------|
| `build` / `ship` | `buildSchema` | `BuildCard` |
| `video` | `videoSchema` | `VideoCard` |
| `post` | `igSchema` | `PostCard` |
| `log` | `logSchema` | `LogCard` |

**Adding a post:** create `content/feed/YYYY-MM-DD-slug.mdx` with Zod-validated frontmatter (see `lib/posts/schema.ts`). The loader (`lib/posts/load.ts`) reads all `.mdx` files in `content/feed/`, validates frontmatter, sorts newest-first, and returns `Post[]`. No config or registration needed.

**Project case studies:** live in `content/projects/*.mdx` and are rendered at `/p/[slug]` via `lib/projects/load.ts`.

### HUD primitives — `components/hud/`

- `TopBar` — site name + kana + nav links (`feed` → `/#feed`, about, résumé, gh; kana hides below 339px and `gh` below 374px so the bar stays one row)
- `FeedLink` — the client `feed` link: on `/` it scrolls to `#feed` directly (a repeat router navigation to the same hash is a no-op), elsewhere it navigates to `/#feed`
- `SiteFooter` — name, email, résumé, GitHub; rendered on every page from `app/layout.tsx`
- `CornerFrame` — decorative corner-bracket wrapper (used in `/about`)
- `TypeTag` — color-coded badge per post type

### Data

- `lib/site.ts` — `site` object (name, person + role, socials, resume URL) and `about` object (bio + arc)
- `lib/posts/schema.ts` — Zod schemas + `Post` type (source of truth for types)
- `lib/posts/load.ts` — server-only MDX loader (`import "server-only"`); throws with the filename on invalid frontmatter
- `lib/posts/filter.ts` — filter chips logic (`Feed` only renders chips for post types that have at least one post)
- `lib/posts/relativeTime.ts` — date → human label (client-only: `PostRow` prerenders `YYYY-MM` and swaps in the relative label after hydration, because the page is static)
- `lib/projects/schema.ts` — Zod `projectSchema` + `ProjectMeta`/`Project` types
- `lib/projects/load.ts` — server-only case-study loader; validates like the posts loader, `null` for a missing slug
- `lib/lenis.tsx` — `LenisProvider` client component; wraps app in `app/layout.tsx`; drives Lenis from `gsap.ticker` (only while a wheel scroll is in flight — the tick removes itself when Lenis settles) and registers ScrollTrigger so hero scrub and smooth scroll share one clock; under `prefers-reduced-motion` Lenis is not created and scrolling is native

## Design Tokens

All tokens are CSS variables defined in `app/globals.css` and exposed as Tailwind color utilities via `@theme inline`. **Always use tokens — never hardcode hex values.**

| Token | Value | Usage |
|-------|-------|-------|
| `--bg` | `#05080a` | Page background |
| `--surface` | `#0a0e12` | Card fills |
| `--surface-2` | `#0c1316` | Deeper card / video placeholder |
| `--accent` | `#19e6ff` | Cyan highlight, borders, tag-build color |
| `--accent-2` | `#ffb020` | Amber accent, tag-video color |
| `--text` | `#eafcff` | Primary text |
| `--text-muted` | `#6c8a90` | Secondary / label text |
| `--line` | `rgba(25,230,255,0.20)` | Subtle cyan borders |
| `--tag-build` | `#19e6ff` | TypeTag: build |
| `--tag-ship` | `#21e6c4` | TypeTag: ship |
| `--tag-video` | `#ffb020` | TypeTag: video |
| `--tag-post` | `#7fdfff` | TypeTag: post |
| `--tag-log` | `#6c8a90` | TypeTag: log |

**Fonts:** Inter (`--font-inter`, `font-sans`) and JetBrains Mono (`--font-jetbrains`, `font-mono`) — loaded via `next/font/google` in `app/layout.tsx`.

## Testing

Vitest + Testing Library (jsdom). Tests live in `test/`. Run with `npm test`.

- `test/posts/` — schema, loader (incl. invalid-frontmatter throw via `test/fixtures/feed-*`), filter, relativeTime, and `content-assets.test.ts` (every content image path must resolve under `public/` — guards against referencing gitignored local media)
- `test/projects/` — projectSchema + case-study loader (fixtures in `test/fixtures/projects-*`)
- `test/feed/` — card smoke tests, FilterChips `aria-pressed` + onChange, and Feed filter integration
- `test/hero/` — HeroHud (h1 wordmark, safe external links). `CityDescent` itself is canvas/GSAP and is **not** jsdom-testable — verify it in the browser.
- `test/smoke.test.ts` — harness sanity check

Mock for `server-only`: `test/__mocks__/server-only.ts` (no-op, re-aliased in `vitest.config.ts`).
