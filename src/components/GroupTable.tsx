import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useState } from "react";
import {
  Badge,
  Crescent,
  Heart,
  initiativeLabel,
  Sun,
  shareNavButton,
  shareStyle,
  useShareFont,
} from "@/components/share";
import { dayTheme, SHARE_THEMES } from "@/components/theme";
import type { Strings } from "@/components/ui";
import { type Data, type Group, groupMembers, hasMark } from "@/lib/store";
import { addDays, dateValue, dayName, dayView, fridayOnOrBefore, hijriDate } from "@/lib/wird";
import { cn } from "@/utils/cn";

interface Props {
  t: Strings;
  data: Data;
  group: Group;
  today: string;
  onClose: () => void;
}

/**
 * Screenshot-ready table of the next day's wird, sized to fit one phone screen.
 * Pages are for the table's date; the heart and Mulk report the day that just ended.
 * Kahf reports the most recent Friday and stays all week, so a missed Kahf shows until the next Friday.
 * The whole table takes its colours from the day's heart.
 */
export default function GroupTable({ t, data, group, today, onClose }: Props) {
  useShareFont();
  const [date, setDate] = useState(() => addDays(today, 1));
  const ended = addDays(date, -1);
  const day = dayTheme(SHARE_THEMES[group.audience], ended);
  const initiative = data.initiatives.find((i) => i.id === group.initiativeId);
  const friday = fridayOnOrBefore(ended);
  const members = groupMembers(data, group.id);
  const d = dateValue(date);
  const numeric = `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
  const hijri = hijriDate(date);
  // Shrink rows for big groups so the whole table still fits on one screen; header and footer keep their size
  const dense = members.length > 18;
  const colours = shareStyle(day);
  // Kahf read any day from the most recent Friday up to the day that just ended
  const kahfDone = (memberId: string) =>
    data.marks.some(
      (k) => k.memberId === memberId && k.kind === "kahf" && k.date >= friday && k.date <= ended,
    );
  const navButton = shareNavButton;

  return (
    <div
      className="fixed inset-0 z-[60] flex flex-col overflow-y-auto bg-[var(--page)]"
      style={colours}
    >
      <div className="mx-auto w-full max-w-md flex-1 px-3 pt-4 pb-2">
        <div className="overflow-hidden rounded-[24px] bg-white shadow-[0_8px_24px_rgba(30,20,40,.12)]">
          <header className="flex items-center gap-3 bg-[var(--deep)] px-[14px] py-4 text-white">
            <Badge target="group" id={group.id} version={group.icon} plain={group.iconPlain} />
            <div className="min-w-0 flex-1 text-center">
              {/* No group name: members know their group, and its icon identifies it */}
              <h1 className="text-[20px] leading-tight font-bold">
                {t["table.title"].replace("{day}", dayName(date)).replace("{date}", numeric)}
              </h1>
              {hijri && <p className="mt-0.5 text-[13px] text-white/80">{hijri}</p>}
            </div>
            {initiative ? (
              <Badge
                target="initiative"
                id={initiative.id}
                version={initiative.logo}
                plain={initiative.logoPlain}
              />
            ) : (
              <Badge target="initiative" id="" version={null} />
            )}
          </header>
          <table className="w-full table-fixed text-center">
            <colgroup>
              <col className="w-[30px]" />
              <col />
              <col className="w-[100px]" />
              <col className="w-[46px]" />
              <col className="w-[46px]" />
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
                    <td className="px-1 font-medium text-slate-900">
                      <span className="flex items-center justify-center gap-1.5">
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
          <footer className="px-[14px] pt-3 pb-2 text-[11px]">
            <div className="flex items-center justify-between gap-2">
              <span className="truncate font-semibold text-[var(--deep)]">
                {initiativeLabel(t, initiative)}
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
            </div>
            <p className="mt-1.5 text-center text-[10px] text-slate-500">{t["table.verse"]}</p>
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
