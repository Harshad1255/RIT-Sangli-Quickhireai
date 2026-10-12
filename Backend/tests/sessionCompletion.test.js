const {completedSession,answersComplete}=require('../src/features/interviews/services/sessionCompletion');
const report={overallScore:0,skillAssessment:{technicalKnowledge:0,codingAbility:0,communicationSkills:0,problemSolving:0}};
const session=()=>({status:'completed',evaluationStatus:'completed',totalQuestions:1,questions:[{id:'q',question:'Q'}],answers:[{questionId:'q',analysis:{status:'skipped'}}],finalEvaluation:report});
test('zero score is valid only after explicit completed answers and persisted evaluation',()=>{
 expect(completedSession(session())).toBe(true);expect(completedSession({...session(),answers:[]})).toBe(false);expect(completedSession({...session(),status:'active'})).toBe(false);expect(completedSession({...session(),evaluationStatus:'running'})).toBe(false);
});
test('failed or pending answers and duplicate IDs cannot satisfy completion',()=>{
 expect(answersComplete({...session(),answers:[{questionId:'q',analysis:{status:'unavailable'}}]})).toBe(false);
 expect(answersComplete({...session(),answers:[{questionId:'q',analysis:{status:'pending'}}]})).toBe(false);
 expect(answersComplete({...session(),answers:[...session().answers,...session().answers]})).toBe(false);
});
test('null, missing, nonfinite and out of range report scores remain incomplete',()=>{
 for(const value of [null,undefined,NaN,11]) expect(completedSession({...session(),finalEvaluation:{...report,overallScore:value}})).toBe(false);
 expect(completedSession({...session(),finalEvaluation:{overallScore:0}})).toBe(false);
});
