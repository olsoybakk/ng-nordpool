/**
 * Writes to localStorage, silently no-op on failure (quota exceeded, private browsing, disabled
 * storage). Without this, a single throw from a raw `localStorage.setItem` inside an NgRx effect's
 * `tap` permanently kills that effect's subscription for the rest of the session.
 */
export function safeLocalStorageSet(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Persistence is best-effort; the in-memory state remains correct for this session.
  }
}
