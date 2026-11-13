import { randomInt } from 'node:crypto';

const LOWERCASE = 'abcdefghjkmnpqrstuvwxyz';
const UPPERCASE = 'ABCDEFGHJKMNPQRSTUVWXYZ';
const DIGITS = '23456789';
const SYMBOLS = '!@#$%^&*-_=+?';
const ALL_CHARS = LOWERCASE + UPPERCASE + DIGITS + SYMBOLS;

export const TEMPORARY_PASSWORD_LENGTH = 16;

export function generateTemporaryPassword(
  length: number = TEMPORARY_PASSWORD_LENGTH,
): string {
  if (length < 4) {
    throw new Error(
      'generateTemporaryPassword requires a length of at least 4',
    );
  }

  const required = [
    pickChar(LOWERCASE),
    pickChar(UPPERCASE),
    pickChar(DIGITS),
    pickChar(SYMBOLS),
  ];
  const remaining = Array.from({ length: length - required.length }, () =>
    pickChar(ALL_CHARS),
  );

  return shuffle([...required, ...remaining]).join('');
}

function pickChar(chars: string): string {
  return chars[randomInt(chars.length)];
}

function shuffle<T>(items: T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
