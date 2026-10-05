import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  PORT: Joi.number().default(3000),

  POSTGRES_HOST: Joi.string().required(),
  POSTGRES_PORT: Joi.number().required(),
  POSTGRES_USER: Joi.string().required(),
  POSTGRES_PASSWORD: Joi.string().required(),
  POSTGRES_DB: Joi.string().required(),

  DEFAULT_ADMIN_EMAIL: Joi.string().email().allow('').optional(),
  DEFAULT_ADMIN_PASSWORD: Joi.string().allow('').optional(),

  JWT_SECRET: Joi.string().min(32).required(),
  JWT_ACCESS_EXPIRES_IN: Joi.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN_DAYS: Joi.number().default(7),

  REDIS_HOST: Joi.string().required(),
  REDIS_PORT: Joi.number().required(),

  MQTT_HOST: Joi.string().required(),
  MQTT_PORT: Joi.number().required(),
  MQTT_BACKEND_PASSWORD: Joi.string().required(),

  AI_INSIGHTS_ENABLED: Joi.boolean().default(false),
  GROQ_API_KEY: Joi.when('AI_INSIGHTS_ENABLED', {
    is: true,
    then: Joi.string().required(),
    otherwise: Joi.string().allow('').optional(),
  }),
  GROQ_MODEL: Joi.string().default('llama-3.1-8b-instant'),
  AI_INSIGHTS_TIMEOUT_MS: Joi.number().integer().min(500).default(4000),
});
