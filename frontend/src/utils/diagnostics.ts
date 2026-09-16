// Only category and status are logged. Never pass payloads, URLs, errors or identifiers.
export function diagnostic(category: string, status?: number) {
  if (__DEV__) console.warn(`[NekSathi] ${category}`, status ?? 'unavailable');
}