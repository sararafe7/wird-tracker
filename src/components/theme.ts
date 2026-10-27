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
  mark: string; // Kahf / Mulk read
  markOn: string; // Kahf / Mulk toggle when ticked, on the group page
  markHint: string; // Kahf toggle on Fridays before it is ticked
  readEmoji: string[]; // one per member for "read yesterday"
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
    mark: "🌸",
    markOn: "border-pink-300 bg-pink-100 text-pink-800",
    markHint: "border-pink-200 text-pink-700",
    readEmoji: ["🌸", "🌷", "💝", "🌹", "✨", "💐"],
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
    mark: "🌿",
    markOn: "border-sky-300 bg-sky-100 text-sky-800",
    markHint: "border-sky-200 text-sky-700",
    readEmoji: ["🌿", "🍃", "🌟", "✨", "💎", "⭐"],
    weekEmoji: "🌟",
  },
};

/** The same emoji for a member every day, picked from her or his id */
export function readEmoji(theme: ShareTheme, memberId: string): string {
  let h = 0;
  for (const c of memberId) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return theme.readEmoji[h % theme.readEmoji.length];
}
