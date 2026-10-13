const {fallbackEvaluation:f,withMarks,reportTotals} = require('../src/features/interviews/services/fallbackEvaluation');
const {completedSession} = require('../src/features/interviews/services/sessionCompletion');
const q={id:'q',question:'Explain encapsulation and inheritance',expectedKeyPoints:['private access','parent child reuse'],maxMarks:20};
test('relevant explanations receive modest credit; random or blank text does not',()=>{
 const strong=f('Encapsulation hides private data; inheritance lets a child reuse parent behavior because access is controlled.',q);
 const partial=f('Inheritance reuses parent behavior.',q);
 const weak=f('Inheritance',q);
 expect(strong.score).toBeGreaterThan(partial.score);expect(partial.score).toBeGreaterThan(weak.score);
 expect(strong.score).toBeLessThanOrEqual(6.5);
 expect(f('bananas fly to the moon '.repeat(200),q).score).toBe(0);
 expect(f(' ',q).status).toBe('skipped');
 expect(strong).toMatchObject({status:'provisional',evaluationSource:'fallback',evaluationFailed:false});
});
test('paraphrases and HR experience provide evidence without exact answer matching',()=>{
 expect(f('private access hides data',q).score).toBeGreaterThan(0);
 expect(f('I helped colleagues and resolved a disagreement by listening.',{question:'Tell me about teamwork',category:'hr'}).score).toBeGreaterThan(0);
});
test('weighted marks include blanks and respect unequal maximum marks',()=>{
 const rows=[{questionId:'q',answer:'answer',analysis:withMarks({status:'evaluated',score:8},q)},{questionId:'q2',answer:'',analysis:withMarks({status:'skipped',score:0},{maxMarks:5})}];
 expect(reportTotals(rows)).toMatchObject({marksObtained:16,totalMarks:25,percentage:64,totalQuestions:2,attemptedQuestions:1,evaluationStatus:'completed'});
 expect(withMarks({score:99},q).marksObtained).toBe(20);
 expect(withMarks({score:-10},q).marksObtained).toBe(0);
});
test('provisional persisted reports restore after serialization but cannot be labelled completed AI',()=>{
 const analysis=withMarks(f('Inheritance reuses parent behavior',q),q);
 const answers=[{questionId:'q',answer:'Inheritance reuses parent behavior',analysis}];
 const report={...reportTotals(answers),overallScore:analysis.score,skillAssessment:analysis};
 const session=JSON.parse(JSON.stringify({status:'completed',evaluationStatus:'provisional',totalQuestions:1,questions:[q],answers,finalEvaluation:report}));
 expect(completedSession(session)).toBe(true);expect(report.fallbackQuestions).toEqual(['q']);
});
