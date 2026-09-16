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

  DEFAULT_ADMIN_EMAIL: Joi.string().email().default('admin@example.com'),
  DEFAULT_ADMIN_PASSWORD: Joi.string().min(8).default('ChangeMe123!'),

  REDIS_HOST: Joi.string().required(),
  REDIS_PORT: Joi.number().required(),

  MQTT_HOST: Joi.string().required(),
  MQTT_PORT: Joi.number().required(),
});
