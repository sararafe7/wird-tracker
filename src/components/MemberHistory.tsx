import { X } from "lucide-react";
import { useEffect, useRef } from "react";
import { fill, type Strings } from "@/components/ui";
import {
  dateValue,
  dayView,
  khatmat,
  type Member,
  monthHistory,
  type WirdRecord,
} from "@/lib/wird";

interface Props {
  t: Strings;
  member: Member;
  records: WirdRecord[];
  today: string;
  onClose: () => void;
}

/**
 * A member's reading history, month by month. Only her group's manager and the initiative's
 * supervisors receive her records, so only they can open it.
 */
export default function MemberHistory({ t, member, records, today, onClose }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const months = monthHistory(member, records);
  const lang = typeof document === "undefined" ? "ar" : document.documentElement.lang;

  useEffect(() => {
    dialog.current?.showModal();
  }, []);

  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents: a click on the backdrop closes it; Escape already closes a dialog
    <dialog
      ref={dialog}
      onClose={onClose}
      onClick={(e) => e.target === dialog.current && dialog.current?.close()}
      aria-labelledby="history-title"
      className="m-auto w-[min(28rem,calc(100vw-2rem))] rounded-2xl p-0 shadow-xl backdrop:bg-slate-900/40"
    >
      <div className="space-y-4 p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h2 id="history-title" className="truncate text-lg font-semibold text-slate-900">
              {fill(t["history.title"], { name: member.name })}
            </h2>
            <p className="text-sm text-stone-600">
              {fill(t["history.current"], { n: dayView(member, records, today).page })}
              {" · "}
              {fill(t["wird.khatmat"], { n: khatmat(member, records) })}
            </p>
          </div>
          <button
            type="button"
            onClick={() => dialog.current?.close()}
            aria-label={t["error.dismiss"]}
            className="rounded-lg p-2 text-stone-500 hover:bg-slate-50 hover:text-slate-700"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
        {months.length === 0 ? (
          <p className="text-stone-600">{t["history.empty"]}</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-stone-600">
                <th className="py-2 text-start font-medium">{t["history.month"]}</th>
                <th className="py-2 font-medium">{t["history.days"]}</th>
                <th className="py-2 font-medium">{t["history.pages"]}</th>
                <th className="py-2 font-medium">{t["history.khatmat"]}</th>
              </tr>
            </thead>
            <tbody>
              {months.map((m) => (
                <tr key={m.month} className="border-b border-slate-100 last:border-0">
                  <td className="py-2 text-start">
                    {dateValue(`${m.month}-01`).toLocaleDateString(lang, {
                      month: "long",
                      year: "numeric",
                    })}
                  </td>
                  <td className="py-2 text-center tabular-nums">{m.days}</td>
                  <td className="py-2 text-center tabular-nums">{m.pages}</td>
                  <td className="py-2 text-center tabular-nums">{m.khatmat}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </dialog>
  );
}
