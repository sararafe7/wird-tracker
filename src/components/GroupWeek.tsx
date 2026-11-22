import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useState } from "react";
import { Badge, Sparkle, Star, shareNavButton, shareStyle, useShareFont } from "@/components/share";
import { dayTheme, SHARE_THEMES } from "@/components/theme";
import type { Strings } from "@/components/ui";
import { type Data, type Group, groupMembers } from "@/lib/store";
import { addDays, dateValue, hijriRange, weekStars, weekStart } from "@/lib/wird";
import { cn } from "@/utils/cn";

interface Props {
  t: Strings;
  data: Data;
  group: Group;
  today: string;
  onClose: () => void;
}

/**
 * Screenshot-ready "star of the week" card, in the same design as the daily table and in the
 * colours of the day it is shown. Opens on the week holding yesterday, so on Sunday it shows
 * the week that just ended.
 */
export default function GroupWeek({ t, data, group, today, onClose }: Props) {
  useShareFont();
  const [start, setStart] = useState(() => weekStart(addDays(today, -1)));
  const day = dayTheme(SHARE_THEMES[group.audience], today);
  const initiative = data.initiatives.find((i) => i.id === group.initiativeId);
  const end = addDays(start, 6);
  const hijri = hijriRange(start, end);
  const { stars, perfect } = weekStars(groupMembers(data, group.id), data.records, start);
  // «15–21/11», or «29/11–5/12» when the week crosses into the next month
  const from = dateValue(start);
  const to = dateValue(end);
  const range =
    from.getMonth() === to.getMonth()
      ? `${from.getDate()}–${to.getDate()}/${to.getMonth() + 1}`
      : `${from.getDate()}/${from.getMonth() + 1}–${to.getDate()}/${to.getMonth() + 1}`;

  return (
    <div
      className="fixed inset-0 z-[60] flex flex-col overflow-y-auto bg-[var(--page)]"
      style={shareStyle(day)}
    >
      <div className="mx-auto w-full max-w-md flex-1 px-3 pt-4 pb-2">
        <div className="overflow-hidden rounded-[24px] bg-white shadow-[0_8px_24px_rgba(30,20,40,.12)]">
          <header className="flex items-center gap-3 bg-[var(--deep)] px-[14px] py-4 text-white">
            <Badge
              id={initiative?.id ?? ""}
              version={initiative?.logo ?? null}
              plain={initiative?.logoPlain}
            />
            <div className="min-w-0 flex-1 text-center">
              {/* No group name: members know their group, and its icon identifies it */}
              <h1 className="flex items-center justify-center gap-1.5 text-[22px] leading-tight font-bold">
                <Sparkle />
                {t["week.title"]}
                <Sparkle className="h-5 w-5 -scale-x-100" />
              </h1>
              <p className="mt-0.5 text-[14px] font-medium text-white/88">
                <bdi dir="ltr">{range}</bdi>
              </p>
            </div>
            {/* The same width on the other side keeps the title centred */}
            <Badge id="" version={null} />
          </header>
          {stars.length === 0 ? (
            <p className="px-4 py-8 text-center text-stone-600">{t["week.empty"]}</p>
          ) : (
            <>
              <p className="bg-[var(--tint)] py-2 text-center text-[12px] font-semibold text-[var(--deep)]">
                {perfect ? t["week.perfect"] : t["week.top"]}
              </p>
              <table className="w-full table-fixed text-center">
                <colgroup>
                  <col className="w-[30px]" />
                  <col />
                  <col className="w-[124px]" />
                </colgroup>
                <tbody className="text-[15px]">
                  {stars.map((s) => (
                    <tr key={s.member.id} className="h-[46px] border-b border-[var(--line)]">
                      <td className="text-[13px] font-semibold text-[var(--deep)]">{s.number}</td>
                      <td className="truncate px-1 font-medium text-slate-900">{s.member.name}</td>
                      <td>
                        {s.days === 7 ? (
                          // A full week: a golden pill with a star, and a small «ما شاء الله» beneath
                          <span className="inline-flex flex-col items-center py-1">
                            <span className="inline-flex items-center gap-1 rounded-full bg-[#FDF0CC] py-0.5 ps-1 pe-2.5 text-[14px] font-semibold text-[#7A5A0E] ring-1 ring-[#F2B533]/60 tabular-nums">
                              <Star className="h-5 w-5" />
                              <bdi dir="ltr">7/7</bdi>
                            </span>
                            <span className="mt-0.5 text-[10px] font-medium text-[#7A5A0E]">
                              {t["week.mashallah"]}
                            </span>
                          </span>
                        ) : (
                          <span className="inline-flex rounded-full bg-[var(--tint)] px-2.5 py-1 text-[14px] font-medium text-[#2A1A22] tabular-nums">
                            <bdi dir="ltr">{s.days}/7</bdi>
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="px-[14px] pt-3 text-center text-[14px] font-semibold text-[var(--deep)]">
                {t["week.blessing"]}
              </p>
            </>
          )}
          <footer className="flex items-center justify-between gap-2 px-[14px] py-3 text-[11px]">
            <span className="truncate font-semibold text-[var(--deep)]">
              {initiative?.name ?? ""}
            </span>
            {hijri && <span className="shrink-0 text-slate-500">{hijri}</span>}
          </footer>
        </div>
      </div>

      <nav
        data-share-nav
        className="sticky bottom-0 flex items-center justify-center gap-2 bg-[var(--page)]/95 px-3 py-3"
      >
        <button
          type="button"
          onClick={() => setStart(addDays(start, -7))}
          aria-label={t["week.prev"]}
          className={cn(shareNavButton, "p-2")}
        >
          <ChevronRight className="h-5 w-5 ltr:rotate-180" aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={onClose}
          className={cn(
            shareNavButton,
            "inline-flex items-center gap-1 px-4 py-2 text-sm font-medium",
          )}
        >
          <X className="h-4 w-4" aria-hidden="true" />
          {t["table.close"]}
        </button>
        <button
          type="button"
          onClick={() => setStart(addDays(start, 7))}
          aria-label={t["week.next"]}
          className={cn(shareNavButton, "p-2")}
        >
          <ChevronLeft className="h-5 w-5 ltr:rotate-180" aria-hidden="true" />
        </button>
      </nav>
    </div>
  );
}
