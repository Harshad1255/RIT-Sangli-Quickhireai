jest.mock('../src/features/interviews/models/InterviewSession', () => require('./helpers/interviewSessionMock')());
jest.mock('../src/features/interviews/models/Interview',()=>({findOne:jest.fn(async()=>null),updateOne:jest.fn(async()=>({acknowledged:true}))}));
jest.mock('../src/features/interviews/services/geminiService',()=>({isDuplicateQuestion:jest.fn(()=>false),generateQuestion:jest.fn(),generateQuestionBatch:jest.fn(),analyzeAnswer:jest.fn(),generateFinalEvaluation:jest.fn(),generateFollowUpQuestion:jest.fn()}));
const gemini=require('../src/features/interviews/services/geminiService');
const sessions=require('../src/features/interviews/models/InterviewSession');
const questions=require('../src/features/interviews/controllers/questionController');
const results=require('../src/features/interviews/controllers/resultController');
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const res=()=>({status:jest.fn().mockReturnThis(),json:jest.fn()});
beforeEach(()=>{
 jest.clearAllMocks();
 require('../src/features/interviews/models/Interview').updateOne.mockResolvedValue({acknowledged:true});
 jest.spyOn(console,"log").mockImplementation(()=>{});
 gemini.generateQuestion.mockImplementation(async()=>{await pause(200);return {question:'First question',topic:'JS'};});
 gemini.generateQuestionBatch.mockImplementation(async()=>{await pause(80);return Array.from({length:4},(_,i)=>({id:'prepared-'+i,question:'Prepared '+i,topic:'JS',category:i===1?'coding':'conceptual',questionNumber:i+2,isFollowUp:false}));});
 gemini.analyzeAnswer.mockImplementation(async()=>{await pause(300);return {status:'evaluated',score:9,overallScore:9};});
 gemini.generateFinalEvaluation.mockResolvedValue({overallScore:9,skillAssessment:{technicalKnowledge:9,codingAbility:9,communicationSkills:9,problemSolving:9}});
});
test('returns first question before batch, resumes without regeneration and uses cached next question',async()=>{
 const code='mock-latency-'+Date.now();const start=res();const t=performance.now();await questions.startInterview({body:{interviewCode:code,skills:['JS']}},start);
 const initializationMs=performance.now()-t;expect(start.json.mock.calls[0][0].interview.questions).toHaveLength(1);
 await pause(100);const session=await sessions.findOne({interviewCode:code});expect(session.preparedQuestions).toHaveLength(4);
 const resumed=res();await questions.startInterview({body:{interviewCode:code,skills:['JS']}},resumed);expect(resumed.json.mock.calls[0][0].resumed).toBe(true);expect(gemini.generateQuestion).toHaveBeenCalledTimes(1);
 const callsBefore=gemini.generateQuestion.mock.calls.length;
 const submit=res();const transitionStart=performance.now();const body={interviewCode:code,answer:'Good answer',question:session.questions[0]};await results.processAnswer({body},submit);const transitionMs=performance.now()-transitionStart;
 expect(submit.json.mock.calls[0][0].nextQuestion.id).toBe('prepared-0');expect(gemini.generateQuestion).toHaveBeenCalledTimes(callsBefore);expect(session.answers).toHaveLength(1);
 const retry=res();await results.processAnswer({body},retry);expect(session.answers).toHaveLength(1);expect(gemini.analyzeAnswer).toHaveBeenCalledTimes(1);expect(retry.json.mock.calls[0][0]).toEqual(submit.json.mock.calls[0][0]);
 console.info('CONTROLLED_LATENCY',JSON.stringify({initializationMs,transitionMs,baselineRefreshGenerationCalls:1,afterRefreshGenerationCalls:0}));
});
test('duplicate initialization shares generation and repeated submits are rejected while pending',async()=>{
 const code='mock-concurrent-'+Date.now();const a=res(),b=res();await Promise.all([questions.startInterview({body:{interviewCode:code,skills:['JS']}},a),questions.startInterview({body:{interviewCode:code,skills:['JS']}},b)]);expect(gemini.generateQuestion).toHaveBeenCalledTimes(1);
 const session=await sessions.findOne({interviewCode:code});const body={interviewCode:code,answer:'Answer',question:session.questions[0]};const first=res(),second=res();const work=results.processAnswer({body},first);await pause(5);expect(session.answers[0].analysis.status).toBe('pending');await results.processAnswer({body},second);expect(second.status).toHaveBeenCalledWith(409);await work;expect(session.answers).toHaveLength(1);
});
test('pending submission can be recovered without duplicate answers',async()=>{
 const code='mock-recover-'+Date.now();const session=new sessions({interviewCode:code,status:'active',skills:['JS'],totalQuestions:5,questions:[{id:'q',question:'Q',questionNumber:1}],preparedQuestions:[{id:'q2',question:'Q2',questionNumber:2}],answers:[{questionId:'q',answer:'Answer',analysis:{status:'pending'},isFollowUp:false}]});await session.save();const response=res();await results.processAnswer({body:{interviewCode:code,question:session.questions[0],answer:'Answer'}},response);expect(session.answers).toHaveLength(1);expect(session.answers[0].analysis.status).toBe('evaluated');
});

