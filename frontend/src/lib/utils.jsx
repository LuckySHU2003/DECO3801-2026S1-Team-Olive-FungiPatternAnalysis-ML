// Utility: merges Tailwind class names safely
// clsx handles conditional logic; twMerge removes conflicting Tailwind classes
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Combines multiple class strings/objects into a single deduplicated string.
 * @param {...any} inputs - Class strings, arrays, or objects
 * @returns {string} Merged class string
 */
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}
