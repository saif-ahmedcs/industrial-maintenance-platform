import * as Joi from 'joi';

export const MIN_DEFAULT_ADMIN_PASSWORD_LENGTH = 12;
export const KNOWN_INSECURE_ADMIN_PASSWORDS = ['ChangeMe123!'] as const;

export interface DefaultAdminCredentials {
  email: string;
  password: string;
}

const adminSeedSchema = Joi.object({
  DEFAULT_ADMIN_EMAIL: Joi.string().email().required().messages({
    'any.required':
      'DEFAULT_ADMIN_EMAIL is required to seed the admin account. Set it explicitly; no default is provided.',
    'string.empty':
      'DEFAULT_ADMIN_EMAIL is required to seed the admin account. Set it explicitly; no default is provided.',
  }),
  DEFAULT_ADMIN_PASSWORD: Joi.string()
    .min(MIN_DEFAULT_ADMIN_PASSWORD_LENGTH)
    .invalid(...KNOWN_INSECURE_ADMIN_PASSWORDS)
    .required()
    .messages({
      'any.required':
        'DEFAULT_ADMIN_PASSWORD is required to seed the admin account. Set it explicitly; no default is provided.',
      'string.empty':
        'DEFAULT_ADMIN_PASSWORD is required to seed the admin account. Set it explicitly; no default is provided.',
      'string.min': `DEFAULT_ADMIN_PASSWORD must be at least ${MIN_DEFAULT_ADMIN_PASSWORD_LENGTH} characters.`,
      'any.invalid':
        'DEFAULT_ADMIN_PASSWORD is a publicly known demo value. Choose a unique password.',
    }),
}).unknown(true);

export function resolveDefaultAdminCredentials(
  env: NodeJS.ProcessEnv,
): DefaultAdminCredentials {
  const { error, value } = adminSeedSchema.validate(env, {
    abortEarly: false,
  });
  if (error) {
    throw new Error(
      `Invalid admin seed configuration:\n- ${error.details
        .map((d) => d.message)
        .join('\n- ')}`,
    );
  }
  return {
    email: value.DEFAULT_ADMIN_EMAIL,
    password: value.DEFAULT_ADMIN_PASSWORD,
  };
}
