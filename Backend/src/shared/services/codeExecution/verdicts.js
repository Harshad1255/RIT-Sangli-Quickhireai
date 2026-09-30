const VERDICTS = Object.freeze({
  ACCEPTED: 'Accepted',
  WRONG_ANSWER: 'Wrong Answer',
  COMPILATION_ERROR: 'Compilation Error',
  RUNTIME_ERROR: 'Runtime Error',
  TIME_LIMIT_EXCEEDED: 'Time Limit Exceeded',
  MEMORY_LIMIT_EXCEEDED: 'Memory Limit Exceeded',
  VALIDATION_ERROR: 'Validation Error',
  EXECUTION_SERVICE_ERROR: 'Execution Service Error'
});

const verdictPriority = Object.freeze({
  [VERDICTS.ACCEPTED]: 0,
  [VERDICTS.WRONG_ANSWER]: 1,
  [VERDICTS.COMPILATION_ERROR]: 2,
  [VERDICTS.RUNTIME_ERROR]: 3,
  [VERDICTS.TIME_LIMIT_EXCEEDED]: 4,
  [VERDICTS.MEMORY_LIMIT_EXCEEDED]: 5,
  [VERDICTS.VALIDATION_ERROR]: 6,
  [VERDICTS.EXECUTION_SERVICE_ERROR]: 7
});

const getWorstVerdict = (verdict1, verdict2) => {
  const v1Priority = verdictPriority[verdict1] ?? verdictPriority[VERDICTS.EXECUTION_SERVICE_ERROR];
  const v2Priority = verdictPriority[verdict2] ?? verdictPriority[VERDICTS.EXECUTION_SERVICE_ERROR];
  return v1Priority > v2Priority ? verdict1 : verdict2;
};

module.exports = {
  VERDICTS,
  verdictPriority,
  getWorstVerdict
};
