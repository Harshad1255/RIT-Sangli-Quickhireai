const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { validateEnv } = require('../../src/config/validateEnv');

const validProductionEnv = {
  NODE_ENV: 'production',
  MONGODB_URI: 'mongodb://localhost/test',
  JWT_SECRET: 'synthetic-test-secret-value-at-least-32-chars',
  GEMINI_API_KEY: 'synthetic-test-gemini-placeholder',
};

describe('validateEnv', () => {
  it.each([
    ['a) missing MONGODB_URI', { MONGODB_URI: '' }, ['MONGODB_URI']],
    ['b) missing JWT_SECRET', { JWT_SECRET: '' }, ['JWT_SECRET']],
    ['c) missing GEMINI_API_KEY', { GEMINI_API_KEY: '' }, ['GEMINI_API_KEY']],
    ['d) short JWT_SECRET', { JWT_SECRET: 'short' }, ['JWT_SECRET']],
  ])('rejects %s in production', (_caseName, overrides, expectedVariables) => {
    const result = validateEnv({ ...validProductionEnv, ...overrides });

    expect(result.valid).toBe(false);
    expect(result.invalidVariables).toEqual(expectedVariables);
  });

  it('accepts e) all valid production variables', () => {
    expect(validateEnv(validProductionEnv)).toEqual({
      valid: true,
      invalidVariables: [],
      warnings: [],
    });
  });

  it('requires MongoDB and JWT in development while warning when Gemini is absent', () => {
    expect(validateEnv({
      NODE_ENV: 'development',
      MONGODB_URI: 'mongodb://localhost/test',
      JWT_SECRET: 'development-secret',
    })).toEqual({
      valid: true,
      invalidVariables: [],
      warnings: ['GEMINI_API_KEY'],
    });

    expect(validateEnv({ NODE_ENV: 'development' })).toEqual({
      valid: false,
      invalidVariables: ['MONGODB_URI', 'JWT_SECRET'],
      warnings: ['GEMINI_API_KEY'],
    });
  });

  it('exits before server startup when production config is absent', () => {
    const serverPath = path.resolve(__dirname, '../../server.js');
    const child = spawnSync(process.execPath, [serverPath], {
      cwd: path.dirname(serverPath),
      env: {
        NODE_ENV: 'production',
      },
      encoding: 'utf8',
      timeout: 10000,
    });

    expect(child.status).toBe(1);
    expect(child.stderr).toContain('MONGODB_URI');
    expect(child.stderr).toContain('JWT_SECRET');
    expect(child.stderr).toContain('GEMINI_API_KEY');
    expect(child.stdout).toBe('');
  });
});