import { site } from "@/lib/site"

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-line">
      <div className="mx-auto flex max-w-3xl flex-wrap items-center gap-x-5 gap-y-2 px-5 py-8 font-mono text-xs text-text-muted">
        <span className="text-text">{site.person}</span>
        <a href={`mailto:${site.socials.email}`} className="hover:text-accent transition-colors">email</a>
        <a href={site.resume} target="_blank" rel="noopener noreferrer" className="hover:text-accent transition-colors">résumé</a>
        <a href={site.socials.github} target="_blank" rel="noopener noreferrer" className="hover:text-accent transition-colors">github</a>
      </div>
    </footer>
  )
}
