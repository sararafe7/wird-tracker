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
  days: DayKey[]; // the table's daily colour themes, in order (see dayTheme)
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
    days: ["blue", "red", "white", "green", "yellow", "purple", "orange", "pink"],
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
    days: ["blue", "green", "white", "yellow", "orange", "purple"],
    weekEmoji: "🌟",
  },
};

export type DayKey = "blue" | "red" | "white" | "green" | "yellow" | "purple" | "orange" | "pink";

/**
 * The screenshot table's colours for one day, from the day's heart. White text on every `deep`
 * colour passes 4.5:1 contrast.
 */
export interface DayTheme {
  heart: string; // "read yesterday" heart
  deep: string; // header background, numbers, headings
  tint: string; // column-heading row, page pill
  page: string; // background behind the card
  line: string; // row dividers
}

export const DAY_THEMES: Record<DayKey, DayTheme> = {
  blue: { heart: "#4F8EF7", deep: "#1F4E9E", tint: "#EAF1FD", page: "#DCE8FB", line: "#E4ECF8" },
  red: { heart: "#E5484D", deep: "#9E2230", tint: "#FCEBEC", page: "#F8DADC", line: "#F5E2E3" },
  white: { heart: "#FFFFFF", deep: "#3E4A5C", tint: "#F0F2F5", page: "#E3E7EC", line: "#E9ECF0" },
  green: { heart: "#3FB37F", deep: "#1D6B4B", tint: "#E7F6EE", page: "#D3EEDF", line: "#E1F0E8" },
  yellow: { heart: "#F5C542", deep: "#7A5A0E", tint: "#FCF4DC", page: "#F7EBC4", line: "#F3EAD0" },
  purple: { heart: "#9B6BE8", deep: "#55308F", tint: "#F1EAFC", page: "#E4D8F8", line: "#ECE4F7" },
  orange: { heart: "#F59A3C", deep: "#8F4A0D", tint: "#FDEFE1", page: "#FADFC4", line: "#F6E6D6" },
  pink: { heart: "#F28AB2", deep: "#8E2656", tint: "#FCEAF2", page: "#F8D9E7", line: "#F5E1EA" },
};

/** The table's theme for a date: the same all day, the next one in the list the next day */
export function dayTheme(theme: ShareTheme, date: string): DayTheme {
  const day = Math.round(Date.parse(`${date}T00:00:00Z`) / 86_400_000);
  const n = theme.days.length;
  return DAY_THEMES[theme.days[((day % n) + n) % n]];
}
