import { Link } from "@/i18n/routing";
import type { ReactNode } from "react";

export function EditorialHeading({ eyebrow, title, children }: { eyebrow: string; title: string; children?: ReactNode }) {
  return <header className="editorial-heading"><p className="eyebrow">{eyebrow}</p><h1>{title}</h1>{children && <div className="editorial-lead">{children}</div>}</header>;
}

export function EditorialEmpty({ eyebrow, title, body, href, action, image = false }: { eyebrow: string; title: string; body?: string; href: string; action: string; image?: boolean }) {
  return <section className={`editorial-empty${image ? " editorial-empty-split" : ""}`}>
    <div><p className="eyebrow">{eyebrow}</p><h2>{title}</h2>{body && <p>{body}</p>}<Link href={href} className="editorial-action">{action}<span aria-hidden="true">↗</span></Link></div>
    {image && <img src="/media/salon/salon.webp" alt="" className="editorial-empty-image" />}
  </section>;
}
