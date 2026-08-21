export const VISITOR_ID_KEY = 'kin_visitor_id';

/**
 * Generates a UUID v4.
 * Uses crypto.randomUUID if available, falls back to a math.random implementation.
 */
function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Gets the existing visitor ID from localStorage, or creates a new one.
 */
export function getOrCreateVisitorId(): string {
  if (typeof window === 'undefined') return 'server-side';
  
  let visitorId = localStorage.getItem(VISITOR_ID_KEY);
  if (!visitorId) {
    visitorId = generateUUID();
    localStorage.setItem(VISITOR_ID_KEY, visitorId);
  }
  return visitorId;
}
