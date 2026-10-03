import { envValidationSchema } from './env.validation';

const baseEnv = {
  POSTGRES_HOST: 'localhost',
  POSTGRES_PORT: '5432',
  POSTGRES_USER: 'u',
  POSTGRES_PASSWORD: 'p',
  POSTGRES_DB: 'db',
  JWT_SECRET: 'x'.repeat(32),
  REDIS_HOST: 'localhost',
  REDIS_PORT: '6379',
  MQTT_HOST: 'localhost',
  MQTT_PORT: '1883',
};

describe('envValidationSchema — AI insights', () => {
  it('defaults to disabled and needs no GROQ_API_KEY', () => {
    const { error, value } = envValidationSchema.validate(baseEnv);
    expect(error).toBeUndefined();
    expect(value.AI_INSIGHTS_ENABLED).toBe(false);
    expect(value.GROQ_MODEL).toBe('llama-3.1-8b-instant');
    expect(value.AI_INSIGHTS_TIMEOUT_MS).toBe(4000);
  });

  it('accepts an empty GROQ_API_KEY while disabled', () => {
    const { error } = envValidationSchema.validate({
      ...baseEnv,
      AI_INSIGHTS_ENABLED: 'false',
      GROQ_API_KEY: '',
    });
    expect(error).toBeUndefined();
  });

  it('fails at boot when enabled without a GROQ_API_KEY', () => {
    const { error } = envValidationSchema.validate({
      ...baseEnv,
      AI_INSIGHTS_ENABLED: 'true',
      GROQ_API_KEY: '',
    });
    expect(error).toBeDefined();
    expect(error?.message).toContain('GROQ_API_KEY');
  });

  it('passes when enabled with a key', () => {
    const { error } = envValidationSchema.validate({
      ...baseEnv,
      AI_INSIGHTS_ENABLED: 'true',
      GROQ_API_KEY: 'gsk_test',
    });
    expect(error).toBeUndefined();
  });
});

describe('envValidationSchema — admin seed variables', () => {
  it('does not inject default admin credentials', () => {
    const { value } = envValidationSchema.validate(baseEnv);
    expect(value.DEFAULT_ADMIN_EMAIL).toBeUndefined();
    expect(value.DEFAULT_ADMIN_PASSWORD).toBeUndefined();
  });

  it('still boots when the seed variables are present but blank', () => {
    const { error } = envValidationSchema.validate({
      ...baseEnv,
      DEFAULT_ADMIN_EMAIL: '',
      DEFAULT_ADMIN_PASSWORD: '',
    });
    expect(error).toBeUndefined();
  });
});
