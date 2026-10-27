import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useState } from "react";
import { SHARE_THEMES } from "@/components/theme";
import { fill, type Strings } from "@/components/ui";
import { type Data, type Group, groupMembers } from "@/lib/store";
import { addDays, dateValue, weekStars, weekStart } from "@/lib/wird";
import { cn } from "@/utils/cn";

interface Props {
  t: Strings;
  data: Data;
  group: Group;
  today: string;
  onClose: () => void;
}

/**
 * Screenshot-ready "star of the week" card. Opens on the week holding yesterday,
 * so on Sunday it shows the week that just ended.
 */
export default function GroupWeek({ t, data, group, today, onClose }: Props) {
  const [start, setStart] = useState(() => weekStart(addDays(today, -1)));
  const theme = SHARE_THEMES[group.audience];
  const end = addDays(start, 6);
  const { stars, perfect } = weekStars(groupMembers(data, group.id), data.records, start);
  const short = (date: string) => {
    const d = dateValue(date);
    return `${d.getDate()}/${d.getMonth() + 1}`;
  };
  const navButton = cn("rounded-full border bg-white", theme.button);

  return (
    <div className={cn("fixed inset-0 z-[60] flex flex-col overflow-y-auto", theme.page)}>
      <div className="mx-auto w-full max-w-md flex-1 px-3 pt-4 pb-2">
        <div className={cn("overflow-hidden rounded-2xl border bg-white shadow-sm", theme.frame)}>
          <header className={cn("px-3 py-4 text-center", theme.header)}>
            <h1 className={cn("text-2xl font-bold", theme.headerText)}>
              <span aria-hidden="true">{theme.weekEmoji}</span> {t["week.title"]}{" "}
              <span aria-hidden="true">{theme.weekEmoji}</span>
            </h1>
            <p className={cn("mt-1 text-sm", theme.accent)}>
              {fill(t["week.range"], {
                from: short(start),
                to: `${short(end)}/${dateValue(end).getFullYear()}`,
              })}
            </p>
          </header>
          {stars.length === 0 ? (
            <p className="px-4 py-8 text-center text-stone-600">{t["week.empty"]}</p>
          ) : (
            <>
              <p className={cn("px-4 pt-4 text-center text-sm font-medium", theme.accent)}>
                {perfect ? t["week.perfect"] : t["week.top"]}
              </p>
              <ol className="space-y-2 p-4">
                {stars.map((s) => (
                  <li
                    key={s.member.id}
                    className={cn(
                      "flex items-center gap-3 rounded-xl border px-3 py-2",
                      s.days === 7 ? theme.highlight : theme.rule,
                    )}
                  >
                    <span className={cn("w-6 shrink-0 text-center font-semibold", theme.accent)}>
                      {s.number}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-lg font-semibold text-slate-900">
                      {s.member.name}
                    </span>
                    <span
                      className={cn(
                        "shrink-0 rounded-full px-2.5 py-0.5 text-sm font-semibold tabular-nums",
                        theme.chip,
                      )}
                    >
                      <bdi dir="ltr">{s.days}/7</bdi>
                    </span>
                  </li>
                ))}
              </ol>
            </>
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
          onClick={() => setStart(addDays(start, -7))}
          aria-label={t["week.prev"]}
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
          onClick={() => setStart(addDays(start, 7))}
          aria-label={t["week.next"]}
          className={cn(navButton, "p-2")}
        >
          <ChevronLeft className="h-5 w-5 ltr:rotate-180" aria-hidden="true" />
        </button>
      </nav>
    </div>
  );
}