test('five prepared main questions preserve IDs and completed results across refresh',async()=>{
 const code='mock-complete-'+Date.now();await questions.startInterview({body:{interviewCode:code,skills:['JS']}},res());await pause(100);const session=await sessions.findOne({interviewCode:code});
 for(let i=0;i<5;i++) {const response=res();await results.processAnswer({body:{interviewCode:code,answer:'Answer '+i,question:session.questions[session.questions.length-1]}},response);expect(response.json.mock.calls[0][0].isComplete || false).toBe(i===4);}
 expect(session.answers).toHaveLength(5);expect(new Set(session.answers.map(a=>a.questionId)).size).toBe(5);expect(session.finalEvaluation.overallScore).toBe(9);
 const resumed=res();await questions.startInterview({body:{interviewCode:code,skills:['JS']}},resumed);expect(resumed.json.mock.calls[0][0].interview.status).toBe('completed');expect(gemini.generateQuestion).toHaveBeenCalledTimes(1);
});

test('database lease rejects another worker without changing answers', async()=>{
 const session=new sessions({interviewCode:'mock-lease',status:'active',questions:[{id:'q',question:'Q'}],answers:[],processingToken:'other-worker',processingUntil:new Date(Date.now()+60000)});await session.save();
 const response=res();await results.processAnswer({body:{interviewCode:session.interviewCode,question:session.questions[0],answer:'A'}},response);
 expect(response.status).toHaveBeenCalledWith(409);expect(session.processingToken).toBe('other-worker');expect(session.answers).toHaveLength(0);expect(gemini.analyzeAnswer).not.toHaveBeenCalled();
});

test('interrupted final evaluation recovers saved answer and evaluates once on retry', async()=>{
 const q={id:'final-q',question:'Final Q',questionNumber:1,isFollowUp:false};
 const session=new sessions({interviewCode:'mock-final-retry',status:'active',skills:['JS'],totalQuestions:1,questions:[q],answers:[]});await session.save();
 gemini.generateFinalEvaluation.mockRejectedValueOnce(new Error('temporary failure')).mockResolvedValue({overallScore:9,skillAssessment:{technicalKnowledge:9,codingAbility:9,communicationSkills:9,problemSolving:9}});
 const body={interviewCode:session.interviewCode,question:q,answer:'Original answer'};
 const failed=res();await results.processAnswer({body},failed);expect(failed.status).toHaveBeenCalledWith(500);expect(session.answers).toHaveLength(1);
 const recovered=res();await results.processAnswer({body:{...body,answer:'Changed retry text'}},recovered);
 expect(recovered.json.mock.calls[0][0].isComplete).toBe(true);expect(session.answers[0].answer).toBe('Original answer');expect(gemini.analyzeAnswer).toHaveBeenCalledTimes(1);
 const replay=res();await results.processAnswer({body},replay);expect(replay.json.mock.calls[0][0]).toEqual(recovered.json.mock.calls[0][0]);expect(gemini.generateFinalEvaluation).toHaveBeenCalledTimes(2);
});

test('client cannot forge question text, follow-up flag, or question ID', async()=>{
 const q={id:'server-q',question:'Server question',questionNumber:1,isFollowUp:false};
 const session=new sessions({interviewCode:'mock-authority',status:'active',skills:['JS'],totalQuestions:1,questions:[q],answers:[]});await session.save();
 const missing=res();await results.processAnswer({body:{interviewCode:session.interviewCode,question:{question:'Q'},answer:'A'}},missing);expect(missing.status).toHaveBeenCalledWith(400);
 const unknown=res();await results.processAnswer({body:{interviewCode:session.interviewCode,question:{id:'forged'},answer:'A'}},unknown);expect(unknown.status).toHaveBeenCalledWith(409);
 const accepted=res();await results.processAnswer({body:{interviewCode:session.interviewCode,question:{...q,question:'Forged text',isFollowUp:true},answer:'A'}},accepted);
 expect(session.answers[0].question).toBe('Server question');expect(session.answers[0].isFollowUp).toBe(false);expect(accepted.json.mock.calls[0][0].isComplete).toBe(true);
});

