import { createCipheriv, createDecipheriv, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

/** AES-256-GCM encrypt/decrypt for values that must never sit in Redis as plaintext (R8). */
export function encrypt(key: string, plaintext: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', Buffer.from(key, 'utf8'), iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return [iv, authTag, ciphertext].map((part) => part.toString('base64')).join('.');
}

export function decrypt(key: string, payload: string): string {
  const [ivB64, authTagB64, ciphertextB64] = payload.split('.');
  const decipher = createDecipheriv('aes-256-gcm', Buffer.from(key, 'utf8'), Buffer.from(ivB64, 'base64'));
  decipher.setAuthTag(Buffer.from(authTagB64, 'base64'));
  return Buffer.concat([decipher.update(Buffer.from(ciphertextB64, 'base64')), decipher.final()]).toString('utf8');
}

/** Signs a cookie value with HMAC-SHA256 so a client can never forge a `sessionId`. */
export function signCookieValue(secret: string, value: string): string {
  const signature = createHmac('sha256', secret).update(value).digest('base64url');
  return `${value}.${signature}`;
}

/** Verifies a signed cookie value; returns the original value, or `null` if invalid. */
export function verifyCookieValue(secret: string, signed: string): string | null {
  const separator = signed.lastIndexOf('.');
  if (separator < 0) return null;
  const value = signed.slice(0, separator);
  const signature = signed.slice(separator + 1);
  const expected = createHmac('sha256', secret).update(value).digest('base64url');
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  return value;
}
