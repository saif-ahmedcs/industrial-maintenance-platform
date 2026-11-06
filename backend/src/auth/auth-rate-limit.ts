function authRateLimit(envVar: string, productionDefault: number) {
  return (): number => {
    const raw = process.env[envVar];
    if (raw === undefined || raw === '') return productionDefault;
    const parsed = Number(raw);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : productionDefault;
  };
}

export const AUTH_REGISTER_THROTTLE = {
  limit: authRateLimit('AUTH_REGISTER_RATE_LIMIT', 5),
  ttl: 60_000,
};

export const AUTH_LOGIN_THROTTLE = {
  limit: authRateLimit('AUTH_LOGIN_RATE_LIMIT', 5),
  ttl: 60_000,
};

export const AUTH_REFRESH_THROTTLE = {
  limit: authRateLimit('AUTH_REFRESH_RATE_LIMIT', 10),
  ttl: 60_000,
};