test('report persistence retry reuses final evaluation and upserts a stable report',async()=>{
 const q={id:'report-q',question:'Q',questionNumber:1};const session=new sessions({interviewCode:'mock-report-retry',status:'active',skills:['JS'],totalQuestions:1,questions:[q],answers:[]});await session.save();
 const report=require('../src/features/interviews/models/Interview').updateOne;report.mockRejectedValueOnce(new Error('database unavailable'));
 const body={interviewCode:session.interviewCode,question:q,answer:'Answer'};
 const failed=res();await results.processAnswer({body},failed);expect(failed.status).toHaveBeenCalledWith(500);expect(session.finalEvaluation.overallScore).toBe(9);expect(session.status).toBe('active');
 const recovered=res();await results.processAnswer({body},recovered);expect(recovered.json.mock.calls[0][0].isComplete).toBe(true);expect(gemini.generateFinalEvaluation).toHaveBeenCalledTimes(1);expect(session.answers).toHaveLength(1);
 expect(report.mock.calls[1][0]).toEqual({'candidates.code':session.interviewCode});expect(report.mock.calls[1][2].upsert).toBe(true);
});

test('unavailable answer evaluation completes provisionally and duplicate submission reuses persisted report',async()=>{
 const q={id:'unavailable-q',question:'Q',questionNumber:1};const session=new sessions({interviewCode:'mock-unavailable-final',status:'active',skills:['JS'],totalQuestions:1,questions:[q],answers:[]});await session.save();
 gemini.analyzeAnswer.mockResolvedValueOnce({status:'unavailable',evaluationFailed:true,score:null}).mockResolvedValue({status:'evaluated',score:9,overallScore:9});
 const body={interviewCode:session.interviewCode,question:q,answer:'Saved answer'};
 const failed=res();await results.processAnswer({body},failed);expect(failed.status).toHaveBeenCalledWith(200);expect(session.evaluationStatus).toBe('provisional');expect(session.status).toBe('completed');expect(session.finalEvaluation.fallbackQuestions).toEqual(['unavailable-q']);
 const recovered=res();await results.processAnswer({body},recovered);expect(recovered.json.mock.calls[0][0].isComplete).toBe(true);expect(session.answers).toHaveLength(1);expect(session.answers[0].analysis.status).toBe('provisional');expect(gemini.generateFinalEvaluation).toHaveBeenCalledTimes(1);
});

test('provider quota failure produces an explicitly provisional report with its cause',async()=>{
 const q={id:'quota-q',question:'Q',questionNumber:1};const session=new sessions({interviewCode:'mock-quota',status:'active',skills:['JS'],totalQuestions:1,questions:[q],answers:[]});await session.save();
 gemini.analyzeAnswer.mockResolvedValue({status:'unavailable',evaluationFailed:true,score:null,errorCode:'HTTP_429',errorMessage:'Gemini quota or rate limit was exceeded.'});
 const response=res();await results.processAnswer({body:{interviewCode:session.interviewCode,question:q,answer:'Saved answer'}},response);
 expect(response.status).toHaveBeenCalledWith(200);expect(session.answers[0].analysis.fallbackReason).toBe('HTTP_429');expect(session.answers[0].answer).toBe('Saved answer');expect(session.finalEvaluation.evaluationStatus).toBe('provisional');expect(session.status).toBe('completed');
});

test('report write validation failure returns a persistence code and keeps final scores for retry',async()=>{
 const q={id:'db-q',question:'Q',questionNumber:1};const session=new sessions({interviewCode:'mock-db-code',status:'active',skills:['JS'],totalQuestions:1,questions:[q],answers:[]});await session.save();
 require('../src/features/interviews/models/Interview').updateOne.mockRejectedValueOnce(Object.assign(new Error('validation'),{name:'ValidationError'}));
 const response=res();await results.processAnswer({body:{interviewCode:session.interviewCode,question:q,answer:'Saved answer'}},response);
 expect(response.status).toHaveBeenCalledWith(500);expect(response.json.mock.calls[0][0].errorCode).toBe('REPORT_VALIDATION_FAILED');expect(session.status).toBe('active');expect(session.finalEvaluation.overallScore).toBe(9);
});
