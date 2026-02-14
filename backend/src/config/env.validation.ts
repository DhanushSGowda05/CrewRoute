import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  PORT: Joi.number().default(3000),

  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),

  DATABASE_URL: Joi.string().required(),

  REDIS_HOST: Joi.string().default('localhost'),
  REDIS_PORT: Joi.number().default(6379),
  REDIS_PASSWORD: Joi.string().allow('').optional(),

  CLERK_SECRET_KEY: Joi.string().required(),
  CLERK_PUBLISHABLE_KEY: Joi.string().required(),
  CLERK_WEBHOOK_SECRET: Joi.string().optional(),

  CLERK_MOCK_MODE: Joi.string()
    .valid('true', 'false')
    .default('true'),

  MAPS_PROVIDER: Joi.string()
    .valid('google', 'maptiler', 'ola')
    .required(),

  OLA_MAPS_API_KEY: Joi.when('MAPS_PROVIDER', {
    is: 'ola',
    then: Joi.string().required(),
    otherwise: Joi.string().optional(),
  }),

  GOOGLE_MAPS_API_KEY: Joi.when('MAPS_PROVIDER', {
    is: 'google',
    then: Joi.string().required(),
    otherwise: Joi.string().optional(),
  }),

  JWT_SECRET: Joi.string().optional(),
  JWT_EXPIRES_IN: Joi.string().optional(),

}).unknown(true);
