import { Check, ChevronLeft, ChevronRight, X } from "lucide-react";
import { useState } from "react";
import { Thumb } from "@/components/images";
import { readHeart, SHARE_THEMES } from "@/components/theme";
import type { Strings } from "@/components/ui";
import { type Data, type Group, groupMembers, hasMark } from "@/lib/store";
import { addDays, dateValue, dayView, fridayOnOrBefore, hijriDate } from "@/lib/wird";
import { cn } from "@/utils/cn";

interface Props {
  t: Strings;
  data: Data;
  group: Group;
  today: string;
  onClose: () => void;
}

/** Kahf / Mulk read: a ✓ in a filled circle in the table's colour */
function Tick({ className, label }: { className: string; label: string }) {
  return (
    <span
      role="img"
      aria-label={label}
      className={cn("inline-flex h-5 w-5 items-center justify-center rounded-full", className)}
    >
      <Check className="h-3.5 w-3.5" strokeWidth={3} aria-hidden="true" />
    </span>
  );
}

/**
 * Screenshot-ready table of the next day's wird, sized to fit one phone screen.
 * Pages are for the table's date; the heart and Mulk report the day that just ended.
 * Kahf reports the most recent Friday and stays all week, so a missed Kahf shows until the next Friday.
 */
export default function GroupTable({ t, data, group, today, onClose }: Props) {
  const [date, setDate] = useState(() => addDays(today, 1));
  const theme = SHARE_THEMES[group.audience];
  const initiative = data.initiatives.find((i) => i.id === group.initiativeId);
  const ended = addDays(date, -1);
  const friday = fridayOnOrBefore(ended);
  const heart = readHeart(theme, ended);
  const members = groupMembers(data, group.id);
  const lang = typeof document === "undefined" ? "ar" : document.documentElement.lang;
  const d = dateValue(date);
  const dayName = d.toLocaleDateString(lang, { weekday: "long" });
  const numeric = `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
  const hijri = hijriDate(date);
  // Shrink rows for big groups so the whole table still fits on one screen
  const dense = members.length > 18;
  const cell = dense ? "px-1 py-0.5" : "px-1.5 py-1.5";
  const navButton = cn("rounded-full border bg-white", theme.button);
  // Kahf read any day from the most recent Friday up to the day that just ended
  const kahfDone = (memberId: string) =>
    data.marks.some(
      (k) => k.memberId === memberId && k.kind === "kahf" && k.date >= friday && k.date <= ended,
    );

  return (
    <div className={cn("fixed inset-0 z-[60] flex flex-col overflow-y-auto", theme.page)}>
      <div className="mx-auto w-full max-w-md flex-1 px-3 pt-4 pb-2">
        <div className={cn("overflow-hidden rounded-2xl border bg-white shadow-sm", theme.frame)}>
          <header
            className={cn(
              "relative px-12 text-center",
              theme.header,
              theme.headerText,
              dense ? "py-2" : "py-3",
            )}
          >
            {initiative && (
              <Thumb
                target="initiative"
                id={initiative.id}
                version={initiative.logo}
                className={cn("absolute start-2 top-2", dense ? "h-8 w-8" : "h-10 w-10")}
              />
            )}
            <h1
              className={cn(
                "flex items-center justify-center gap-2 font-bold",
                dense ? "text-lg" : "text-xl",
              )}
            >
              <Thumb
                target="group"
                id={group.id}
                version={group.icon}
                className={dense ? "h-6 w-6" : "h-7 w-7"}
              />
              <span className="truncate">{group.name}</span>
            </h1>
            <p className={cn("font-semibold", dense ? "text-sm" : "text-base")}>
              {t["table.title"].replace("{day}", dayName).replace("{date}", numeric)}
            </p>
            {hijri && <p className={cn("opacity-80", dense ? "text-xs" : "text-sm")}>{hijri}</p>}
          </header>
          <table className={cn("w-full table-fixed text-center", dense ? "text-xs" : "text-sm")}>
            <colgroup>
              <col className="w-[11%]" />
              <col />
              <col className="w-[13%]" />
              <col className="w-[13%]" />
              <col className="w-[13%]" />
              <col className="w-[13%]" />
            </colgroup>
            <thead>
              <tr className={cn("font-semibold", theme.subhead)}>
                <th className={cn(cell, "border-b", theme.frame)}>{t["table.number"]}</th>
                <th className={cn(cell, "border-b text-start", theme.frame)}>{t["table.name"]}</th>
                <th className={cn(cell, "border-b", theme.frame)}>{t["table.from"]}</th>
                <th className={cn(cell, "border-b", theme.frame)}>{t["table.to"]}</th>
                <th className={cn(cell, "border-b", theme.frame)}>{t["table.kahf"]}</th>
                <th className={cn(cell, "border-b", theme.frame)}>{t["table.mulk"]}</th>
              </tr>
            </thead>
            <tbody>
              {members.map((m, i) => {
                const v = dayView(m, data.records, date);
                const from = v.spans[0]?.from ?? v.page;
                const to = v.spans.at(-1)?.to;
                const readEnded = dayView(m, data.records, ended).record !== null;
                const row = cn(cell, "border-b", theme.rule);
                return (
                  <tr key={m.id} className={cn("text-slate-800", i % 2 === 1 && theme.stripe)}>
                    <td className={cn(row, "font-semibold", theme.accent)}>{i + 1}</td>
                    <td className={cn(row, "text-start")}>
                      <span className="flex items-center gap-1">
                        <span className="truncate">{m.name}</span>
                        {readEnded && (
                          // A faint outline keeps the white heart visible on white rows
                          <span className="shrink-0 drop-shadow-[0_0_1px_rgb(0_0_0/0.35)]">
                            {heart}
                          </span>
                        )}
                      </span>
                    </td>
                    <td className={cn(row, "tabular-nums")}>{from}</td>
                    <td className={cn(row, "tabular-nums")}>{to ?? "–"}</td>
                    <td className={row}>
                      {kahfDone(m.id) && <Tick className={theme.check} label={t["marks.kahf"]} />}
                    </td>
                    <td className={row}>
                      {hasMark(data.marks, m.id, ended, "mulk") && (
                        <Tick className={theme.check} label={t["marks.mulk"]} />
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {initiative && (
            <footer className={cn("px-3 py-2 text-center text-xs font-medium", theme.accent)}>
              {initiative.name}
            </footer>
          )}
        </div>
      </div>

      <nav
        className={cn(
          "sticky bottom-0 flex items-center justify-center gap-2 px-3 py-3",
          theme.navBg,
        )}
      >
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
