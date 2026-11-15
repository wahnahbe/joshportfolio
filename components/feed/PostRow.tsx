"use client"
import { useSyncExternalStore, type ReactNode } from "react"
import type { Post } from "@/lib/posts/schema"
import { TypeTag } from "@/components/hud/TypeTag"
import { relativeTime } from "@/lib/posts/relativeTime"

const noop = () => () => {}

// The page is statically prerendered, so a relative label baked into the HTML
// ("1d") goes stale and mismatches on hydration. Prerender the stable year-month
// and swap in the relative label once we're on the client.
function PostTime({ date }: { date: string }) {
  const label = useSyncExternalStore(
    noop,
    () => relativeTime(date),
    () => date.slice(0, 7),
  )
  return <time dateTime={date}>{label}</time>
}

export function PostRow({ post, children }: { post: Post; children: ReactNode }) {
  return (
    <li className="grid grid-cols-[56px_1fr] gap-4 border-t border-line py-5 first:border-t-0">
      <div className="text-right">
        <TypeTag type={post.type} />
        <div className="mt-1.5 font-mono text-[10px] text-text-muted">
          <PostTime date={post.date} />
        </div>
      </div>
      <div>{children}</div>
    </li>
  )
}
