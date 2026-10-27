import { reportError } from "@/lib/errors";
import type { Audience } from "@/lib/store";
import type { Span } from "@/lib/wird";

export type Strings = Record<string, string>;

/**
 * Strings worded for a group's members: a "key#girls" or "key#boys" entry
 * replaces "key", so the rest of the code keeps using plain keys.
 */
export function audienceStrings(t: Strings, audience: Audience): Strings {
  const suffix = `#${audience}`;
  const out = { ...t };
  for (const key of Object.keys(t)) {
    if (key.endsWith(suffix)) out[key.slice(0, -suffix.length)] = t[key];
  }
  return out;
}

export const inputClass =
  "w-full rounded-lg border border-stone-200 bg-white px-4 py-2 focus:border-teal-500 focus:ring-1 focus:ring-teal-500";

export function fill(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, k) => String(values[k] ?? ""));
}

export function SpanText({ spans, t }: { spans: Span[]; t: Strings }) {
  return (
    <>
      {spans.map((s, i) => (
        <span key={s.from}>
          {i > 0 && <span className="text-stone-500"> {t["wird.then"]} </span>}
          {s.from === s.to
            ? fill(t["wird.page"], { n: s.from })
            : fill(t["wird.range"], { from: s.from, to: s.to })}
        </span>
      ))}
    </>
  );
}

/**
 * Copy text. navigator.clipboard only exists in secure contexts (https or localhost),
 * so on a plain-http LAN address use a hidden textarea and execCommand instead.
 */
export async function copyText(text: string): Promise<boolean> {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (error) {
      console.warn("[wird] clipboard API failed, trying fallback:", error);
    }
  }
  try {
    const area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    area.setSelectionRange(0, text.length);
    const ok = document.execCommand("copy");
    area.remove();
    if (!ok) reportError("copy", new Error("execCommand('copy') returned false"));
    return ok;
  } catch (error) {
    reportError("copy", error);
    return false;
  }
}
