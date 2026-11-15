import { HelpCircle, X } from "lucide-react";
import { useState } from "react";
import type { Strings } from "@/components/ui";

/**
 * A short first-steps guide: open by itself while there is nothing yet (`empty`), and again from
 * «كيف أبدأ؟». Closing it is remembered on this device, per guide.
 */
export function Guide({
  t,
  id,
  empty,
  emptyText,
  steps,
}: {
  t: Strings;
  id: string; // which guide, e.g. an initiative or a group
  empty: boolean;
  emptyText?: string; // shown with the link once the guide is closed and still nothing exists
  steps: string[];
}) {
  const key = `wird:guide-closed:${id}`;
  const [closed, setClosed] = useState(() => {
    try {
      return localStorage.getItem(key) === "1";
    } catch {
      return false;
    }
  });
  const [open, setOpen] = useState(false);
  const titleId = `guide-${id}`;

  function close() {
    setOpen(false);
    setClosed(true);
    try {
      localStorage.setItem(key, "1");
    } catch {
      // Private browsing: it just opens again next time
    }
  }

  if (!open && !(empty && !closed)) {
    return (
      <div className="space-y-2">
        {empty && emptyText && <p className="card text-stone-600">{emptyText}</p>}
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-1 text-sm text-hasanat hover:underline"
        >
          <HelpCircle className="h-4 w-4" aria-hidden="true" />
          {t["guide.title"]}
        </button>
      </div>
    );
  }

  return (
    <section className="card space-y-3 border-hasanat/30 bg-hasanat/5" aria-labelledby={titleId}>
      <div className="flex items-start justify-between gap-2">
        <h2 id={titleId} className="text-lg font-semibold text-slate-900">
          {t["guide.title"]}
        </h2>
        <button
          type="button"
          onClick={close}
          aria-label={t["guide.close"]}
          className="rounded-lg p-1.5 text-stone-500 hover:bg-white hover:text-slate-700"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
      <ol className="space-y-3">
        {steps.map((step, i) => (
          <li key={step} className="flex gap-3">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-hasanat text-sm font-semibold text-white">
              {i + 1}
            </span>
            <span className="pt-0.5 text-sm text-slate-700">{step}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}
