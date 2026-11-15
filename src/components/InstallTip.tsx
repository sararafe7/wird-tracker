import { Download, X } from "lucide-react";
import { useEffect, useState } from "react";
import type { Strings } from "@/components/ui";

const CLOSED_KEY = "wird:install-tip-closed";

type Phone = "ios" | "android";

/** iPhone (and iPad, which reports itself as a Mac with touch) or Android; nothing on computers */
function phoneKind(): Phone | null {
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)) {
    return "ios";
  }
  return /Android/.test(ua) ? "android" : null;
}

/** Already opened from the home screen */
function standalone(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

/** Chrome on Android offers its own install prompt; this is its event */
interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
}

/**
 * A one-time tip on phones: how to add the app to the home screen. Not shown when the app is
 * already opened from there, and never again once closed on this device.
 */
export function InstallTip({ t }: { t: Strings }) {
  const [phone] = useState(phoneKind);
  const [shown, setShown] = useState(() => {
    if (!phone || standalone()) return false;
    try {
      return localStorage.getItem(CLOSED_KEY) !== "1";
    } catch {
      return true;
    }
  });
  const [install, setInstall] = useState<InstallPromptEvent | null>(null);

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setInstall(e as InstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  function close() {
    setShown(false);
    try {
      localStorage.setItem(CLOSED_KEY, "1");
    } catch {
      // Private browsing: it shows again next time
    }
  }

  if (!shown || !phone) return null;
  return (
    <aside
      className="card space-y-2 border-hasanat/30 bg-hasanat/5 !p-4"
      aria-labelledby="install-tip-title"
    >
      <div className="flex items-start justify-between gap-2">
        <h2 id="install-tip-title" className="font-semibold text-slate-900">
          {t["install.title"]}
        </h2>
        <button
          type="button"
          onClick={close}
          aria-label={t["install.close"]}
          className="rounded-lg p-1.5 text-stone-500 hover:bg-white hover:text-slate-700"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
      <p className="text-sm text-slate-700">{t[`install.${phone}`]}</p>
      <p className="text-xs text-stone-500">{t["install.why"]}</p>
      {install && (
        <button
          type="button"
          className="btn-primary !px-4 !py-2 text-sm"
          onClick={async () => {
            await install.prompt();
            close();
          }}
        >
          <Download className="h-4 w-4" aria-hidden="true" />
          {t["install.button"]}
        </button>
      )}
    </aside>
  );
}
