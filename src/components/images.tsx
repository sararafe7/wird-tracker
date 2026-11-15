import { ImagePlus, Trash2 } from "lucide-react";
import { useRef, useState } from "react";
import type { Strings } from "@/components/ui";
import { reportError } from "@/lib/errors";
import type { Op } from "@/lib/ops";
import { type ImageTarget, imageUrl } from "@/lib/store";
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

/**
 * Fit the picture inside a 256px square (nothing cropped) and compress it under 50 KB,
 * on the phone, before it is uploaded. WebP keeps transparency; browsers that can't
 * encode WebP (older iPhones) get JPEG on white.
 */
export async function shrinkImage(file: File): Promise<string> {
  const img = await loadImage(file);
  const scale = Math.min(SIZE / img.naturalWidth, SIZE / img.naturalHeight, 1);
  const w = Math.max(1, Math.round(img.naturalWidth * scale));
  const h = Math.max(1, Math.round(img.naturalHeight * scale));
  const canvas = document.createElement("canvas");
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("no canvas");
  for (const type of ["image/webp", "image/jpeg"]) {
    ctx.clearRect(0, 0, SIZE, SIZE);
    if (type === "image/jpeg") {
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, SIZE, SIZE);
    }
    ctx.drawImage(img, (SIZE - w) / 2, (SIZE - h) / 2, w, h);
    for (const quality of [0.9, 0.8, 0.7, 0.6, 0.5, 0.4]) {
      const blob = await canvasBlob(canvas, type, quality);
      if (!blob || blob.type !== type) break; // this browser can't encode it
      if (blob.size <= TARGET_BYTES) return dataUrl(blob);
    }
  }
  throw new Error("image too large after compression");
}

/** A logo or group icon; nothing when there is none */
export function Thumb({
  target,
  id,
  version,
  className,
}: {
  target: ImageTarget;
  id: string;
  version: string | null;
  className?: string;
}) {
  if (!version) return null;
  return (
    <img
      src={imageUrl(target, id, version)}
      alt=""
      className={cn("shrink-0 rounded-lg bg-white object-contain", className)}
    />
  );
}

/** Upload, replace or remove a logo or group icon */
export function ImagePicker({
  t,
  target,
  id,
  version,
  label,
  apply,
}: {
  t: Strings;
  target: ImageTarget;
  id: string;
  version: string | null;
  label: string;
  apply: (op: Op) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function pick(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    try {
      apply({ type: "imageSet", target, id, image: await shrinkImage(file) });
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
        <Thumb target={target} id={id} version={version} className="h-14 w-14 border" />
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
              onClick={() => apply({ type: "imageSet", target, id, image: null })}
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
              {t["image.remove"]}
            </button>
          )}
        </div>
        <p className="text-xs text-stone-500">{t["image.hint"]}</p>
      </div>
    </div>
  );
}
