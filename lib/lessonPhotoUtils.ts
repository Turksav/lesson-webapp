/**
 * Parses photo_url from user_progress: single URL (legacy) or JSON array of URLs.
 * Returns empty array for null/empty; single URL as [url]; multiple as string[].
 */
export function parsePhotoUrl(value: string | null | undefined): string[] {
  if (value == null || value === '') return [];
  const trimmed = value.trim();
  if (!trimmed) return [];
  if (trimmed.startsWith('[')) {
    try {
      const arr = JSON.parse(trimmed) as unknown;
      return Array.isArray(arr) ? arr.filter((x): x is string => typeof x === 'string') : [trimmed];
    } catch {
      return [trimmed];
    }
  }
  return [trimmed];
}
