const { normalizeOutput } = require('../Backend/src/shared/services/codeExecution/normalizeOutput');
const { getWorstVerdict, VERDICTS } = require('../Backend/src/shared/services/codeExecution/verdicts');
const { normalizeLanguage } = require('../Backend/src/shared/services/codeExecution/languageMap');

describe('Code Execution Utilities', () => {
  describe('normalizeOutput', () => {
    it('normalizes carriage returns and trailing whitespace', () => {
      const raw = "Line 1 \r\nLine 2\t\r\n\r\n";
      const expected = "Line 1\nLine 2";
      expect(normalizeOutput(raw)).toBe(expected);
    });

    it('handles empty output', () => {
      expect(normalizeOutput('')).toBe('');
      expect(normalizeOutput(null)).toBe('');
      expect(normalizeOutput(undefined)).toBe('');
    });
  });

  describe('getWorstVerdict', () => {
    it('returns the higher priority (worse) verdict', () => {
      expect(getWorstVerdict(VERDICTS.ACCEPTED, VERDICTS.WRONG_ANSWER)).toBe(VERDICTS.WRONG_ANSWER);
      expect(getWorstVerdict(VERDICTS.RUNTIME_ERROR, VERDICTS.COMPILATION_ERROR)).toBe(VERDICTS.RUNTIME_ERROR);
      expect(getWorstVerdict(VERDICTS.EXECUTION_SERVICE_ERROR, VERDICTS.ACCEPTED)).toBe(VERDICTS.EXECUTION_SERVICE_ERROR);
    });
  });

  describe('normalizeLanguage', () => {
    it('normalizes language aliases', () => {
      expect(normalizeLanguage(' C++ ')).toBe('cpp');
      expect(normalizeLanguage('js')).toBe('javascript');
      expect(normalizeLanguage('Py')).toBe('python');
    });
  });
});

