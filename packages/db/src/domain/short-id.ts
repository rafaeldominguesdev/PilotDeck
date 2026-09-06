const PREFIX = /^[A-Z0-9]{2,4}$/;
/** Parent (`AGB-5`) or nested child (`OVK-5.4`, `OC-1.2.3`). */
const SHORT_ID = /^[A-Z0-9]{2,4}-\d+(?:\.\d+)*$/i;

export function isValidPrefix(prefix: string): boolean {
  return PREFIX.test(prefix);
}

export function formatShortId(prefix: string, n: number): string {
  return `${prefix}-${n}`;
}

/**
 * Suggests a card prefix from a project name: initials when the name has more
 * than one word (`PilotDeck` → `AB`, `PilotDeck` → `OC`), the first letters
 * otherwise (`pilotdeck` → `OVE`). Returns null when the name has nothing to
 * derive from, so the caller can ask for an explicit prefix instead of
 * inventing one.
 */
export function derivePrefix(name: string): string | null {
  const words = name
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    // camelCase and PascalCase read as separate words: PilotDeck → OC.
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .toUpperCase()
    .split(/[^A-Z0-9]+/)
    .filter(Boolean);
  if (words.length === 0) return null;

  const first = words[0] ?? "";
  const candidate =
    words.length === 1
      ? first.slice(0, 3)
      : words
          .map((word) => word.slice(0, 1))
          .join("")
          .slice(0, 4);
  return isValidPrefix(candidate) ? candidate : null;
}

export function normalizeShortId(value: string): string {
  return value.trim().toUpperCase();
}

export function isShortId(value: string): boolean {
  return SHORT_ID.test(value.trim());
}

export function nextShortId(
  prefix: string,
  currentNumber: number,
): { shortId: string; nextNumber: number } {
  return {
    shortId: formatShortId(prefix, currentNumber),
    nextNumber: currentNumber + 1,
  };
}
