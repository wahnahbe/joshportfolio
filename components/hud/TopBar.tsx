import Link from "next/link"
import { site } from "@/lib/site"
import { FeedLink } from "@/components/hud/FeedLink"

export function TopBar() {
  return (
    <header className="fixed top-0 inset-x-0 z-50 border-b border-line bg-bg/70 backdrop-blur">
      <nav className="mx-auto max-w-3xl flex items-center justify-between px-5 py-3 font-mono text-sm">
        <Link href="/" className="font-bold tracking-wide text-text">
          WAHNAHBE <span className="text-accent-2 text-xs align-middle max-[339px]:hidden">{site.kana}</span>
        </Link>
        <div className="flex items-center gap-4 text-text-muted">
          <FeedLink className="hover:text-accent transition-colors" />
          <Link href="/about" className="hover:text-accent transition-colors">about</Link>
          <a href={site.resume} target="_blank" rel="noopener noreferrer" className="hover:text-accent transition-colors">résumé</a>
          <a href={site.socials.github} target="_blank" rel="noopener noreferrer" className="hover:text-accent transition-colors max-[374px]:hidden">gh</a>
        </div>
      </nav>
    </header>
  )
}
