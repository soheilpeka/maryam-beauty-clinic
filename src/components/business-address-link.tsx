import { BUSINESS } from "@/lib/content/business";

export function BusinessAddressLink({ className = "" }: { className?: string }) {
  return (
    <a
      href={BUSINESS.mapsHref}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`${BUSINESS.address} — Google Maps`}
      className={`transition-colors hover:text-brand hover:underline hover:underline-offset-4 ${className}`.trim()}
    >
      {BUSINESS.address}<span className="ml-1 inline-block align-top text-[.48em] opacity-70" aria-hidden="true">↗</span>
    </a>
  );
}
