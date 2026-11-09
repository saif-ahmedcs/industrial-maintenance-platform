import { defaultThrottleLimit } from './default-throttle';

describe('defaultThrottleLimit', () => {
  const ORIGINAL_ENV = process.env.DEFAULT_RATE_LIMIT;

  afterEach(() => {
    if (ORIGINAL_ENV === undefined) {
      delete process.env.DEFAULT_RATE_LIMIT;
    } else {
      process.env.DEFAULT_RATE_LIMIT = ORIGINAL_ENV;
    }
  });

  it('falls back to the production default of 60 when unset', () => {
    delete process.env.DEFAULT_RATE_LIMIT;
    expect(defaultThrottleLimit()).toBe(60);
  });

  it('falls back to the production default when set to an empty string', () => {
    process.env.DEFAULT_RATE_LIMIT = '';
    expect(defaultThrottleLimit()).toBe(60);
  });

  it('uses the env override when it is a valid positive number', () => {
    process.env.DEFAULT_RATE_LIMIT = '1000';
    expect(defaultThrottleLimit()).toBe(1000);
  });

  it('falls back to the production default for a non-numeric value', () => {
    process.env.DEFAULT_RATE_LIMIT = 'not-a-number';
    expect(defaultThrottleLimit()).toBe(60);
  });

  it('falls back to the production default for a non-positive value', () => {
    process.env.DEFAULT_RATE_LIMIT = '0';
    expect(defaultThrottleLimit()).toBe(60);

    process.env.DEFAULT_RATE_LIMIT = '-5';
    expect(defaultThrottleLimit()).toBe(60);
  });
});
