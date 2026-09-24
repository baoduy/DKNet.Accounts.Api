import { describe, expect, it } from 'vitest';
import { decrypt, encrypt, signCookieValue, verifyCookieValue } from './crypto';

const KEY = '0123456789abcdef0123456789abcdef';

describe('encrypt/decrypt', () => {
  it('round-trips a plaintext value', () => {
    const ciphertext = encrypt(KEY, 'MAI-CANARY-ACCESS-TOKEN');
    expect(ciphertext).not.toContain('MAI-CANARY-ACCESS-TOKEN');
    expect(decrypt(KEY, ciphertext)).toBe('MAI-CANARY-ACCESS-TOKEN');
  });

  it('produces a different ciphertext each time (random IV)', () => {
    expect(encrypt(KEY, 'same-plaintext')).not.toBe(encrypt(KEY, 'same-plaintext'));
  });

  it('refuses to decrypt with the wrong key (GCM auth tag fails)', () => {
    const ciphertext = encrypt(KEY, 'secret');
    const wrongKey = 'fedcba9876543210fedcba9876543210';
    expect(() => decrypt(wrongKey, ciphertext)).toThrow();
  });

  it('refuses to decrypt tampered ciphertext', () => {
    const ciphertext = encrypt(KEY, 'secret');
    const [iv, tag, body] = ciphertext.split('.');
    const tampered = [iv, tag, Buffer.from('tampered-body').toString('base64')].join('.');
    expect(() => decrypt(KEY, tampered)).toThrow();
  });
});

describe('signCookieValue/verifyCookieValue', () => {
  it('verifies a value it signed', () => {
    const signed = signCookieValue('secret', 'session-id-123');
    expect(verifyCookieValue('secret', signed)).toBe('session-id-123');
  });

  it('rejects a value signed with a different secret', () => {
    const signed = signCookieValue('secret-a', 'session-id-123');
    expect(verifyCookieValue('secret-b', signed)).toBeNull();
  });

  it('rejects a tampered value', () => {
    const signed = signCookieValue('secret', 'session-id-123');
    const tampered = signed.replace('session-id-123', 'session-id-999');
    expect(verifyCookieValue('secret', tampered)).toBeNull();
  });

  it('rejects a value with no signature', () => {
    expect(verifyCookieValue('secret', 'no-dot-here')).toBeNull();
  });
});
