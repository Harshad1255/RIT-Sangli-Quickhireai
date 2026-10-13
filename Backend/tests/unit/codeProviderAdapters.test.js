jest.mock('axios', () => ({post:jest.fn(),get:jest.fn()}));
const axios = require('axios');
const one = require('../../src/shared/services/codeExecution/providers/oneCompilerProvider');
const judge = require('../../src/shared/services/codeExecution/providers/judge0Provider');
const java = require('../../src/shared/services/codeExecution/providers/javaSource');
beforeEach(()=>{jest.clearAllMocks();process.env.ONECOMPILER_API_KEY='test-key';process.env.JUDGE0_API_URL='https://judge0-ce.p.rapidapi.com';process.env.JUDGE0_API_KEY='test-key';});
test.each([['cpp','main.cpp'],['java','Solution.java'],['python','main.py']])('sends correct %s payload and retains null measurements',async(language,name)=>{
 axios.post.mockResolvedValue({data:{status:'success',stdout:'Hello World\n',stderr:null,exception:null}});
 const code=language==='java'?'public class Solution { public static void main(String[] args) {} }':'source';
 const r=await one.execute({language,code});expect(axios.post.mock.calls[0][1].files[0]).toEqual({name,content:code});expect(r.verdict).toBe('Accepted');expect(r.runtimeMs).toBeNull();expect(r.memoryKb).toBeNull();expect(axios.post.mock.calls[0][2].timeout).toBe(60000);
});
test.each([['E001: operation timed out','timeout'],['E002: API quota exceeded','rate_limit'],['E003: invalid access_token','missing_key']])('API %s never becomes candidate runtime error',async(error,reason)=>{axios.post.mockResolvedValue({data:{status:'failed',error}});await expect(one.execute({language:'cpp',code:'source'})).rejects.toMatchObject({serviceReason:reason});});
test.each([
 [{status:'success',stdout:'',stderr:'main.cpp:3: error: expected expression',exception:'Compilation failed'},'Compilation Error'],
 [{status:'success',stdout:'',stderr:'Traceback: ZeroDivisionError',exception:null},'Runtime Error'],
 [{status:'success',stdout:'',stderr:'',exception:'Time limit exceeded'},'Time Limit Exceeded'],
 [{status:'success',stdout:'Hello',stderr:'warning: deprecated',exception:null},'Accepted']
])('separates compiler/runtime/time errors and harmless warnings',async(data,verdict)=>{axios.post.mockResolvedValue({data});expect((await one.execute({language:'cpp',code:'source'})).verdict).toBe(verdict);});
test('Judge0 polls queued jobs until final status with correct language and C++17 options',async()=>{
 axios.post.mockResolvedValue({data:{token:'job'}});axios.get.mockResolvedValueOnce({data:{status:{id:2}}}).mockResolvedValueOnce({data:{status:{id:3},stdout:Buffer.from('Hello World').toString('base64'),time:'0.004',memory:1200,exit_code:0}});
 const r=await judge.execute({language:'cpp',code:'int main(){}',stdin:'',requestTimeoutMs:5000});expect(axios.get).toHaveBeenCalledTimes(2);expect(axios.post.mock.calls[0][1]).toMatchObject({language_id:54,compiler_options:'-std=c++17'});expect(r).toMatchObject({output:'Hello World',runtimeMs:4,memoryKb:1200,providerSubmissionId:'job',exitCode:0});
});
test('self hosted Judge0 uses auth token instead of RapidAPI header',async()=>{process.env.JUDGE0_API_URL='https://judge.example';axios.post.mockResolvedValue({data:{token:'job'}});axios.get.mockResolvedValue({data:{status:{id:6},compile_output:Buffer.from('syntax error').toString('base64')}});const r=await judge.execute({language:'cpp',code:'bad'});expect(axios.post.mock.calls[0][2].headers['X-Auth-Token']).toBe('test-key');expect(r.compileOutput).toBe('syntax error');expect(r.runtimeMs).toBeNull();});
test('Java adaptation preserves comments and strings while renaming constructor and references',()=>{const code='// public class Wrong\npublic final class Solution { Solution() {} String s="Solution"; Solution next; }';expect(java.className(code)).toBe('Solution');expect(java.forJudge0(code)).toBe('// public class Wrong\npublic final class Main { Main() {} String s="Solution"; Main next; }');});
test('malformed provider response is an infrastructure error',async()=>{axios.post.mockResolvedValue({data:{}});await expect(one.execute({language:'cpp',code:'code'})).rejects.toMatchObject({serviceReason:'provider_unavailable'});});

test('measured runtime limit is distinct from HTTP request timeout',async()=>{
 axios.post.mockResolvedValue({data:{status:'success',stdout:'',stderr:null,exception:null,executionTime:3000}});
 const r=await one.execute({language:'python',code:'while True: pass',timeLimitMs:2000});expect(r.verdict).toBe('Time Limit Exceeded');expect(axios.post.mock.calls[0][2].timeout).toBe(60000);
});
