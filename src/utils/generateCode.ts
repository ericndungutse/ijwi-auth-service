import crypto from 'crypto';

export function generateSixDigitCode(): number {
  return Math.floor(100000 + Math.random() * 900000);
}

export function hashDigitCode(code: number | string): string {
  return crypto.createHash('sha256').update(String(code)).digest('hex');
}
