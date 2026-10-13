jest.mock('../src/shared/services/geminiClient', () => ({ generateContentWithRetry: jest.fn() }));
const { generateContentWithRetry } = require('../src/shared/services/geminiClient');
const service = require('../src/features/interviews/services/geminiService');
const utils = require('../src/features/interviews/services/evaluationUtils');
const {fallbackEvaluation,withMarks,reportTotals} = require('../src/features/interviews/services/fallbackEvaluation');
const Interview = require('../src/features/interviews/models/Interview');
const response = (n) => ({ technicalKnowledge:n, codingAbility:n, communicationSkills:n, problemSolving:n, overallScore:99, feedback:'Relevant understanding with room for improvement', strengths:['Relevant concepts'], improvements:['Add detail'] });
beforeEach(() => jest.resetAllMocks());
test.each([
 ['excellent', 'C++ supports encapsulation inheritance and polymorphism',9],
 ['partial', 'C++ is object oriented and fast',6],
 ['wrong but relevant', 'Inheritance copies all objects I think',3],
 ['poor English', 'c plus plus give memory control and object oriented',7],
 ['speech artifacts', 'react js with node js and mongo db APIs',7],
 ['irrelevant', 'Bananas fly to the moon',1]
])('%s answer preserves model partial credit and sends normalization', async (_, answer, n) => {
 generateContentWithRetry.mockResolvedValue({ok:true,data:response(n)});
 const result=await service.analyzeAnswer(answer,{id:'q1',question:'Explain C++',category:'fundamentals'});
 expect(result.overallScore).toBe(n); expect(result.status).toBe('evaluated'); expect(result.rawTranscript).toBe(answer);
 expect(generateContentWithRetry.mock.calls[0][0]).toContain(utils.normalizeTranscript(answer));
 expect(generateContentWithRetry.mock.calls[0][0]).toContain('Award partial credit whenever');
});
test('empty answer skips without AI call',async()=>{expect((await service.analyzeAnswer(' ','Q')).status).toBe('skipped');expect(generateContentWithRetry).not.toHaveBeenCalled();});
test('API failure returns transparent provisional scores',async()=>{generateContentWithRetry.mockResolvedValue({ok:false,errorCode:'TIMEOUT'});const r=await service.analyzeAnswer('Answer','Q');expect(r.score).toBe(0);expect(r.status).toBe('provisional');expect(r.evaluationSource).toBe('fallback');expect(generateContentWithRetry).toHaveBeenCalledTimes(2);});
test('a relevant answer gets provisional marks during Gemini outage and other answers still form a report',async()=>{
 generateContentWithRetry.mockResolvedValueOnce({ok:false,errorCode:'HTTP_429'}).mockResolvedValueOnce({ok:false,errorCode:'HTTP_429'}).mockResolvedValueOnce({ok:true,data:response(8)}).mockResolvedValueOnce({ok:false,errorCode:'TIMEOUT'});
 const question={id:'recursion',question:'Explain recursion and its base case.',category:'fundamentals',expectedKeyPoints:['function calls itself','stop condition']};
 const fallback=await service.analyzeAnswer('A function calls itself until it reaches a base case.',question);
 const evaluated=await service.analyzeAnswer('A recursive function calls itself and returns when it reaches the base case.',{id:'other',question:'Explain recursion.'});
 expect(fallback.status).toBe('provisional');
 expect(fallback.score).toBeGreaterThan(0);
 const report=await service.generateFinalEvaluation([{questionId:'recursion',question,answer:'A function calls itself until it reaches a base case.',analysis:fallback},{questionId:'other',question:'Explain recursion.',answer:'A recursive function calls itself.',analysis:evaluated}]);
 expect(report.evaluationStatus).toBe('provisional');
 expect(report.totalQuestions).toBe(2);
 expect(report.fallbackQuestions).toEqual(['recursion']);
 expect(report.totalMarks).toBe(20);
 expect(report.marksObtained).toBeGreaterThan(0);
 expect(report.percentage).toBeCloseTo(report.marksObtained / report.totalMarks * 100,2);
 expect(report.overallScore).toBe(report.percentage / 10);
});
test.each([
 ['correct','A recursive function calls itself until it reaches a base case.', 'A recursion question', 2],
 ['partial','A function calls itself.', 'Explain recursion and its base case.', 1],
 ['weak but relevant','It repeats itself then stops.', 'Explain recursion and its base case.', 1],
 ['irrelevant','Bananas fly to the moon.', 'Explain recursion and its base case.', 0]
])('fallback gives measured evidence for %s answers',(_,answer,question,minScore)=>{
 const result=fallbackEvaluation(answer,{question,category:'fundamentals',expectedKeyPoints:['recursive function','base case']},{},{errorCode:'HTTP_429'});
 expect(result.score).toBeGreaterThanOrEqual(minScore);
 expect(result.score).toBeLessThanOrEqual(6.5);
 expect(result.status).toBe('provisional');
 expect(result.evaluationSource).toBe('fallback');
});
test('blank fallback is skipped and technical experience key points do not make unrelated HR anecdotes relevant',()=>{
 expect(fallbackEvaluation('  ',{question:'Explain recursion'}).status).toBe('skipped');
 expect(fallbackEvaluation('I worked with people and helped my team.',{question:'Explain recursion',expectedKeyPoints:['Practical experience','Challenges faced']}).score).toBe(0);
});
test('marks are bounded, respect question maximums, and totals use backend earned marks',()=>{
 expect(withMarks({score:12,status:'evaluated'},{maxMarks:4})).toMatchObject({score:10,maxMarks:4,marksObtained:4});
 expect(withMarks({overallScore:7,technicalKnowledge:8,codingAbility:6,communicationSkills:7,problemSolving:7,status:'evaluated'},{maxMarks:4})).toMatchObject({score:7,marksObtained:2.8});
 expect(withMarks({score:-1,status:'evaluated'},{maxMarks:0})).toMatchObject({score:0,maxMarks:0,marksObtained:0});
 expect(Number.isFinite(withMarks({score:NaN,status:'evaluated'},{}).marksObtained)).toBe(true);
 const totals=reportTotals([
  {questionId:'one',question:{question:'Q1',maxMarks:4},answer:'Attempt',analysis:{score:5,status:'evaluated'}},
  {questionId:'two',question:{question:'Q2',maxMarks:6},answer:'',analysis:{score:0,status:'skipped'}}
 ]);
 expect(totals).toMatchObject({totalQuestions:2,attemptedQuestions:1,totalMarks:10,marksObtained:2,percentage:20,evaluationStatus:'completed'});
});
test('extracts JSON and repairs trailing commas',()=>{const text='Here is JSON: '+JSON.stringify(response(7)).replace(/}$/,',}')+' done';expect(utils.parseEvaluation(text).overallScore).toBe(7);});
test('malformed dimensions retry rather than fabricate marks',async()=>{generateContentWithRetry.mockResolvedValueOnce({ok:true,data:{feedback:'bad'}}).mockResolvedValueOnce({ok:true,data:response(6)});expect((await service.analyzeAnswer('Answer','Q')).score).toBe(6);});
test('four independent dimension averages exclude outages and include skips',()=>{const a=utils.parseEvaluation({...response(7),technicalKnowledge:8,codingAbility:4,communicationSkills:9,problemSolving:6});const r=service.calculateSkillScores([{analysis:a},{analysis:utils.unavailable()},{analysis:utils.skipped()}]);expect(r).toEqual({overallScore:3.5,technicalKnowledge:4,codingAbility:2,communicationSkills:4.5,problemSolving:3});});
test('Mongo schema retains audit fields and scores',()=>{const doc=new Interview({title:'Test',skills:['C++'],duration:30,candidates:[{code:'TEST',results:{answers:[utils.serializeAnswer({question:{id:'q1',question:'Q'},answer:'c plus plus',analysis:{...utils.parseEvaluation(response(7)),rawTranscript:'c plus plus',normalizedTranscript:'C++',speechConfidence:null}})]}}]});const a=doc.candidates[0].results.answers[0].toObject();expect(a.rawTranscript).toBe('c plus plus');expect(a.normalizedTranscript).toBe('C++');expect(a.technicalKnowledge).toBe(7);expect(a.status).toBe('evaluated');expect(a.speechConfidence).toBeNull();});
test('zero performance differs from service failure',async()=>{const r=await service.generateFinalEvaluation([{answer:'irrelevant',analysis:utils.parseEvaluation(response(0))}]);expect(r.overallScore).toBe(0);expect(r.overallFeedback).not.toContain('failed');const f=await service.generateFinalEvaluation([{answer:'Answer',analysis:utils.unavailable()}]);expect(f.evaluationStatus).toBe('partially evaluated');});

