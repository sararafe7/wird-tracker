import type { Audience } from "@/lib/store";

/**
 * Per-audience look: the Kahf / Mulk toggles on the group page, and which daily colour themes
 * the screenshot views (daily table, weekly card) rotate through.
 * Class names are written out in full so Tailwind can find them.
 */
export interface ShareTheme {
  markOn: string; // Kahf / Mulk toggle when ticked, on the group page
  markHint: string; // Kahf toggle on Fridays before it is ticked
  days: DayKey[]; // the screenshot views' daily colour themes, in order (see dayTheme)
}

export const SHARE_THEMES: Record<Audience, ShareTheme> = {
  girls: {
    markOn: "border-pink-300 bg-pink-100 text-pink-800",
    markHint: "border-pink-200 text-pink-700",
    days: ["blue", "red", "white", "green", "yellow", "purple", "orange", "pink"],
  },
  boys: {
    markOn: "border-sky-300 bg-sky-100 text-sky-800",
    markHint: "border-sky-200 text-sky-700",
    days: ["blue", "green", "white", "yellow", "orange", "purple"],
  },
};

export type DayKey = "blue" | "red" | "white" | "green" | "yellow" | "purple" | "orange" | "pink";

/**
 * The screenshot views' colours for one day, from the day's heart. White text on every `deep`
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

/** The screenshot views' theme for a date: the same all day, the next one in the list the next day */
export function dayTheme(theme: ShareTheme, date: string): DayTheme {
  const day = Math.round(Date.parse(`${date}T00:00:00Z`) / 86_400_000);
  const n = theme.days.length;
  return DAY_THEMES[theme.days[((day % n) + n) % n]];
}

/** The group's deep colour today: the dark circle behind light logos inside the app */
export function groupDeep(group: { audience: Audience }, today: string): string {
  return dayTheme(SHARE_THEMES[group.audience], today).deep;
}
