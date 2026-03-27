/**
 * Shared utility functions.
 */

/**
 * Extract initials from a full name (first and last).
 * Example: "Maria Clara Santos" → "MS"
 */
export function getInitials(name: string): string {
  return name
    .split(" ")
    .filter((_, i, arr) => i === 0 || i === arr.length - 1)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

/**
 * Generate a simple unique id with an optional prefix.
 * Example: generateId("msg") → "msg-1710504000000"
 */
export function generateId(prefix = "id"): string {
  return `${prefix}-${Date.now()}`;
}
