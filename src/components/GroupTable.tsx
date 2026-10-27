import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useState } from "react";
import type { Strings } from "@/components/ui";
import { type Data, type Group, groupMembers, hasMark, type MarkKind } from "@/lib/store";
import { addDays, dateValue, dayView } from "@/lib/wird";
import { cn } from "@/utils/cn";

const FLOWER = "🌸";
const READ_EMOJI = ["🌸", "🌷", "💝", "🌹", "✨", "💐"];
const MARKS: MarkKind[] = ["kahf", "mulk"];

/** The same emoji for a girl every day, picked from her id */
function readEmoji(memberId: string): string {
  let h = 0;
  for (const c of memberId) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return READ_EMOJI[h % READ_EMOJI.length];
}

interface Props {
  t: Strings;
  data: Data;
  group: Group;
  today: string;
  onClose: () => void;
}

/**
 * Screenshot-ready table of the next day's wird, sized to fit one phone screen.
 * Pages are for the table's date; the emoji and flowers report the day that just ended.
 */
export default function GroupTable({ t, data, group, today, onClose }: Props) {
  const [date, setDate] = useState(() => addDays(today, 1));
  const ended = addDays(date, -1);
  const members = groupMembers(data, group.id);
  const lang = typeof document === "undefined" ? "ar" : document.documentElement.lang;
  const d = dateValue(date);
  const dayName = d.toLocaleDateString(lang, { weekday: "long" });
  const numeric = `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
  // Shrink rows for big groups so the whole table still fits on one screen
  const dense = members.length > 18;
  const cell = dense ? "px-1 py-0.5" : "px-1.5 py-1.5";

  return (
    <div className="fixed inset-0 z-[60] flex flex-col overflow-y-auto bg-pink-50">
      <div className="mx-auto w-full max-w-md flex-1 px-3 pt-4 pb-2">
        <div className="overflow-hidden rounded-2xl border border-pink-200 bg-white shadow-sm">
          <h1
            className={cn(
              "bg-pink-200 px-3 text-center font-bold text-pink-900",
              dense ? "py-2 text-lg" : "py-3 text-xl",
            )}
          >
            {t["table.title"].replace("{day}", dayName).replace("{date}", numeric)}
          </h1>
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
              <tr className="bg-pink-100 font-semibold text-pink-900">
                <th className={cn(cell, "border-b border-pink-200")}>{t["table.number"]}</th>
                <th className={cn(cell, "border-b border-pink-200")}>{t["table.name"]}</th>
                <th className={cn(cell, "border-b border-pink-200")}>{t["table.from"]}</th>
                <th className={cn(cell, "border-b border-pink-200")}>{t["table.to"]}</th>
                <th className={cn(cell, "border-b border-pink-200 leading-tight")}>
                  {t["table.kahf"]}
                </th>
                <th className={cn(cell, "border-b border-pink-200 leading-tight")}>
                  {t["table.mulk"]}
                </th>
              </tr>
            </thead>
            <tbody>
              {members.map((m, i) => {
                const v = dayView(m, data.records, date);
                const from = v.spans[0]?.from ?? v.page;
                const to = v.spans.at(-1)?.to;
                const readEnded = dayView(m, data.records, ended).record !== null;
                return (
                  <tr key={m.id} className={cn("text-slate-800", i % 2 === 1 && "bg-pink-50/70")}>
                    <td
                      className={cn(cell, "border-b border-pink-100 font-semibold text-pink-800")}
                    >
                      {i + 1}
                    </td>
                    <td className={cn(cell, "border-b border-pink-100 text-start")}>
                      <span className="flex items-center gap-1">
                        <span className="truncate">{m.name}</span>
                        {readEnded && <span className="shrink-0">{readEmoji(m.id)}</span>}
                      </span>
                    </td>
                    <td className={cn(cell, "border-b border-pink-100 tabular-nums")}>{from}</td>
                    <td className={cn(cell, "border-b border-pink-100 tabular-nums")}>
                      {to ?? "–"}
                    </td>
                    {MARKS.map((kind) => (
                      <td key={kind} className={cn(cell, "border-b border-pink-100")}>
                        {hasMark(data.marks, m.id, ended, kind) ? FLOWER : ""}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <nav className="sticky bottom-0 flex items-center justify-center gap-2 bg-pink-50/95 px-3 py-3">
        <button
          type="button"
          onClick={() => setDate(addDays(date, -1))}
          aria-label={t["table.prev_day"]}
          className="rounded-full border border-pink-200 bg-white p-2 text-pink-800"
        >
          <ChevronRight className="h-5 w-5 ltr:rotate-180" aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={onClose}
          className="inline-flex items-center gap-1 rounded-full border border-pink-200 bg-white px-4 py-2 text-sm font-medium text-pink-800"
        >
          <X className="h-4 w-4" aria-hidden="true" />
          {t["table.close"]}
        </button>
        <button
          type="button"
          onClick={() => setDate(addDays(date, 1))}
          aria-label={t["table.next_day"]}
          className="rounded-full border border-pink-200 bg-white p-2 text-pink-800"
        >
          <ChevronLeft className="h-5 w-5 ltr:rotate-180" aria-hidden="true" />
        </button>
      </nav>
    </div>
  );
}
