import type { Audience } from "@/lib/store";

/**
 * Look of the screenshot views (group table, weekly card) per group audience.
 * Class names are written out in full so Tailwind can find them.
 */
export interface ShareTheme {
  page: string;
  frame: string; // card border
  rule: string; // row dividers
  header: string; // title band
  headerText: string;
  subhead: string; // column header row
  accent: string; // numbers and secondary text
  stripe: string; // alternate rows
  navBg: string;
  button: string; // bottom navigation buttons
  chip: string; // day count badge
  highlight: string; // 7/7 rows
  check: string; // Kahf / Mulk read, in the table: a ✓ in a filled circle
  markOn: string; // Kahf / Mulk toggle when ticked, on the group page
  markHint: string; // Kahf toggle on Fridays before it is ticked
  hearts: string[]; // "read yesterday": everyone shares one heart, its colour set by the date
  weekEmoji: string;
}

export const SHARE_THEMES: Record<Audience, ShareTheme> = {
  girls: {
    page: "bg-pink-50",
    frame: "border-pink-200",
    rule: "border-pink-100",
    header: "bg-pink-200",
    headerText: "text-pink-900",
    subhead: "bg-pink-100 text-pink-900 border-pink-200",
    accent: "text-pink-800",
    stripe: "bg-pink-50/70",
    navBg: "bg-pink-50/95",
    button: "border-pink-200 text-pink-800",
    chip: "bg-pink-100 text-pink-900",
    highlight: "border-pink-300 bg-pink-50",
    check: "bg-pink-500 text-white",
    markOn: "border-pink-300 bg-pink-100 text-pink-800",
    markHint: "border-pink-200 text-pink-700",
    hearts: ["💙", "❤️", "🤍", "💚", "💛", "💜", "🧡", "🩷"],
    weekEmoji: "🌸",
  },
  boys: {
    page: "bg-sky-50",
    frame: "border-sky-200",
    rule: "border-sky-100",
    header: "bg-sky-200",
    headerText: "text-sky-900",
    subhead: "bg-sky-100 text-sky-900 border-sky-200",
    accent: "text-sky-800",
    stripe: "bg-sky-50/70",
    navBg: "bg-sky-50/95",
    button: "border-sky-200 text-sky-800",
    chip: "bg-sky-100 text-sky-900",
    highlight: "border-sky-300 bg-sky-50",
    check: "bg-sky-600 text-white",
    markOn: "border-sky-300 bg-sky-100 text-sky-800",
    markHint: "border-sky-200 text-sky-700",
    hearts: ["💙", "💚", "🤍", "💛", "🧡", "💜"],
    weekEmoji: "🌟",
  },
};

/** The heart for everyone who read on this date: the same colour all day, the next colour the next day */
export function readHeart(theme: ShareTheme, date: string): string {
  const day = Math.round(Date.parse(`${date}T00:00:00Z`) / 86_400_000);
  return theme.hearts[((day % theme.hearts.length) + theme.hearts.length) % theme.hearts.length];
}
