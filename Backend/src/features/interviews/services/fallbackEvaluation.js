const { dimensions, normalizeTranscript, skipped, weightedScore } = require('./evaluationUtils');
const stop = new Set('the a an is are was were be to of in on for and or with it this that what how explain describe would you your i my me have has can do does using use technical knowledge practical experience challenges faced question answer'.split(' '));
const tokens = text => [...new Set(normalizeTranscript(String(text || '')).toLowerCase().match(/[a-z][a-z0-9+#]*/g) || [])].filter(t => t.length > 2 && !stop.has(t));
const isNearMatch = (left, right) => {
 if (left === right) return true;
 if (left.length < 5 || right.length < 5 || Math.abs(left.length - right.length) > 1) return false;
 let i = 0, j = 0, edits = 0;
 while (i < left.length && j < right.length) {
  if (left[i] === right[j]) { i++; j++; continue; }
  if (++edits > 1) return false;
  if (left.length > right.length) i++;
  else if (right.length > left.length) j++;
  else { i++; j++; }
 }
 return edits + Number(i < left.length || j < right.length) <= 1;
};
const containsTerm = (textTokens, expectedTerm) => textTokens.some(token => isNearMatch(token, expectedTerm));
// Explicit concepts support paraphrases. This is evidence matching, not semantic AI verification.
const concepts = [
 ['encapsulation','private','hide','hiding','access'], ['inheritance','extends','parent','child','reuse'],
 ['polymorphism','override','overriding','overload','overloading'], ['closure','closures','lexical','scope','retain'],
 ['database','sql','query','table','rows','records'], ['index','indexes','lookup','search','performance','faster','speed'],
 ['docker','container','containers','image','packaging'], ['kubernetes','pods','pod','deployment','replicas','cluster'],
 ['array','list','collection','elements'], ['duplicate','duplicates','unique','set'],
 ['async','asynchronous','promise','await','blocking'], ['authentication','identity','login','credentials'],
 ['testing','tests','assert','validation','edge'], ['memory','allocation','pointer','heap'],
 ['team','teamwork','collaboration','colleagues'], ['conflict','disagreement','listen','resolution'],
 ['strength','strengths','skills','experience'], ['challenge','challenges','problem','solved'],
 ['recursion','recursive','function','self-call','itself','base','case','termination','stop','stopping'],
 ['rest','http','endpoint','resource','stateless','get','post'],
 ['hash','map','dictionary','key','value','lookup'],
 ['cache','caching','stored','reuse','faster'],
 ['api','endpoint','request','response','client','server'],
 ['sorting','sort','ordered','comparison','algorithm'],
 ['exception','error','try','catch','handling','failure'],
 ['git','commit','branch','merge','version','control'],
 ['agile','sprint','feedback','iteration','team'],
 ['leadership','initiative','ownership','decision','guide'],
 ['communication','explain','listen','clarity','collaborate']
];
const fallbackEvaluation = (answer, question, metadata = {}, failure = {}) => {
 const content = [answer, metadata.code].filter(Boolean).join('\n');
 if (!content.trim()) return { ...skipped(), evaluationSource:'blank' };
 const q = typeof question === 'object' ? question : {question};
 const rubric = [q.question, q.topic, q.category, q.expectedAnswer, ...(Array.isArray(q.expectedKeyPoints) ? q.expectedKeyPoints : [])].join(' ');
 const expected = tokens(rubric), actual = tokens(content);
 const matchedTerms = expected.filter(t => containsTerm(actual,t));
 const matchedConcepts = concepts.filter(group => group.some(t=>containsTerm(expected,t)) && group.some(t=>containsTerm(actual,t)));
 const evidence = matchedTerms.length + matchedConcepts.length;
 const explanation = /\b(because|therefore|so that|for example|such as|instead|by|first|then)\b/i.test(content);
 const questionContext = [q.question, q.topic, q.category, q.type].join(' ');
 const hr = /\b(hr|behavioral|behavioural|communication|experience|team|conflict|strength|weakness|yourself|leadership)\b/i.test(questionContext);
 const personalExample = hr && /\b(i|we|my|our)\b/i.test(content) && /\b(worked|built|learned|helped|resolved|organized|improved|managed)\b/i.test(content);
 const relevant = evidence > 0 || personalExample;
 const base = relevant ? Math.min(6.5, 1 + Math.min(evidence, 5) * .7 + (explanation ? 1 : 0) + (personalExample ? 1 : 0)) : 0;
 const score = Math.round(base * 10) / 10;
 return { status:'provisional', evaluationSource:'fallback', evaluationFailed:false,
   confidence: evidence >= 3 ? 'medium' : 'low', fallbackReason:failure.errorCode || 'EVALUATION_UNAVAILABLE',
   ...Object.fromEntries(dimensions.map(key=>[key,score])), overallScore:score, score,
   matchedTerms, feedback: relevant ? 'Provisional partial credit for related concepts or a relevant experience. Technical correctness requires AI or human review.' : 'Provisional result: no reliable relevant evidence was detected. Human or AI review may revise this score.',
   strengths: relevant ? ['Related concepts or relevant experience detected (not AI verified)'] : [],
   improvements:['Review this provisional evaluation with AI or an authorized reviewer.'] };
};
const maximumMarks = q => typeof q?.maxMarks === 'number' && Number.isFinite(q.maxMarks) && q.maxMarks >= 0 ? q.maxMarks : 10;
const withMarks = (analysis = {}, question) => {
   const maxMarks = maximumMarks(question);
   const dimensionalScore = dimensions.every(key => typeof analysis[key] === 'number' && Number.isFinite(analysis[key])) ? weightedScore(analysis) : null;
   const rawScore = analysis.score ?? analysis.overallScore ?? dimensionalScore;
   const score = typeof rawScore === 'number' && Number.isFinite(rawScore) ? Math.max(0,Math.min(10,rawScore)) : 0;
   return {...analysis,score:rawScore == null && analysis.status === 'unavailable' ? null : score,maxMarks,marksObtained:Math.round(score / 10 * maxMarks * 100)/100,evaluationSource:analysis.evaluationSource || (analysis.status === 'skipped' ? 'blank' : 'ai')};
};
const reportTotals = (answers = []) => {
 const rows = answers.map(a=>({questionId:a.questionId,question:typeof a.question === 'object'?a.question.question:a.question,answer:a.answer || '',code:a.code || '',...withMarks(a.analysis || a.evaluation || {},{maxMarks:(a.analysis || a.evaluation)?.maxMarks ?? a.question?.maxMarks})}));
 const totalMarks = rows.reduce((n,a)=>n+a.maxMarks,0), marksObtained= Math.round(rows.reduce((n,a)=>n+a.marksObtained,0)*100)/100;
 const provisional = rows.filter(a=>a.status === 'provisional').length;
 return {totalQuestions:rows.length,attemptedQuestions:rows.filter(a=>(a.answer.trim() || a.code.trim()) && a.status !== 'skipped').length,totalMarks,marksObtained,percentage:totalMarks?Math.round(marksObtained/totalMarks*10000)/100:0,evaluationStatus:provisional?'provisional':rows.some(a=>!['evaluated','skipped'].includes(a.status))?'partially evaluated':'completed',fallbackQuestions:rows.filter(a=>a.status==='provisional').map(a=>a.questionId),answers:rows};
};
module.exports = {fallbackEvaluation, withMarks, reportTotals};
