import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useState } from "react";
import { readEmoji, SHARE_THEMES } from "@/components/theme";
import type { Strings } from "@/components/ui";
import { type Data, type Group, groupMembers, hasMark, type MarkKind } from "@/lib/store";
import { addDays, dateValue, dayView, hijriDate } from "@/lib/wird";
import { cn } from "@/utils/cn";

const MARKS: MarkKind[] = ["kahf", "mulk"];

interface Props {
  t: Strings;
  data: Data;
  group: Group;
  today: string;
  onClose: () => void;
}

/**
 * Screenshot-ready table of the next day's wird, sized to fit one phone screen.
 * Pages are for the table's date; the emoji and marks report the day that just ended.
 */
export default function GroupTable({ t, data, group, today, onClose }: Props) {
  const [date, setDate] = useState(() => addDays(today, 1));
  const theme = SHARE_THEMES[group.audience];
  const ended = addDays(date, -1);
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

  return (
    <div className={cn("fixed inset-0 z-[60] flex flex-col overflow-y-auto", theme.page)}>
      <div className="mx-auto w-full max-w-md flex-1 px-3 pt-4 pb-2">
        <div className={cn("overflow-hidden rounded-2xl border bg-white shadow-sm", theme.frame)}>
          <header
            className={cn(
              "px-3 text-center",
              theme.header,
              theme.headerText,
              dense ? "py-2" : "py-3",
            )}
          >
            <h1 className={cn("font-bold", dense ? "text-lg" : "text-xl")}>
              {t["table.title"].replace("{day}", dayName).replace("{date}", numeric)}
            </h1>
            {hijri && <p className={cn("font-medium", dense ? "text-xs" : "text-sm")}>{hijri}</p>}
          </header>
          <table className={cn("w-full table-fixed text-center", dense ? "text-xs" : "text-sm")}>
            <colgroup>
              <col className="w-[11%]" />
              <col />
              <col className="w-[13%]" />
              <col className="w-[13%]" />
              <col className="w-[15%]" />
              <col className="w-[15%]" />
            </colgroup>
            <thead>
              <tr className={cn("font-semibold", theme.subhead)}>
                <th className={cn(cell, "border-b")}>{t["table.number"]}</th>
                <th className={cn(cell, "border-b")}>{t["table.name"]}</th>
                <th className={cn(cell, "border-b")}>{t["table.from"]}</th>
                <th className={cn(cell, "border-b")}>{t["table.to"]}</th>
                <th className={cn(cell, "border-b leading-tight")}>{t["table.kahf"]}</th>
                <th className={cn(cell, "border-b leading-tight")}>{t["table.mulk"]}</th>
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
                        {readEnded && <span className="shrink-0">{readEmoji(theme, m.id)}</span>}
                      </span>
                    </td>
                    <td className={cn(row, "tabular-nums")}>{from}</td>
                    <td className={cn(row, "tabular-nums")}>{to ?? "–"}</td>
                    {MARKS.map((kind) => (
                      <td key={kind} className={row}>
                        {hasMark(data.marks, m.id, ended, kind) ? theme.mark : ""}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
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
