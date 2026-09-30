const orchestrator = require('./orchestrator');
const languageMap = require('./languageMap');
const verdicts = require('./verdicts');

module.exports = {
  executeCode: orchestrator.executeCode,
  judgeSolution: orchestrator.judgeSolution,
  runTestCases: orchestrator.runTestCases,
  normalizeLanguage: languageMap.normalizeLanguage,
  LANGUAGE_IDS: languageMap.LANGUAGE_IDS,
  VERDICTS: verdicts.VERDICTS
};
