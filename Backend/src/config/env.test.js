const { validateEnvironment } = require('./env');

describe('environment validation', () => {
  const baseEnv = {
    NODE_ENV: 'development',
    MONGODB_URI: 'mongodb://localhost:27017/testdb',
    JWT_SECRET: 'abcdefghijklmnopqrstuvwxyz123456',
    GEMINI_API_KEY: 'test-key',
  };

  it('returns ok when all required values are present', () => {
    expect(validateEnvironment({ env: baseEnv, warnOnly: false }).ok).toBe(true);
  });

  it('flags a missing MONGODB_URI', () => {
    const env = { ...baseEnv, MONGODB_URI: '' };
    const result = validateEnvironment({ env });
    expect(result.missing).toContain('MONGODB_URI');
    expect(result.ok).toBe(false);
  });

  it('flags a missing JWT_SECRET', () => {
    const env = { ...baseEnv, JWT_SECRET: '' };
    const result = validateEnvironment({ env });
    expect(result.missing).toContain('JWT_SECRET');
    expect(result.ok).toBe(false);
  });

  it('flags a weak JWT_SECRET in production', () => {
    const env = { ...baseEnv, NODE_ENV: 'production', JWT_SECRET: 'short' };
    const result = validateEnvironment({ env });
    expect(result.weakSecret).toBe(true);
    expect(result.ok).toBe(false);
  });

  it('allows missing GEMINI_API_KEY in development while requiring it in production', () => {
    const dev = { ...baseEnv, GEMINI_API_KEY: '' };
    const prod = { ...baseEnv, NODE_ENV: 'production', GEMINI_API_KEY: '' };

    expect(validateEnvironment({ env: dev }).ok).toBe(true);
    expect(validateEnvironment({ env: prod }).missing).toContain('GEMINI_API_KEY');
  });
});
