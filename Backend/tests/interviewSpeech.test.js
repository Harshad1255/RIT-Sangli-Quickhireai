const fs = require('fs');
const vm = require('vm');
function createService() {
 class Recognition { start=jest.fn(); stop=jest.fn(); abort=jest.fn(); }
 const context={window:{SpeechRecognition:Recognition},setTimeout,clearTimeout, console};vm.createContext(context);
 const source=fs.readFileSync(require('path').resolve(__dirname,'../../Frontend/src/features/interview/services/speechRecognitionService.js'),'utf8').replace('export class','class').replace('export default new SpeechRecognitionService();','globalThis.service = new SpeechRecognitionService();');
 vm.runInContext(source,context);return context.service;
}
const result=(text,final=true,confidence=.8)=>Object.assign([{transcript:text,confidence}],{isFinal:final});
beforeEach(()=>jest.useFakeTimers());afterEach(()=>jest.useRealTimers());
test('accumulates full answers, replaces interim, avoids repeated final events, restarts safely', async()=>{
 const s=createService(), r=s.recognition;s.startRecording('Typed beginning',jest.fn(),jest.fn(),jest.fn());
 expect(r.lang).toBe('en-IN');expect(r.continuous).toBe(true);expect(r.interimResults).toBe(true);
 r.onresult({resultIndex:0,results:[result('C plus plus'),result('object',false)]});
 r.onresult({resultIndex:0,results:[result('C plus plus'),result('object oriented',false)]});
 expect(s.finalTranscript).toBe('Typed beginning C plus plus');expect(s.interimTranscript).toBe('object oriented');
 r.onend();jest.advanceTimersByTime(250);expect(r.start).toHaveBeenCalledTimes(2);
 r.onresult({resultIndex:0,results:[result('supports memory control')]});
 const p=s.stopRecording();r.onend();expect(await p).toBe('Typed beginning C plus plus object oriented supports memory control');expect(s.speechConfidence).toBe(.8);
 jest.advanceTimersByTime(1000);expect(r.start).toHaveBeenCalledTimes(2);
});
test('stop flushes final results without timeout or duplicate segments',async()=>{
 const s=createService(),r=s.recognition;s.startRecording('',jest.fn(),jest.fn(),jest.fn());
 r.onresult({resultIndex:0,results:[result('initial',false)]});const p=s.stopRecording();
 r.onresult({resultIndex:0,results:[result('final phrase')]});r.onend();expect(await p).toBe('final phrase');
});
test('language fallback and fatal permission errors control restart',()=>{
 const s=createService(),r=s.recognition;s.startRecording('',jest.fn(),jest.fn(),jest.fn());
 r.onerror({error:'language-not-supported'});expect(r.lang).toBe('en-US');r.onend();jest.advanceTimersByTime(250);expect(r.start).toHaveBeenCalledTimes(2);
 r.onerror({error:'not-allowed'});r.onend();jest.advanceTimersByTime(1000);expect(r.start).toHaveBeenCalledTimes(2);
});
test('missing confidence is null; cancellation clears the next question',()=>{
 const s=createService(),r=s.recognition;s.startRecording('',jest.fn(),jest.fn(),jest.fn());r.onresult({resultIndex:0,results:[result('answer',true,0)]});r.onend();expect(s.speechConfidence).toBeNull();s.cancel();jest.advanceTimersByTime(1000);expect(r.start).toHaveBeenCalledTimes(1);expect(s.finalTranscript).toBe('');
});
