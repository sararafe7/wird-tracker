import {
  ArrowDown,
  ArrowUp,
  Check,
  ChevronRight,
  ClipboardCopy,
  ListOrdered,
  Pencil,
  Plus,
  Star,
  Table2,
  Trash2,
} from "lucide-react";
import { useRef, useState } from "react";
import { SHARE_THEMES } from "@/components/theme";
import { copyText, fill, inputClass, SpanText, type Strings } from "@/components/ui";
import { newId } from "@/lib/id";
import type { Op } from "@/lib/ops";
import {
  canManageMembers,
  type Data,
  type Group,
  groupMembers,
  hasMark,
  type MarkKind,
  type Staff,
} from "@/lib/store";
import {
  clampDaily,
  clampPage,
  dateValue,
  dayView,
  hijriDate,
  khatmat,
  type Member,
  stats,
  TOTAL_PAGES,
} from "@/lib/wird";
import { cn } from "@/utils/cn";

const QUICK_VALUES = [0, 0.5, 1, 2, 3];
const LONG_PRESS_MS = 500;
const MARKS: MarkKind[] = ["kahf", "mulk"];

interface FormState {
  id?: string;
  name: string;
  daily: string;
  startPage: string;
}

const emptyForm: FormState = { name: "", daily: "5", startPage: "1" };

interface Props {
  t: Strings;
  data: Data;
  apply: (op: Op) => void;
  group: Group;
  user: Staff;
  today: string;
  onBack: () => void;
  onTable: () => void;
  onWeek: () => void;
}

