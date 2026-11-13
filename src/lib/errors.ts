/** Error kinds the app can show; WirdApp maps each to an Arabic message */
export type ErrorKind =
  | "load"
  | "save"
  | "copy"
  | "email_taken"
  | "forbidden"
  | "limit"
  | "unexpected";

export const ERROR_EVENT = "wird:error";

/** Log an error to the console and ask the app to show it to the user */
export function reportError(kind: ErrorKind, error: unknown) {
  console.error(`[wird] ${kind}:`, error);
  window.dispatchEvent(new CustomEvent<ErrorKind>(ERROR_EVENT, { detail: kind }));
}
