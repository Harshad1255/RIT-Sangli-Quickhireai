const REQUIRED_ENV_VARS = ['MONGODB_URI', 'JWT_SECRET'];

function validateEnv(env = process.env) {
  const isProduction = env.NODE_ENV === 'production';
  const invalidVariables = REQUIRED_ENV_VARS.filter((name) => (
    typeof env[name] !== 'string' || env[name].trim() === ''
  ));
  const warnings = [];

  if (isProduction && !env.GEMINI_API_KEY) {
    invalidVariables.push('GEMINI_API_KEY');
  } else if (!isProduction && !env.GEMINI_API_KEY) {
    warnings.push('GEMINI_API_KEY');
  }

  if (isProduction && env.JWT_SECRET && env.JWT_SECRET.length < 32) {
    invalidVariables.push('JWT_SECRET');
  }

  return {
    valid: invalidVariables.length === 0,
    invalidVariables: [...new Set(invalidVariables)],
    warnings,
  };
}

module.exports = { validateEnv };