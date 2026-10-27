import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/** Merge Tailwind CSS classes, handling conflicts properly */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
