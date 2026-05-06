import 'server-only';
import bcrypt from 'bcrypt';

const COST = 12;

/** One-way hash a plaintext password using bcrypt cost 12. */
export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, COST);
}

/** Compare a plaintext password against a stored bcrypt hash. */
export function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}
