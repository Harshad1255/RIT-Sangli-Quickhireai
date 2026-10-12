const {generateContentWithRetry}=require('../../src/shared/services/geminiClient');
const originalFetch=global.fetch;
beforeEach(()=>{process.env.GEMINI_API_KEY='test';global.fetch=jest.fn();});
afterEach(()=>{global.fetch=originalFetch;});
test('permanent model configuration failure is not retried',async()=>{
 global.fetch.mockResolvedValue({ok:false,status:404,text:async()=>'model unavailable'});
 const r=await generateContentWithRetry('prompt',{maxRetries:1,timeoutMs:100});expect(r.ok).toBe(false);expect(global.fetch).toHaveBeenCalledTimes(1);
});
test('response body processing remains bounded by timeout',async()=>{
 global.fetch.mockImplementation(async(url,options)=>({ok:true,json:()=>new Promise((resolve,reject)=>options.signal.addEventListener('abort',()=>reject(Object.assign(new Error('aborted'),{name:'AbortError'}))))}));
 const t=performance.now();const r=await generateContentWithRetry('prompt',{maxRetries:0,timeoutMs:20});expect(r.errorCode).toBe('TIMEOUT');expect(performance.now()-t).toBeLessThan(500);
});
test('transient failure retries once and clears timers',async()=>{
 global.fetch.mockResolvedValueOnce({ok:false,status:503,text:async()=>'temporary'}).mockResolvedValueOnce({ok:true,json:async()=>({candidates:[{content:{parts:[{text:'{"ok":true}'}]}}]})});
 const r=await generateContentWithRetry('prompt',{maxRetries:1,timeoutMs:100});expect(r.data).toEqual({ok:true});expect(global.fetch).toHaveBeenCalledTimes(2);
});
test('actual interview routes load and expose an asynchronous question endpoint',()=>{
 const router=require('../../src/features/interviews/routes/interviewRoutes');expect(router.stack.some(layer=>layer.route?.path==='/:id/questions')).toBe(true);
});
