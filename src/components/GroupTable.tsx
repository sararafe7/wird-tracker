import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { type CSSProperties, useEffect, useState } from "react";
import { dayTheme, SHARE_THEMES } from "@/components/theme";
import { fill, type Strings } from "@/components/ui";
import {
  type Data,
  type Group,
  groupMembers,
  hasMark,
  type ImageTarget,
  imageUrl,
} from "@/lib/store";
import { addDays, dateValue, dayView, fridayOnOrBefore, hijriDate } from "@/lib/wird";
import { cn } from "@/utils/cn";

interface Props {
  t: Strings;
  data: Data;
  group: Group;
  today: string;
  onClose: () => void;
}

const FONT_ID = "font-el-messiri";
const FONT_URL =
  "https://fonts.googleapis.com/css2?family=El+Messiri:wght@400;500;600;700&display=swap";

/** El Messiri is only used here, so it loads when the table first opens */
function useTableFont() {
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
function Heart({ color, label }: { color: string; label: string }) {
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
function Sun({ label, legend }: { label: string; legend?: boolean }) {
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
function Crescent({ label, legend }: { label: string; legend?: boolean }) {
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

/** Group icon or initiative logo in a white circle; an empty space of the same size keeps the title centred */
function Badge({
  target,
  id,
  version,
}: {
  target: ImageTarget;
  id: string;
  version: string | null;
}) {
  if (!version) return <span className="h-[66px] w-[66px] shrink-0" aria-hidden="true" />;
  return (
    <span className="h-[66px] w-[66px] shrink-0 overflow-hidden rounded-full bg-white">
      <img src={imageUrl(target, id, version)} alt="" className="h-full w-full object-cover" />
    </span>
  );
}

/**
 * Screenshot-ready table of the next day's wird, sized to fit one phone screen.
 * Pages are for the table's date; the heart and Mulk report the day that just ended.
 * Kahf reports the most recent Friday and stays all week, so a missed Kahf shows until the next Friday.
 * The whole table takes its colours from the day's heart.
 */
export default function GroupTable({ t, data, group, today, onClose }: Props) {
  useTableFont();
  const [date, setDate] = useState(() => addDays(today, 1));
  const ended = addDays(date, -1);
  const day = dayTheme(SHARE_THEMES[group.audience], ended);
  const initiative = data.initiatives.find((i) => i.id === group.initiativeId);
  const friday = fridayOnOrBefore(ended);
  const members = groupMembers(data, group.id);
  const lang = typeof document === "undefined" ? "ar" : document.documentElement.lang;
  const d = dateValue(date);
  const dayName = d.toLocaleDateString(lang, { weekday: "long" });
  const numeric = `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
  const hijri = hijriDate(date);
  // Shrink rows for big groups so the whole table still fits on one screen; header and footer keep their size
  const dense = members.length > 18;
  const colours = {
    "--deep": day.deep,
    "--tint": day.tint,
    "--page": day.page,
    "--line": day.line,
    fontFamily: "'El Messiri', sans-serif",
  } as CSSProperties;
  // Kahf read any day from the most recent Friday up to the day that just ended
  const kahfDone = (memberId: string) =>
    data.marks.some(
      (k) => k.memberId === memberId && k.kind === "kahf" && k.date >= friday && k.date <= ended,
    );
  const initiativeName = initiative?.name.startsWith("مبادرة")
    ? initiative.name
    : fill(t["table.initiative"], { name: initiative?.name ?? "" });
  const navButton = "rounded-full border border-[var(--line)] bg-white text-[var(--deep)]";

  return (
    <div
      className="fixed inset-0 z-[60] flex flex-col overflow-y-auto bg-[var(--page)]"
      style={colours}
    >
      <div className="mx-auto w-full max-w-md flex-1 px-3 pt-4 pb-2">
        <div className="overflow-hidden rounded-[24px] bg-white shadow-[0_8px_24px_rgba(30,20,40,.12)]">
          <header className="flex items-center gap-3 bg-[var(--deep)] px-[14px] py-4 text-white">
            <Badge target="group" id={group.id} version={group.icon} />
            <div className="min-w-0 flex-1 text-center">
              <h1 className="truncate text-[22px] leading-tight font-bold">{group.name}</h1>
              <p className="text-[14px] font-medium text-white/88">
                {t["table.title"].replace("{day}", dayName).replace("{date}", numeric)}
              </p>
              {hijri && <p className="text-[12px] text-white/78">{hijri}</p>}
            </div>
            {initiative ? (
              <Badge target="initiative" id={initiative.id} version={initiative.logo} />
            ) : (
              <Badge target="initiative" id="" version={null} />
            )}
          </header>
          <table className="w-full table-fixed text-center">
            <colgroup>
              <col className="w-[30px]" />
              <col />
              <col className="w-[100px]" />
              <col className="w-[40px]" />
              <col className="w-[40px]" />
            </colgroup>
            <thead>
              <tr className="bg-[var(--tint)] text-[12px] font-semibold text-[var(--deep)]">
                <th className="py-2">{t["table.number"]}</th>
                <th className="py-2">{t["table.name"]}</th>
                <th className="py-2">{t["table.wird"]}</th>
                <th className="py-2">{t["table.kahf"]}</th>
                <th className="py-2">{t["table.mulk"]}</th>
              </tr>
            </thead>
            <tbody className={dense ? "text-[13px]" : "text-[15px]"}>
              {members.map((m, i) => {
                const v = dayView(m, data.records, date);
                const from = v.spans[0]?.from ?? v.page;
                const to = v.spans.at(-1)?.to;
                const readEnded = dayView(m, data.records, ended).record !== null;
                return (
                  <tr
                    key={m.id}
                    className={cn("border-b border-[var(--line)]", dense ? "h-[30px]" : "h-[46px]")}
                  >
                    <td className="text-[13px] font-semibold text-[var(--deep)]">{i + 1}</td>
                    <td className="px-1 text-start font-medium text-slate-900">
                      <span className="flex items-center gap-1.5">
                        <span className="truncate">{m.name}</span>
                        {readEnded && <Heart color={day.heart} label={t["table.read"]} />}
                      </span>
                    </td>
                    <td>
                      <span
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-full bg-[var(--tint)] font-medium text-[#2A1A22] tabular-nums",
                          dense ? "px-2 py-0.5 text-[12px]" : "px-2.5 py-1 text-[14px]",
                        )}
                      >
                        <span>{from}</span>
                        {to !== undefined && (
                          <>
                            <span className="text-[var(--deep)]" aria-hidden="true">
                              ←
                            </span>
                            <span>{to}</span>
                          </>
                        )}
                      </span>
                    </td>
                    <td>{kahfDone(m.id) && <Sun label={t["marks.kahf"]} />}</td>
                    <td>
                      {hasMark(data.marks, m.id, ended, "mulk") && (
                        <Crescent label={t["marks.mulk"]} />
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <footer className="flex items-center justify-between gap-2 px-[14px] py-3 text-[11px]">
            <span className="truncate font-semibold text-[var(--deep)]">
              {initiative ? initiativeName : ""}
            </span>
            <span className="flex shrink-0 items-center gap-3 text-slate-600">
              <span className="flex items-center gap-1">
                <Sun label="" legend />
                {t["table.legend_kahf"]}
              </span>
              <span className="flex items-center gap-1">
                <Crescent label="" legend />
                {t["table.legend_mulk"]}
              </span>
            </span>
          </footer>
        </div>
      </div>

      <nav className="sticky bottom-0 flex items-center justify-center gap-2 bg-[var(--page)]/95 px-3 py-3">
        <button
          type="button"
          onClick={() => setDate(addDays(date, -1))}
          aria-label={t["table.prev_day"]}
          className={cn(navButton, "p-2")}
        >
          <ChevronRight className="h-5 w-5 ltr:rotate-180" aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={onClose}
          className={cn(navButton, "inline-flex items-center gap-1 px-4 py-2 text-sm font-medium")}
        >
          <X className="h-4 w-4" aria-hidden="true" />
          {t["table.close"]}
        </button>
        <button
          type="button"
          onClick={() => setDate(addDays(date, 1))}
          aria-label={t["table.next_day"]}
          className={cn(navButton, "p-2")}
        >
          <ChevronLeft className="h-5 w-5 ltr:rotate-180" aria-hidden="true" />
        </button>
      </nav>
    </div>
  );
}
