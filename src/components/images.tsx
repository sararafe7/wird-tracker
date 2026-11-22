import { ImagePlus, Trash2 } from "lucide-react";
import { useRef, useState } from "react";
import type { Strings } from "@/components/ui";
import { reportError } from "@/lib/errors";
import type { Op } from "@/lib/ops";
import { imageUrl } from "@/lib/store";
import { cn } from "@/utils/cn";

const SIZE = 256;
const TARGET_BYTES = 50 * 1024;

function canvasBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality: number,
): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

function dataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

async function loadImage(file: File): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    return img;
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** The picture fitted inside a square canvas, nothing cropped, on a transparent background */
function drawSquare(img: HTMLImageElement, size: number): HTMLCanvasElement {
  const scale = Math.min(size / img.naturalWidth, size / img.naturalHeight, 1);
  const w = Math.max(1, Math.round(img.naturalWidth * scale));
  const h = Math.max(1, Math.round(img.naturalHeight * scale));
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("no canvas");
  ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h);
  return canvas;
}

function hasTransparency(canvas: HTMLCanvasElement): boolean {
  const ctx = canvas.getContext("2d");
  if (!ctx) return true;
  const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
  for (let i = 3; i < data.length; i += 4) if (data[i] < 255) return true;
  return false;
}

/**
 * Fit the picture inside a 256px square (nothing cropped) and compress it under 50 KB, on the
 * phone, before it is uploaded. Transparency is always kept: WebP first; browsers that can't
 * encode WebP (some iPhones) get PNG, smaller if needed. Only a fully opaque picture may become
 * JPEG, so a light logo never ends up on a white square.
 */
export async function shrinkImage(file: File): Promise<string> {
  const img = await loadImage(file);
  const canvas = drawSquare(img, SIZE);
  for (const quality of [0.9, 0.8, 0.7, 0.6, 0.5, 0.4]) {
    const blob = await canvasBlob(canvas, "image/webp", quality);
    if (!blob || blob.type !== "image/webp") break; // this browser can't encode WebP
    if (blob.size <= TARGET_BYTES) return dataUrl(blob);
  }
  if (hasTransparency(canvas)) {
    for (const size of [256, 224, 192, 160, 128, 96]) {
      const blob = await canvasBlob(drawSquare(img, size), "image/png", 1);
      if (blob && blob.size <= TARGET_BYTES) return dataUrl(blob);
    }
  } else {
    for (const quality of [0.9, 0.8, 0.7, 0.6, 0.5, 0.4]) {
      const blob = await canvasBlob(canvas, "image/jpeg", quality);
      if (blob && blob.type === "image/jpeg" && blob.size <= TARGET_BYTES) return dataUrl(blob);
    }
  }
  throw new Error("image too large after compression");
}

/**
 * An initiative's image; nothing when there is none. An image marked «بدون دائرة» (a light logo) sits
 * on a dark circle in today's colour, so its light parts stay visible on white.
 */
export function Thumb({
  id,
  version,
  className,
  plain = false,
  dark,
}: {
  id: string;
  version: string | null;
  className?: string;
  plain?: boolean;
  dark?: string; // the dark circle's colour, for plain icons
}) {
  if (!version) return null;
  if (plain) {
    return (
      <span
        className={cn("flex shrink-0 items-center justify-center rounded-full p-1", className)}
        style={{ backgroundColor: dark }}
      >
        <img src={imageUrl(id, version)} alt="" className="h-full w-full object-contain" />
      </span>
    );
  }
  return (
    <img
      src={imageUrl(id, version)}
      alt=""
      className={cn("shrink-0 rounded-lg bg-white object-contain", className)}
    />
  );
}

/** Upload, replace or remove an initiative's image (its supervisors only) */
export function ImagePicker({
  t,
  id,
  version,
  plain,
  dark,
  label,
  apply,
}: {
  t: Strings;
  id: string;
  version: string | null;
  plain: boolean;
  dark: string;
  label: string;
  apply: (op: Op) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  // Before there is an image, the choice waits here and goes with the upload
  const [plainChoice, setPlainChoice] = useState(plain);
  const plainNow = version ? plain : plainChoice;

  async function pick(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    try {
      apply({ type: "imageSet", id, image: await shrinkImage(file), plain: plainNow });
    } catch (error) {
      reportError("image", error);
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }

  return (
    <div className="flex items-center gap-3">
      {version ? (
        <Thumb
          id={id}
          version={version}
          plain={plainNow}
          dark={dark}
          className={cn("h-14 w-14", !plainNow && "border")}
        />
      ) : (
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg border border-dashed border-stone-300 text-stone-400">
          <ImagePlus className="h-6 w-6" aria-hidden="true" />
        </span>
      )}
      <div className="min-w-0 flex-1 space-y-1">
        <span className="block text-sm font-medium">{label}</span>
        <div className="flex flex-wrap gap-2">
          <label
            className={cn(
              "btn-secondary cursor-pointer !px-3 !py-1.5 text-sm",
              busy && "opacity-50",
            )}
          >
            <ImagePlus className="h-4 w-4" aria-hidden="true" />
            {version ? t["image.replace"] : t["image.upload"]}
            <input
              ref={input}
              type="file"
              accept="image/*"
              disabled={busy}
              className="sr-only"
              onChange={(e) => pick(e.target.files?.[0])}
            />
          </label>
          {version && (
            <button
              type="button"
              className="btn-secondary !px-3 !py-1.5 text-sm text-red-700"
              onClick={() => apply({ type: "imageSet", id, image: null })}
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
              {t["image.remove"]}
            </button>
          )}
        </div>
        <p className="text-xs text-stone-500">{t["image.hint"]}</p>
        <label className="flex items-center gap-2 text-xs text-stone-600">
          <input
            type="checkbox"
            checked={plainNow}
            onChange={(e) => {
              setPlainChoice(e.target.checked);
              if (version) apply({ type: "imagePlain", id, plain: e.target.checked });
            }}
            className="h-4 w-4 accent-[var(--color-hasanat)]"
          />
          {t["image.plain"]}
        </label>
      </div>
    </div>
  );
}
