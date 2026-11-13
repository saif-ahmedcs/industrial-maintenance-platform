import {
  generateTemporaryPassword,
  TEMPORARY_PASSWORD_LENGTH,
} from './generate-temporary-password';

describe('generateTemporaryPassword', () => {
  it('defaults to a length well above the 12-character minimum (docs/decisions.md #13)', () => {
    expect(TEMPORARY_PASSWORD_LENGTH).toBeGreaterThanOrEqual(12);
    expect(generateTemporaryPassword()).toHaveLength(TEMPORARY_PASSWORD_LENGTH);
  });

  it('honors an explicit length', () => {
    expect(generateTemporaryPassword(20)).toHaveLength(20);
  });

  it('rejects a length too short to guarantee character variety', () => {
    expect(() => generateTemporaryPassword(3)).toThrow();
  });

  it('always includes at least one lowercase, uppercase, digit, and symbol', () => {
    for (let i = 0; i < 50; i++) {
      const password = generateTemporaryPassword();
      expect(password).toMatch(/[a-z]/);
      expect(password).toMatch(/[A-Z]/);
      expect(password).toMatch(/[0-9]/);
      expect(password).toMatch(/[!@#$%^&*\-_=+?]/);
    }
  });

  it('never contains visually ambiguous characters (0/O, 1/l/I)', () => {
    for (let i = 0; i < 50; i++) {
      expect(generateTemporaryPassword()).not.toMatch(/[0O1lI]/);
    }
  });

  it('is not deterministic across calls', () => {
    const passwords = new Set(
      Array.from({ length: 20 }, () => generateTemporaryPassword()),
    );
    expect(passwords.size).toBe(20);
  });
});
