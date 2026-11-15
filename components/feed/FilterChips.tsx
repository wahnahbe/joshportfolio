"use client"
import { FILTERS, type Filter } from "@/lib/posts/filter"

export function FilterChips({
  active,
  onChange,
  filters = FILTERS,
}: {
  active: Filter
  onChange: (f: Filter) => void
  filters?: readonly Filter[]
}) {
  return (
    <div className="mb-8 flex flex-wrap gap-2">
      {filters.map((f) => (
        <button key={f} onClick={() => onChange(f)} aria-pressed={active === f}
          className={`rounded border px-3 py-1 font-mono text-xs transition-colors ${
            active === f ? "border-accent text-accent" : "border-line text-text-muted hover:text-text"
          }`}
          style={active === f ? { boxShadow: "inset 0 0 12px var(--glow-cyan)" } : undefined}>
          {f}
        </button>
      ))}
    </div>
  )
}
