/**
 * Formats a Date object as a YYYY-MM-DD string in the user's LOCAL timezone.
 * This avoids the shift-by-one-day bug caused by .toISOString() timezone conversion.
 */
export function getLocalISODate(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Returns the backend API URL config.
 */
export function getAPIUrl(): string {
  return process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';
}
