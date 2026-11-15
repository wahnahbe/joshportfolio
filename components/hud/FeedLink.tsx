"use client"
import Link from "next/link"

// "feed" in the top bar. From another page this navigates to /#feed. Already on
// the home page, a second router navigation to the same hash does nothing (and
// leaves a stale scroll pending), so scroll to the feed directly instead.
export function FeedLink({ className }: { className?: string }) {
  return (
    <Link
      href="/#feed"
      className={className}
      onClick={(e) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return
        if (window.location.pathname !== "/") return
        e.preventDefault()
        document.getElementById("feed")?.scrollIntoView()
      }}
    >
      feed
    </Link>
  )
}
