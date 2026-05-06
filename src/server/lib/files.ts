import 'server-only';
import path from 'node:path';

/**
 * Resolve `userPath` underneath `root` and assert the result stays inside
 * `root`. Defends against `..` traversal, URL-encoded variants, and
 * absolute-path injection. Throws on violation.
 */
export function safeJoin(root: string, userPath: string): string {
  if (typeof userPath !== 'string') {
    throw new Error('safeJoin: userPath must be a string');
  }

  // Reject obvious traversal attempts even before resolution. We decode once
  // to catch the URL-encoded `%2F` / `%5C` cases.
  let decoded: string;
  try {
    decoded = decodeURIComponent(userPath);
  } catch {
    throw new Error('safeJoin: malformed percent-encoding');
  }
  if (decoded.includes('\0')) {
    throw new Error('safeJoin: NUL byte rejected');
  }
  if (path.isAbsolute(decoded)) {
    throw new Error('safeJoin: absolute path rejected');
  }
  // After decoding, look for any `..` segment.
  const parts = decoded.split(/[\\/]+/);
  if (parts.some((segment) => segment === '..')) {
    throw new Error('safeJoin: parent-traversal rejected');
  }

  const absRoot = path.resolve(root);
  const resolved = path.resolve(absRoot, decoded);
  // The resolved path must equal `root` or be a strict descendant of it.
  const rootWithSep = absRoot.endsWith(path.sep) ? absRoot : absRoot + path.sep;
  if (resolved !== absRoot && !resolved.startsWith(rootWithSep)) {
    throw new Error('safeJoin: path escapes root');
  }
  return resolved;
}

/** Resolve `./uploads` to an absolute path rooted at the project. */
export function uploadRoot(): string {
  return path.resolve(process.cwd(), 'uploads');
}

// SVG is intentionally excluded — SVGs can carry <script>/on* handlers and
// execute when navigated to directly under /uploads/.
const MIME_EXT_MAP: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'application/pdf': 'pdf',
};

/** Map a known MIME type to its canonical lowercase file extension. */
export function extFromMime(mime: string): string {
  const ext = MIME_EXT_MAP[mime.toLowerCase()];
  if (!ext) {
    throw new Error(`Unsupported MIME type: ${mime}`);
  }
  return ext;
}

export const ALLOWED_MIME_TYPES = Object.keys(MIME_EXT_MAP);
