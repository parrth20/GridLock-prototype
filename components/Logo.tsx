import type { SVGProps } from "react";
import Link from "next/link";

/**
 * ClearLane logomark — an abstract junction: two cleared lanes (cyan) opening
 * through stalled cross-traffic (slate), with a forward chevron. Pure SVG,
 * inherits sizing, no external assets.
 */
export function LogoMark({ size = 32, ...props }: SVGProps<SVGSVGElement> & { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      {...props}
    >
      <defs>
        <linearGradient id="cl-logo-grad" x1="6" y1="6" x2="34" y2="34" gradientUnits="userSpaceOnUse">
          <stop stopColor="#34e3f2" />
          <stop offset="1" stopColor="#22d3ee" />
        </linearGradient>
      </defs>
      <rect x="1.5" y="1.5" width="37" height="37" rx="11" fill="#0a0e16" stroke="#1d2738" strokeWidth="1.5" />
      {/* stalled cross traffic */}
      <rect x="8" y="18" width="5" height="4" rx="1" fill="#33405a" />
      <rect x="27" y="18" width="5" height="4" rx="1" fill="#33405a" />
      {/* cleared lane chevrons opening forward */}
      <path d="M13 28 L20 13 L27 28" stroke="url(#cl-logo-grad)" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M16.5 28 L20 20.5 L23.5 28" stroke="#0a0e16" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="20" cy="11" r="2.1" fill="#34e3f2" />
    </svg>
  );
}

export function Logo({
  size = 32,
  className = "",
  showWord = true,
  href,
}: {
  size?: number;
  className?: string;
  showWord?: boolean;
  /** When provided, the logo becomes a link (e.g. "/" to go home). */
  href?: string;
}) {
  const inner = (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <LogoMark size={size} />
      {showWord && (
        <span className="text-lg font-extrabold tracking-tight text-white">
          Clear<span className="text-cyan-300">Lane</span>
        </span>
      )}
    </span>
  );

  if (href) {
    return (
      <Link href={href} aria-label="ClearLane home" className="inline-flex rounded-lg transition hover:opacity-80">
        {inner}
      </Link>
    );
  }
  return inner;
}
