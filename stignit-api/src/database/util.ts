/** First row or null — the common `SELECT ... LIMIT 1` shape. */
export function first<T>(rows: T[]): T | null {
  return rows.length ? rows[0] : null;
}
