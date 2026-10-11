jest.mock('../src/shared/services/geminiClient', () => ({ generateContentWithRetry: jest.fn() }));
const { generateContentWithRetry } = require('../src/shared/services/geminiClient');
const service = require('../src/features/interviews/services/geminiService');
const utils = require('../src/features/interviews/services/evaluationUtils');
const Interview = require('../src/features/interviews/models/Interview');
const response = (n) => ({ technicalKnowledge:n, codingAbility:n, communicationSkills:n, problemSolving:n, overallScore:99, feedback:'Relevant understanding with room for improvement', strengths:['Relevant concepts'], improvements:['Add detail'] });
beforeEach(() => jest.clearAllMocks());
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
test('API failure returns null scores',async()=>{generateContentWithRetry.mockResolvedValue({ok:false,errorCode:'TIMEOUT'});const r=await service.analyzeAnswer('Answer','Q');expect(r.score).toBeNull();expect(r.feedback).toBe('Evaluation service temporarily unavailable');expect(generateContentWithRetry).toHaveBeenCalledTimes(2);});
test('extracts JSON and repairs trailing commas',()=>{const text='Here is JSON: '+JSON.stringify(response(7)).replace(/}$/,',}')+' done';expect(utils.parseEvaluation(text).overallScore).toBe(7);});
test('malformed dimensions retry rather than fabricate marks',async()=>{generateContentWithRetry.mockResolvedValueOnce({ok:true,data:{feedback:'bad'}}).mockResolvedValueOnce({ok:true,data:response(6)});expect((await service.analyzeAnswer('Answer','Q')).score).toBe(6);});
test('four independent dimension averages exclude outages and include skips',()=>{const a=utils.parseEvaluation({...response(7),technicalKnowledge:8,codingAbility:4,communicationSkills:9,problemSolving:6});const r=service.calculateSkillScores([{analysis:a},{analysis:utils.unavailable()},{analysis:utils.skipped()}]);expect(r).toEqual({overallScore:3.5,technicalKnowledge:4,codingAbility:2,communicationSkills:4.5,problemSolving:3});});
test('Mongo schema retains audit fields and scores',()=>{const doc=new Interview({title:'Test',skills:['C++'],duration:30,candidates:[{code:'TEST',results:{answers:[utils.serializeAnswer({question:{id:'q1',question:'Q'},answer:'c plus plus',analysis:{...utils.parseEvaluation(response(7)),rawTranscript:'c plus plus',normalizedTranscript:'C++',speechConfidence:null}})]}}]});const a=doc.candidates[0].results.answers[0].toObject();expect(a.rawTranscript).toBe('c plus plus');expect(a.normalizedTranscript).toBe('C++');expect(a.technicalKnowledge).toBe(7);expect(a.status).toBe('evaluated');expect(a.speechConfidence).toBeNull();});
test('zero performance differs from service failure',async()=>{const r=await service.generateFinalEvaluation([{answer:'irrelevant',analysis:utils.parseEvaluation(response(0))}]);expect(r.overallScore).toBe(0);expect(r.overallFeedback).not.toContain('failed');const f=await service.generateFinalEvaluation([{answer:'Answer',analysis:utils.unavailable()}]);expect(f.overallScore).toBeNull();});
