// The only way the app writes timestamps: ISO 8601 UTC, e.g. 2026-10-02T14:00:00.000Z.
// SQLite's datetime('now') is never used, so string comparisons stay correct (design F10).
export const now = (): string => new Date().toISOString();
