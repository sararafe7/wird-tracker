import type { CSSProperties } from "react";
import { useEffect } from "react";
import type { DayTheme } from "@/components/theme";
import { imageUrl } from "@/lib/store";

/**
 * Pieces shared by the screenshot views (the daily table and the weekly card), so both follow
 * the same design: El Messiri, the day's colour theme, drawn icons, and the initiative image's circle.
 */

const FONT_ID = "font-el-messiri";
const FONT_URL =
  "https://fonts.googleapis.com/css2?family=El+Messiri:wght@400;500;600;700&display=swap";

/** El Messiri is only used by the screenshot views, so it loads when one first opens */
export function useShareFont() {
  useEffect(() => {
    if (document.getElementById(FONT_ID)) return;
    const link = document.createElement("link");
    link.id = FONT_ID;
    link.rel = "stylesheet";
    link.href = FONT_URL;
    document.head.append(link);
  }, []);
}

/** The shared "read yesterday" heart, in the day's colour; the outline keeps the white heart visible */
export function Heart({ color, label }: { color: string; label: string }) {
  return (
    <svg viewBox="0 0 24 24" className="h-[17px] w-[17px] shrink-0" role="img" aria-label={label}>
      <path
        d="M12 21s-7.5-4.6-9.6-9.2C1 8.4 3.2 5 6.7 5c2.1 0 3.6 1.1 5.3 3 1.7-1.9 3.2-3 5.3-3 3.5 0 5.7 3.4 4.3 6.8C19.5 16.4 12 21 12 21z"
        fill={color}
        stroke="rgba(0,0,0,0.18)"
        strokeWidth="0.8"
      />
    </svg>
  );
}

/** Kahf: «نور», a golden sun, for the light between the two Fridays */
export function Sun({ label, legend }: { label: string; legend?: boolean }) {
  if (legend) {
    return (
      <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 shrink-0" aria-hidden="true">
        <circle cx="12" cy="12" r="4.5" fill="#F2B533" />
        <g stroke="#E3A21A" strokeWidth="2" strokeLinecap="round">
          <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
        </g>
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" className="mx-auto h-6 w-6" role="img" aria-label={label}>
      <circle cx="12" cy="12" r="11" fill="#FDF0CC" />
      <g stroke="#E3A21A" strokeWidth="1.6" strokeLinecap="round">
        <path d="M12 3.5v2.6M12 17.9v2.6M3.5 12h2.6M17.9 12h2.6M6 6l1.8 1.8M16.2 16.2L18 18M18 6l-1.8 1.8M7.8 16.2L6 18" />
      </g>
      <circle cx="12" cy="12" r="3.6" fill="#F2B533" />
    </svg>
  );
}

/** Mulk: a crescent with a small star, for the night reading */
export function Crescent({ label, legend }: { label: string; legend?: boolean }) {
  if (legend) {
    return (
      <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 shrink-0" aria-hidden="true">
        <path d="M14.6 3.2a9 9 0 1 0 6.2 15.6 7.2 7.2 0 0 1-6.2-15.6z" fill="#5B4FB5" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" className="mx-auto h-6 w-6" role="img" aria-label={label}>
      <circle cx="12" cy="12" r="11" fill="#EAE8F7" />
      <path d="M14.6 5.2a7 7 0 1 0 4.4 12.2 5.6 5.6 0 0 1-4.4-12.2z" fill="#5B4FB5" />
      <path d="M17.6 6.4l.6 1.3 1.3.6-1.3.6-.6 1.3-.6-1.3-1.3-.6 1.3-.6z" fill="#E3A21A" />
    </svg>
  );
}

/**
 * The initiative's image in a circle of the day's tint with a thin white ring (transparent images
 * show the tint through), or straight on the header when the image asks for no circle.
 * An empty space of the same size keeps the title centred.
 */
export function Badge({
  id,
  version,
  plain = false,
}: {
  id: string;
  version: string | null;
  plain?: boolean; // the image straight on the header, same size, nothing cropped (light logos)
}) {
  if (!version) return <span className="h-[66px] w-[66px] shrink-0" aria-hidden="true" />;
  if (plain) {
    return (
      <img
        src={imageUrl(id, version)}
        alt=""
        className="h-[66px] w-[66px] shrink-0 object-contain"
      />
    );
  }
  return (
    <span className="h-[66px] w-[66px] shrink-0 overflow-hidden rounded-full bg-[var(--tint)] ring-1 ring-white/60">
      <img src={imageUrl(id, version)} alt="" className="h-full w-full object-cover" />
    </span>
  );
}

/** The day's colours as CSS variables, plus the font, for the view's outer element */
export function shareStyle(day: DayTheme): CSSProperties {
  return {
    "--deep": day.deep,
    "--tint": day.tint,
    "--page": day.page,
    "--line": day.line,
    fontFamily: "'El Messiri', sans-serif",
  } as CSSProperties;
}

export const shareNavButton =
  "rounded-full border border-[var(--line)] bg-white text-[var(--deep)]";

/** A full week: a golden star on the same pale-gold circle as the Kahf sun */
export function Star({ className = "h-6 w-6", label }: { className?: string; label?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      <circle cx="12" cy="12" r="11" fill="#FDF0CC" />
      <path
        d="M12 5.4l1.76 4.57 4.9.27-3.81 3.09 1.26 4.73L12 15.4l-4.11 2.66 1.26-4.73-3.81-3.09 4.9-.27z"
        fill="#F2B533"
        stroke="#E3A21A"
        strokeWidth="0.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** A four-point golden sparkle, to celebrate beside a title */
export function Sparkle({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path
        d="M12 2.5c.7 4.6 2.3 6.2 7 7-4.7.8-6.3 2.4-7 7-.7-4.6-2.3-6.2-7-7 4.7-.8 6.3-2.4 7-7z"
        fill="#F5C542"
        stroke="#E3A21A"
        strokeWidth="0.8"
        strokeLinejoin="round"
      />
      <path
        d="M19 15.5c.3 1.7.9 2.3 2.5 2.5-1.6.3-2.2.9-2.5 2.5-.3-1.6-.9-2.2-2.5-2.5 1.6-.2 2.2-.8 2.5-2.5z"
        fill="#F5C542"
      />
    </svg>
  );
}
