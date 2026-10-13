jest.mock('../src/features/interviews/models/Interview',()=>({findOne:jest.fn(),updateOne:jest.fn()}));
jest.mock('../src/features/interviews/models/InterviewSession',()=>require('./helpers/interviewSessionMock')());
jest.mock('../src/features/interviews/services/geminiService',()=>({analyzeAnswer:jest.fn(),generateFinalEvaluation:jest.fn()}));
const Interview=require('../src/features/interviews/models/Interview');
const Session=require('../src/features/interviews/models/InterviewSession');
const service=require('../src/features/interviews/services/geminiService');
const retry=require('../src/features/interviews/controllers/retryEvaluationController');
const {fallbackEvaluation,withMarks,reportTotals}=require('../src/features/interviews/services/fallbackEvaluation');
const response=()=>({status:jest.fn().mockReturnThis(),json:jest.fn()});
test('legacy results endpoint ignores browser supplied scores',async()=>{
 const q={id:'server-score',question:'Q'};
 const analysis=withMarks({status:'evaluated',score:4,technicalKnowledge:4,codingAbility:4,communicationSkills:4,problemSolving:4},q);
 const answers=[{questionId:q.id,answer:'A',analysis}];
 const report={...reportTotals(answers),overallScore:4,skillAssessment:analysis};
 await new Session({interviewCode:'server-score-code',status:'completed',evaluationStatus:'completed',totalQuestions:1,questions:[q],answers,finalEvaluation:report}).save();
 const candidate={candidate:'candidate',code:'server-score-code'};
 Interview.findById=jest.fn().mockResolvedValue({candidates:[candidate],save:jest.fn()});
 const res=response();await require('../src/features/interviews/controllers/resultController').submitInterviewResults({user:{interviewId:'interview',candidateId:'candidate'},body:{overallScore:10,technicalScore:10}},res);
 expect(candidate.results).toMatchObject({overallScore:4,technicalScore:4,percentage:40,marksObtained:4});
});
beforeEach(()=>{jest.clearAllMocks();Interview.findOne.mockResolvedValue({_id:'owner'});Interview.updateOne.mockResolvedValue({});service.generateFinalEvaluation.mockImplementation(async answers=>({...reportTotals(answers),overallScore:7,skillAssessment:{technicalKnowledge:7,codingAbility:7,communicationSkills:7,problemSolving:7}}));});
test('only company owner can retry, before any AI call',async()=>{
 Interview.findOne.mockResolvedValue(null);const res=response();await retry({params:{interviewCode:'code'},user:{id:'other'}},res);
 expect(Interview.findOne).toHaveBeenCalledWith({'candidates.code':'code',company:'other'});expect(res.status).toHaveBeenCalledWith(404);expect(service.analyzeAnswer).not.toHaveBeenCalled();
});
test('retry safely replaces provisional result and repairs a failed company write without duplicate marks',async()=>{
 const q={id:'q',question:'Explain inheritance'};
 const session=new Session({interviewCode:'retry-test',status:'completed',totalQuestions:1,questions:[q],answers:[{questionId:'q',answer:'parent child reuse',analysis:withMarks(fallbackEvaluation('parent child reuse',q),q)}],lastResponse:{isComplete:true}});
 session.markModified=jest.fn();await session.save();
 service.analyzeAnswer.mockResolvedValue(withMarks({status:'evaluated',score:8,overallScore:8,technicalKnowledge:8,codingAbility:8,communicationSkills:8,problemSolving:8},q));
 Interview.updateOne.mockRejectedValueOnce(new Error('write failed')).mockResolvedValue({});
 const req={params:{interviewCode:session.interviewCode},user:{id:'owner'}};
 const failed=response();await retry(req,failed);expect(failed.status).toHaveBeenCalledWith(500);
 const recovered=response();await retry(req,recovered);expect(recovered.json.mock.calls[0][0].success).toBe(true);
 expect(session.answers).toHaveLength(1);expect(session.answers[0].analysis.score).toBe(8);expect(service.analyzeAnswer).toHaveBeenCalledTimes(1);expect(session.lastResponse.evaluationStatus).toBe('completed');
 expect(Interview.updateOne.mock.calls[1][1].$set['candidates.$.results']).toMatchObject({totalMarks:10,marksObtained:8,percentage:80,evaluationStatus:'completed'});
});
