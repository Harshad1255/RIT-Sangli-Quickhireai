const REQUIRED_ENV_VARS = ['MONGODB_URI', 'JWT_SECRET'];

function validateEnvironment({ env = process.env, warnOnly = false } = {}) {
  const isProduction = (env.NODE_ENV || '').toLowerCase() === 'production';
  const missing = REQUIRED_ENV_VARS.filter((name) => !env[name]);
  const weakSecret = Boolean(
    env.JWT_SECRET &&
    env.JWT_SECRET.length < 32 &&
    isProduction
  );

  if (!isProduction && !env.GEMINI_API_KEY) {
    // Gemini is optional in development, but we warn loudly during startup.
  }

  if (isProduction && !env.GEMINI_API_KEY) {
    missing.push('GEMINI_API_KEY');
  }

  const ok = missing.length === 0 && !(weakSecret && isProduction);
  return {
    ok,
    isProduction,
    missing,
    weakSecret,
    warnings: [
      ...(warnOnly ? [] : []),
    ],
  };
}

module.exports = { validateEnvironment, REQUIRED_ENV_VARS };
