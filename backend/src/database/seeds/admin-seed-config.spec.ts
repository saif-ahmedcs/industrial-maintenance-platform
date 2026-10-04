import {
  KNOWN_INSECURE_ADMIN_PASSWORDS,
  resolveDefaultAdminCredentials,
} from './admin-seed-config';

const STRONG_PASSWORD = 'correct-horse-battery-staple';

describe('resolveDefaultAdminCredentials', () => {
  it('returns the configured credentials', () => {
    expect(
      resolveDefaultAdminCredentials({
        DEFAULT_ADMIN_EMAIL: 'ops@plant.com',
        DEFAULT_ADMIN_PASSWORD: STRONG_PASSWORD,
      }),
    ).toEqual({ email: 'ops@plant.com', password: STRONG_PASSWORD });
  });

  it('fails when DEFAULT_ADMIN_EMAIL is unset (no fallback)', () => {
    expect(() =>
      resolveDefaultAdminCredentials({
        DEFAULT_ADMIN_PASSWORD: STRONG_PASSWORD,
      }),
    ).toThrow(/DEFAULT_ADMIN_EMAIL is required/);
  });

  it('fails when DEFAULT_ADMIN_PASSWORD is unset (no fallback)', () => {
    expect(() =>
      resolveDefaultAdminCredentials({
        DEFAULT_ADMIN_EMAIL: 'ops@plant.com',
      }),
    ).toThrow(/DEFAULT_ADMIN_PASSWORD is required/);
  });

  it('fails when values are blank, as in an unedited .env.example copy', () => {
    expect(() =>
      resolveDefaultAdminCredentials({
        DEFAULT_ADMIN_EMAIL: '',
        DEFAULT_ADMIN_PASSWORD: '',
      }),
    ).toThrow(/DEFAULT_ADMIN_(EMAIL|PASSWORD) is required/);
  });

  it('rejects the previously shipped demo password', () => {
    for (const known of KNOWN_INSECURE_ADMIN_PASSWORDS) {
      expect(() =>
        resolveDefaultAdminCredentials({
          DEFAULT_ADMIN_EMAIL: 'ops@plant.com',
          DEFAULT_ADMIN_PASSWORD: known,
        }),
      ).toThrow(/publicly known demo value/);
    }
  });

  it('rejects passwords shorter than 12 characters', () => {
    expect(() =>
      resolveDefaultAdminCredentials({
        DEFAULT_ADMIN_EMAIL: 'ops@plant.com',
        DEFAULT_ADMIN_PASSWORD: 'short-pass1',
      }),
    ).toThrow(/at least 12 characters/);
  });

  it('rejects a malformed email', () => {
    expect(() =>
      resolveDefaultAdminCredentials({
        DEFAULT_ADMIN_EMAIL: 'not-an-email',
        DEFAULT_ADMIN_PASSWORD: STRONG_PASSWORD,
      }),
    ).toThrow(/DEFAULT_ADMIN_EMAIL/);
  });

  it('reports every problem at once', () => {
    expect(() =>
      resolveDefaultAdminCredentials({
        DEFAULT_ADMIN_EMAIL: 'not-an-email',
        DEFAULT_ADMIN_PASSWORD: 'x',
      }),
    ).toThrow(/DEFAULT_ADMIN_EMAIL[\s\S]*DEFAULT_ADMIN_PASSWORD/);
  });
});
