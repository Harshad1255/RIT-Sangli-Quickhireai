const fields = ['requestId','sessionId','questionId','savedAnswers','status','evaluationStatus','model','endpoint','attempt','durationMs','httpStatus','errorCode','providerStatus','finishReason','valid','keyConfigured','quotaMetric','quotaLimit'];
const log = (stage, values = {}) => console.info('[interview evaluation]', JSON.stringify({stage,...Object.fromEntries(fields.filter(key=>values[key] !== undefined).map(key=>[key,values[key]]))}));
const databaseCode = error => error?.name === 'ValidationError' ? 'REPORT_VALIDATION_FAILED' : error?.name === 'VersionError' ? 'SESSION_WRITE_CONFLICT' : error?.code === 11000 ? 'REPORT_WRITE_CONFLICT' : 'DATABASE_WRITE_FAILED';
module.exports = {log,databaseCode};