export default function GroupBoard({
  t,
  data,
  apply,
  group,
  user,
  today,
  onBack,
  onTable,
  onWeek,
}: Props) {
  const [form, setForm] = useState<FormState | null>(null);
  const [picker, setPicker] = useState<string | null>(null);
  const [custom, setCustom] = useState("");
  const [date, setDate] = useState(today);
  const [reorder, setReorder] = useState(false);
  const [status, setStatus] = useState("");
  const [manualCopy, setManualCopy] = useState("");
  const pressTimer = useRef<number | undefined>(undefined);
  const longPressed = useRef(false);

  const { records, marks } = data;
  const members = groupMembers(data, group.id);
  const canManage = canManageMembers(user, group);
  const theme = SHARE_THEMES[group.audience];

  function record(m: Member, value: number | null) {
    apply(
      value === null
        ? { type: "recordRemove", memberId: m.id, date }
        : { type: "recordSet", memberId: m.id, date, value },
    );
    setPicker(null);
  }

  function toggle(m: Member) {
    if (longPressed.current) {
      longPressed.current = false;
      return;
    }
    record(m, dayView(m, records, date).record ? null : 1);
  }

  function openPicker(id: string) {
    setCustom("");
    setPicker(picker === id ? null : id);
  }

  function startPress(id: string) {
    longPressed.current = false;
    pressTimer.current = window.setTimeout(() => {
      longPressed.current = true;
      openPicker(id);
    }, LONG_PRESS_MS);
  }

  function endPress() {
    window.clearTimeout(pressTimer.current);
  }

  function submit(e: { preventDefault(): void }) {
    e.preventDefault();
    if (!form) return;
    const name = form.name.trim();
    if (!name) return;
    const daily = clampDaily(Number(form.daily) || 1);
    const startPage = clampPage(Number(form.startPage) || 1);
    apply(
      form.id
        ? { type: "memberUpdate", id: form.id, name, daily, startPage }
        : { type: "memberAdd", id: newId(), groupId: group.id, name, daily, startPage },
    );
    setForm(null);
  }

  function remove(id: string) {
    if (!confirm(t["form.delete_confirm"])) return;
    apply({ type: "memberRemove", id });
    setForm(null);
  }

  async function copyUnread() {
    const unread = members
      .map((m, i) => ({ m, n: i + 1 }))
      .filter(({ m }) => !dayView(m, records, date).record);
    setManualCopy("");
    if (unread.length === 0) {
      setStatus(t["board.all_read"]);
      return;
    }
    const text = [t["board.unread_heading"], ...unread.map(({ m, n }) => `${n}. ${m.name}`)].join(
      "\n",
    );
    if (await copyText(text)) {
      setStatus(t["board.copied"]);
    } else {
      // Let her copy it by hand when the browser refuses
      setStatus(t["board.copy_failed"]);
      setManualCopy(text);
    }
  }

  const lang = typeof document === "undefined" ? "ar" : document.documentElement.lang;
  const dateLabel = dateValue(date).toLocaleDateString(lang, {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  const hijri = hijriDate(date, false);
  const isFriday = dateValue(date).getDay() === 5;
  const monthStart = `${date.slice(0, 7)}-01`;
  const monthEnd = `${date.slice(0, 7)}-31`;
  const doneCount = members.filter((m) => dayView(m, records, date).record).length;

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-1 text-sm text-stone-600 hover:text-slate-900"
      >
        <ChevronRight className="h-4 w-4 rtl:rotate-0 ltr:rotate-180" aria-hidden="true" />
        {t["app.groups"]}
      </button>

      <header className="space-y-2">
        <div className="flex items-end justify-between gap-3">
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-bold text-slate-900">{group.name}</h1>
            <p className="text-sm text-stone-500">
              {date === today ? t["wird.title"] : t["wird.title_past"]} · {dateLabel}
              {hijri && ` · ${hijri}`}
            </p>
          </div>
          {members.length > 0 && (
            <p className="shrink-0 text-sm font-medium text-hasanat" aria-live="polite">
              {fill(t["wird.progress"], { done: doneCount, total: members.length })}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <label className="flex flex-1 items-center gap-2 text-sm">
            <span className="shrink-0 text-stone-600">{t["wird.date"]}</span>
            <input
              type="date"
              value={date}
              max={today}
              onChange={(e) =>
                e.target.value && setDate(e.target.value > today ? today : e.target.value)
              }
              className={cn(inputClass, "py-1.5")}
            />
          </label>
          {date !== today && (
            <button
              type="button"
              className="btn-secondary !px-3 !py-1.5 text-sm"
              onClick={() => setDate(today)}
            >
              {t["wird.back_today"]}
            </button>
          )}
        </div>
        {members.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn-primary !px-4 !py-2 text-sm" onClick={onTable}>
              <Table2 className="h-4 w-4" aria-hidden="true" />
              {t["board.table"]}
            </button>
            <button type="button" className="btn-secondary !px-4 !py-2 text-sm" onClick={onWeek}>
              <Star className="h-4 w-4" aria-hidden="true" />
              {t["week.title"]}
            </button>
            <button
              type="button"
              className="btn-secondary !px-4 !py-2 text-sm"
              onClick={copyUnread}
            >
              <ClipboardCopy className="h-4 w-4" aria-hidden="true" />
              {t["board.copy_unread"]}
            </button>
            {canManage && members.length > 1 && (
              <button
                type="button"
                aria-pressed={reorder}
                className={cn(
                  "btn-secondary !px-4 !py-2 text-sm",
                  reorder && "border-hasanat text-hasanat",
                )}
                onClick={() => setReorder(!reorder)}
              >
                <ListOrdered className="h-4 w-4" aria-hidden="true" />
                {reorder ? t["board.reorder_done"] : t["board.reorder"]}
              </button>
            )}
          </div>
        )}
        <p className="text-sm text-hasanat-dark" aria-live="polite">
          {status}
        </p>
        {manualCopy && (
          <textarea
            readOnly
            value={manualCopy}
            rows={Math.min(8, manualCopy.split("\n").length)}
            onFocus={(e) => e.currentTarget.select()}
            aria-label={t["board.copy_manual"]}
            className={cn(inputClass, "text-sm")}
          />
        )}
      </header>

      {members.length === 0 && !form && (
        <div className="card text-center">
          <p className="mb-4 text-stone-600">
            {canManage ? t["wird.empty"] : t["board.empty_readonly"]}
          </p>
          {canManage && (
            <button type="button" className="btn-primary" onClick={() => setForm(emptyForm)}>
              <Plus className="h-5 w-5" aria-hidden="true" />
              {t["wird.add"]}
            </button>
          )}
        </div>
      )}

      <ul className="space-y-2">
        {members.map((m, index) => {
          const v = dayView(m, records, date);
          const done = v.record !== null;
          const month = stats(records, m.id, monthStart, monthEnd);
          const k = khatmat(m, records);
          return (
            <li
              key={m.id}
              className={cn(
                "rounded-2xl border bg-white p-3",
                done ? "border-hasanat/40 bg-hasanat/5" : "border-slate-100",
              )}
            >
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => toggle(m)}
                  onPointerDown={() => startPress(m.id)}
                  onPointerUp={endPress}
                  onPointerLeave={endPress}
                  onPointerCancel={endPress}
                  onContextMenu={(e) => e.preventDefault()}
                  aria-pressed={done}
                  aria-label={fill(done ? t["wird.unmark"] : t["wird.mark"], { name: m.name })}
                  className={cn(
                    "flex h-12 w-12 shrink-0 select-none items-center justify-center rounded-full border-2 transition-colors",
                    "focus:outline-none focus-visible:ring-2 focus-visible:ring-hasanat/50 focus-visible:ring-offset-2",
                    done
                      ? "border-hasanat bg-hasanat text-white"
                      : "border-slate-300 text-transparent",
                  )}
                >
                  <Check className="h-6 w-6" aria-hidden="true" />
                </button>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-slate-900">
                    <span className="text-stone-500">{index + 1}.</span> {m.name}
                  </p>
                  <p className={cn("text-sm", done ? "text-hasanat-dark" : "text-slate-600")}>
                    {done && v.spans.length === 0 ? (
                      fill(t["wird.zero"], { n: v.page })
                    ) : (
                      <SpanText spans={v.spans} t={t} />
                    )}
                  </p>
                  <p className="flex flex-wrap gap-x-2 text-xs text-stone-500">
                    <span className="whitespace-nowrap">
                      {fill(t["wird.daily"], { n: m.daily })}
                    </span>
                    <span className="whitespace-nowrap">
                      {fill(t["wird.month_days"], { n: month.days })}
                    </span>
                    {k > 0 && (
                      <span className="whitespace-nowrap">{fill(t["wird.khatmat"], { n: k })}</span>
                    )}
                  </p>
                </div>
                {reorder ? (
                  <div className="flex flex-col gap-1">
                    <button
                      type="button"
                      disabled={index === 0}
                      onClick={() => apply({ type: "memberMove", id: m.id, dir: -1 })}
                      aria-label={fill(t["board.move_up"], { name: m.name })}
                      className="rounded-lg border border-slate-200 p-1.5 text-slate-700 disabled:opacity-30"
                    >
                      <ArrowUp className="h-4 w-4" aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      disabled={index === members.length - 1}
                      onClick={() => apply({ type: "memberMove", id: m.id, dir: 1 })}
                      aria-label={fill(t["board.move_down"], { name: m.name })}
                      className="rounded-lg border border-slate-200 p-1.5 text-slate-700 disabled:opacity-30"
                    >
                      <ArrowDown className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => openPicker(m.id)}
                      aria-expanded={picker === m.id}
                      aria-label={fill(t["wird.value_for"], { name: m.name })}
                      className={cn(
                        "min-w-11 rounded-lg border px-2 py-1.5 text-sm font-medium",
                        done
                          ? "border-hasanat/40 text-hasanat-dark"
                          : "border-slate-200 text-stone-500",
                      )}
                    >
                      <bdi dir="ltr">×{done ? v.record?.value : ""}</bdi>
                    </button>
                    {canManage && (
                      <button
                        type="button"
                        onClick={() =>
                          setForm({
                            id: m.id,
                            name: m.name,
                            daily: String(m.daily),
                            startPage: String(m.startPage),
                          })
                        }
                        aria-label={fill(t["wird.edit"], { name: m.name })}
                        className="rounded-lg p-2 text-stone-500 hover:bg-slate-50 hover:text-slate-700"
                      >
                        <Pencil className="h-4 w-4" aria-hidden="true" />
                      </button>
                    )}
                  </>
                )}
              </div>

              {!reorder && (
                <div className="mt-2 flex gap-2 ps-15">
                  {MARKS.map((kind) => {
                    const on = hasMark(marks, m.id, date, kind);
                    return (
                      <button
                        key={kind}
                        type="button"
                        aria-pressed={on}
                        onClick={() =>
                          apply({ type: "markSet", memberId: m.id, date, kind, on: !on })
                        }
                        className={cn(
                          "rounded-full border px-3 py-1 text-xs font-medium",
                          on ? theme.markOn : "border-slate-200 text-stone-500",
                          kind === "kahf" && isFriday && !on && theme.markHint,
                        )}
                      >
                        {on && <Check className="me-1 inline h-3 w-3" aria-hidden="true" />}
                        {t[`marks.${kind}`]}
                      </button>
                    );
                  })}
                </div>
              )}

              {picker === m.id && !reorder && (
                <div className="mt-3 space-y-2 border-t border-slate-100 pt-3">
                  <p className="text-xs text-stone-500">
                    {fill(t["wird.value_hint"], { n: m.daily })}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {QUICK_VALUES.map((q) => (
                      <button
                        key={q}
                        type="button"
                        onClick={() => record(m, q)}
                        className={cn(
                          "min-w-12 rounded-lg border px-3 py-2 text-sm font-medium",
                          v.record?.value === q
                            ? "border-hasanat bg-hasanat text-white"
                            : "border-slate-200 text-slate-700 hover:bg-slate-50",
                        )}
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                  <form
                    className="flex gap-2"
                    onSubmit={(e) => {
                      e.preventDefault();
                      const n = Number(custom);
                      if (custom !== "" && Number.isFinite(n) && n >= 0) record(m, n);
                    }}
                  >
                    <input
                      type="number"
                      inputMode="decimal"
                      min={0}
                      step="any"
                      value={custom}
                      onChange={(e) => setCustom(e.target.value)}
                      placeholder={t["wird.custom"]}
                      aria-label={t["wird.custom"]}
                      className={cn(inputClass, "py-1.5")}
                    />
                    <button type="submit" className="btn-secondary !px-4 !py-1.5 text-sm">
                      {t["common.save"]}
                    </button>
                  </form>
                  {done && (
                    <button
                      type="button"
                      onClick={() => record(m, null)}
                      className="text-sm text-red-700 hover:underline"
                    >
                      {t["wird.clear"]}
                    </button>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>

      {canManage && members.length > 0 && !form && !reorder && (
        <button type="button" className="btn-secondary w-full" onClick={() => setForm(emptyForm)}>
          <Plus className="h-5 w-5" aria-hidden="true" />
          {t["wird.add"]}
        </button>
      )}

      {form && (
        <form onSubmit={submit} className="card space-y-4">
          <h2 className="text-lg font-semibold">
            {form.id ? t["form.edit_title"] : t["form.add_title"]}
          </h2>
          <label className="block space-y-1">
            <span className="text-sm font-medium">{t["form.name"]}</span>
            <input
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className={inputClass}
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block space-y-1">
              <span className="text-sm font-medium">{t["form.daily"]}</span>
              <input
                type="number"
                inputMode="numeric"
                min={1}
                max={TOTAL_PAGES}
                required
                value={form.daily}
                onChange={(e) => setForm({ ...form, daily: e.target.value })}
                className={inputClass}
              />
            </label>
            <label className="block space-y-1">
              <span className="text-sm font-medium">{t["form.start"]}</span>
              <input
                type="number"
                inputMode="numeric"
                min={1}
                max={TOTAL_PAGES}
                required
                value={form.startPage}
                onChange={(e) => setForm({ ...form, startPage: e.target.value })}
                className={inputClass}
              />
            </label>
          </div>
          <p className="text-xs text-stone-500">{t["form.start_hint"]}</p>
          <div className="flex flex-wrap gap-2">
            <button type="submit" className="btn-primary flex-1">
              {t["common.save"]}
            </button>
            <button type="button" className="btn-secondary" onClick={() => setForm(null)}>
              {t["common.cancel"]}
            </button>
            {form.id && (
              <button
                type="button"
                className="btn-secondary text-red-700"
                onClick={() => form.id && remove(form.id)}
                aria-label={t["form.delete"]}
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
              </button>
            )}
          </div>
        </form>
      )}
    </div>
  );
}
