/**
 * Build the full URL for an uploaded image.
 *
 * In development the Vite proxy forwards /uploads → localhost:5000/uploads,
 * so we can use a relative path.  In production set VITE_UPLOAD_BASE to the
 * backend domain (e.g. https://api.yourdomain.com).
 *
 * Never hard-code localhost here — the proxy handles it automatically.
 */
export const UPLOAD_BASE =
  import.meta.env.VITE_UPLOAD_BASE?.replace(/\/$/, '') || '';

/**
 * Convert a stored upload path like "/uploads/gallery/img.png" into a
 * browser-loadable URL.
 *
 *  - Relative paths  (/uploads/...)  → prepend UPLOAD_BASE (empty in dev)
 *  - Absolute URLs   (http://...)    → returned unchanged
 *  - Empty / null                    → returns ''
 */
export function imgUrl(path: string | null | undefined): string {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  return `${UPLOAD_BASE}${path}`;
}