test('duplicate AI questions retry twice before a unique fallback',async()=>{
 const history=[{id:'asked',question:'Explain closures in JavaScript.'}];
 generateContentWithRetry.mockResolvedValue({ok:true,data:{question:'Explain closures in JavaScript.',topic:'JS'}});
 const question=await service.generateQuestion('JavaScript',history,1,'practical application');
 expect(generateContentWithRetry).toHaveBeenCalledTimes(2);expect(service.isDuplicateQuestion(question,history)).toBe(false);expect(question.source).toBe('fallback');
});

test('fallback sequence stays distinct and third question requires coding',()=>{
 const history=[];
 for(const focus of ['fundamentals','practical application','coding','debugging','trade-offs']) {
   const question=service.getFallbackQuestion('JavaScript',history,focus);
   expect(service.isDuplicateQuestion(question,history)).toBe(false);if(focus==='coding') expect(question.category).toBe('coding');history.push(question);
 }
});

test('final summary failure returns computed scores within bounded request time',async()=>{
 generateContentWithRetry.mockResolvedValue({ok:false,errorCode:'TIMEOUT'});
 const evaluation=await service.generateFinalEvaluation([{answer:'Answer',analysis:utils.parseEvaluation(response(7))}]);
 expect(evaluation.overallScore).toBe(7);expect(generateContentWithRetry.mock.calls[0][1]).toMatchObject({maxRetries:0,timeoutMs:20000});
});
