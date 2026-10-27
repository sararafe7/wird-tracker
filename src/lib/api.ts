import type { Op } from "@/lib/ops";
import type { Data } from "@/lib/store";

/** Browser-side calls to the app's API */

export type Session =
  | { kind: "ready"; data: Data; dev?: string[] }
  | { kind: "signed_out"; signInUrl: string; dev?: string[] }
  | { kind: "not_added"; email: string; dev?: string[] };

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export async function fetchSession(): Promise<Session> {
  const res = await fetch("/api/data", { credentials: "include", cache: "no-store" });
  const body = await res.json().catch(() => null);
  if (res.status === 401) return { kind: "signed_out", signInUrl: body?.signInUrl, dev: body?.dev };
  if (res.status === 403 && body?.reason === "not_added") {
    return { kind: "not_added", email: body.email, dev: body.dev };
  }
  if (!res.ok || !body) throw new ApiError(res.status, body?.error ?? "load failed");
  const { dev, ...data } = body as Data & { dev?: string[] };
  return { kind: "ready", data, dev };
}

export async function sendOp(op: Op): Promise<void> {
  const res = await fetch("/api/ops", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(op),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new ApiError(res.status, body?.error ?? "save failed");
  }
}
