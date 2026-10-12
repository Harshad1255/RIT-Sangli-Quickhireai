const client=require('../../src/shared/services/geminiClient');
const utils=require('../../src/features/interviews/services/evaluationUtils');
const originalFetch=global.fetch;
const originalKey=process.env.GEMINI_API_KEY;
const originalModel=process.env.GEMINI_MODEL;
beforeEach(()=>{process.env.GEMINI_API_KEY='secret-test-key';process.env.GEMINI_MODEL='gemini-3.8-flash';global.fetch=jest.fn();jest.spyOn(console,'info').mockImplementation(()=>{});});
afterEach(()=>{global.fetch=originalFetch;if(originalKey===undefined)delete process.env.GEMINI_API_KEY;else process.env.GEMINI_API_KEY=originalKey;if(originalModel===undefined)delete process.env.GEMINI_MODEL;else process.env.GEMINI_MODEL=originalModel;jest.restoreAllMocks();});
const envelope=(parts,extra={})=>({ok:true,status:200,json:async()=>({candidates:[{content:{parts},finishReason:'STOP',...extra}]})});
const evaluation={technicalKnowledge:7,codingAbility:7,communicationSkills:7,problemSolving:7,feedback:'Demonstrated knowledge',strengths:['Understanding'],improvements:['Examples']};
test('validated evaluation uses header credentials and excludes thought parts',async()=>{
 global.fetch.mockResolvedValue(envelope([{thought:true,text:'Internal reasoning'},{text:JSON.stringify(evaluation)}]));
 const result=await client.generateContentWithRetry('Synthetic prompt',{parseJson:utils.parseEvaluation,maxRetries:0});
 expect(result.ok).toBe(true);expect(result.data.score).toBe(7);
 const [url,request]=global.fetch.mock.calls[0];expect(url).not.toContain('secret-test-key');expect(request.headers['x-goog-api-key']).toBe('secret-test-key');
 expect(JSON.parse(request.body).generationConfig.thinkingConfig.thinkingLevel).toBe('LOW');
 expect(JSON.stringify(console.info.mock.calls)).not.toContain('secret-test-key');expect(JSON.stringify(console.info.mock.calls)).not.toContain('Internal reasoning');
});
test('missing backend credentials fail without network requests',async()=>{
 delete process.env.GEMINI_API_KEY;expect((await client.generateContentWithRetry('Prompt')).errorCode).toBe('MISSING_API_KEY');expect(global.fetch).not.toHaveBeenCalled();
});
test.each([400,401,403,404,429,500,502,503])('HTTP %i retains the exact error category and sanitized diagnostics',async status=>{
 global.fetch.mockResolvedValue({ok:false,status,text:async()=>JSON.stringify({error:{status:'RESOURCE_EXHAUSTED',message:'secret-test-key candidate-personal-data'}})});
 const result=await client.generateContentWithRetry('Prompt',{maxRetries:0});
 expect(result.errorCode).toBe(`HTTP_${status}`);expect(result.httpStatus).toBe(status);expect(result.retryable).toBe(status===429 || status>=500);
 expect(JSON.stringify(console.info.mock.calls)).not.toContain('secret-test-key');expect(JSON.stringify(console.info.mock.calls)).not.toContain('candidate-personal-data');
});
test.each([
 ['malformed JSON',envelope([{text:'{broken'}]),'JSON_PARSE_FAILED'],
 ['empty text',envelope([{text:''}]),'EMPTY_RESPONSE'],
 ['no candidates',{ok:true,status:200,json:async()=>({candidates:[]})},'EMPTY_RESPONSE'],
 ['blocked prompt',{ok:true,status:200,json:async()=>({promptFeedback:{blockReason:'SAFETY'}})},'BLOCKED_RESPONSE'],
 ['blocked output',envelope([{text:'{}'}],{finishReason:'SAFETY'}),'BLOCKED_RESPONSE'],
 ['token limit',envelope([{text:'{'}],{finishReason:'MAX_TOKENS'}),'TOKEN_LIMIT']
 ])('%s is never a successful evaluation',async(_,response,errorCode)=>{
 global.fetch.mockResolvedValue(response);const result=await client.generateContentWithRetry('Prompt',{maxRetries:0});expect(result.ok).toBe(false);expect(result.errorCode).toBe(errorCode);
});
test('invalid score output is distinguished from malformed JSON',async()=>{
 global.fetch.mockResolvedValue(envelope([{text:JSON.stringify({...evaluation,technicalKnowledge:99})}]));
 expect((await client.generateContentWithRetry('Prompt',{maxRetries:0,parseJson:utils.parseEvaluation})).errorCode).toBe('SCORE_VALIDATION_FAILED');
});
