const { validateEnv } = require('../../src/config/validateEnv');

const baseEnv = {
  NODE_ENV: 'development',
  MONGODB_URI: 'mongodb://localhost/test',
  JWT_SECRET: 'development-test-secret'
};

describe('code execution startup configuration warnings', () => {
  test('warns when enabled Judge0 has no URL configured', () => {
    const result = validateEnv({
      ...baseEnv,
      CODE_EXECUTION_ENABLED: 'true',
      CODE_EXECUTION_PROVIDER: 'judge0'
    });

    expect(result.warnings.join(' ')).toMatch(/JUDGE0_API_URL/);
  });

  test('warns when enabled OneCompiler has no API key', () => {
    const result = validateEnv({
      ...baseEnv,
      CODE_EXECUTION_ENABLED: 'true',
      CODE_EXECUTION_PROVIDER: 'onecompiler',
      ONECOMPILER_API_URL: 'https://api.onecompiler.com/v1/run'
    });

    expect(result.warnings.join(' ')).toMatch(/ONECOMPILER_API_KEY/);
  });
});
