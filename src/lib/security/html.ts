/**
 * Helpers for building transactional emails safely from user-provided data.
 */

/** Escape a value for interpolation into HTML text or a quoted attribute. */
export function escapeHtml(value: unknown): string {
  if (value === null || value === undefined) return ''
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/**
 * Normalize a value for a single-line context (email subject, plain-text
 * line): strips CR/LF and other control characters, collapses whitespace and
 * caps the length.
 */
export function toSingleLine(value: unknown, maxLength: number): string {
  if (value === null || value === undefined) return ''
  const clean = String(value)
    .replace(/[\u0000-\u001f\u007f]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  return clean.length > maxLength ? clean.slice(0, maxLength).trimEnd() : clean
}

/** Email subject: single line, no header injection, capped. */
export function sanitizeSubject(value: unknown, maxLength = 150): string {
  return toSingleLine(value, maxLength)
}

const EMAIL_RE = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/

/** Strict-ish email check used before sending to Resend. */
export function isValidEmail(value: unknown): value is string {
  return typeof value === 'string' && value.length <= 254 && EMAIL_RE.test(value)
}
