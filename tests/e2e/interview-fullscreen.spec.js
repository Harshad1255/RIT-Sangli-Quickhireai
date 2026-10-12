const { test, expect } = require('@playwright/test');
const code = 'mock-fullscreen-test';
const report = {overallScore:7,skillAssessment:{technicalKnowledge:7,codingAbility:7,communicationSkills:7,problemSolving:7},strengths:[],weaknesses:[],recommendations:[],overallFeedback:'Completed interview'};
const question = number => ({id:`q-${number}`,question:`Lifecycle question ${number}`,topic:'JavaScript',questionNumber:number,isFollowUp:false});

async function setup(page, overrides = {}) {
  const session = {sessionId:'session-current',interviewCode:code,status:'active',evaluationStatus:'not_started',skills:['JavaScript'],totalQuestions:5,questions:[question(1)],answers:[],...overrides};
  const calls = {start:0,evaluate:0};
  await page.addInitScript(() => {
    localStorage.setItem('token','test-student');localStorage.setItem('user',JSON.stringify({userType:'student'}));
    sessionStorage.setItem('selectedSkills',JSON.stringify(['JavaScript']));
    let fullscreen = false;
    Object.defineProperty(document,'fullscreenEnabled',{get:()=>true,configurable:true});
    Object.defineProperty(document,'fullscreenElement',{get:()=>fullscreen ? document.documentElement : null,configurable:true});
    document.documentElement.requestFullscreen = async()=>{fullscreen=true;document.dispatchEvent(new Event('fullscreenchange'));};
    document.exitFullscreen = async()=>{fullscreen=false;document.dispatchEvent(new Event('fullscreenchange'));};
  });
  await page.route('**/interviews/**',async route=>{
    const pathname=new URL(route.request().url()).pathname;
    if(pathname.endsWith('/start')) {calls.start++;return route.fulfill({json:{success:true,interview:session,resumed:true}});}
    if(pathname.endsWith('/evaluate-answer')) {
      calls.evaluate++;
      const body=route.request().postDataJSON();
      const analysis={status:'evaluated',score:7,overallScore:7,technicalKnowledge:7,codingAbility:7,communicationSkills:7,problemSolving:7,feedback:'Good',strengths:[],improvements:[]};
      session.answers.push({questionId:body.question.id,question:body.question.question,answer:body.answer,analysis,isFollowUp:false});
      if(session.answers.length===5) {
        if(overrides.failEvaluation) return route.fulfill({status:503,json:{success:false,status:'failed',error:'Evaluation unavailable. Your answers are saved; retry.'}});
        session.status='completed';session.evaluationStatus='completed';session.finalEvaluation=report;
        return route.fulfill({json:{success:true,isComplete:true,status:'completed',evaluationStatus:'completed',sessionId:session.sessionId,interviewCode:code,evaluation:report,lastAnswerEvaluation:analysis}});
      }
      const next=question(session.answers.length+1);session.questions.push(next);
      return route.fulfill({json:{success:true,evaluation:analysis,nextQuestion:next,isFollowUp:false,progress:{current:next.questionNumber,total:5}}});
    }
    return route.fulfill({json:{success:true}});
  });
  await page.goto(`/interview/mock/session/${code}`);
  await page.getByRole('button',{name:'Enter Fullscreen',exact:true}).click();
  return {session,calls};
}

test('fullscreen entry and repeated events preserve first question without evaluation',async({page})=>{
 const {calls}=await setup(page);
 await expect(page.getByText('Lifecycle question 1',{exact:true})).toBeVisible();
 for(let i=0;i<4;i++) await page.evaluate(()=>document.dispatchEvent(new Event('fullscreenchange')));
 await expect(page.getByText('Lifecycle question 1',{exact:true})).toBeVisible();
 await expect(page.getByRole('heading',{name:'Interview Evaluation',exact:true})).toHaveCount(0);
 expect(calls.evaluate).toBe(0);expect(calls.start).toBe(1);expect(page.url()).toContain(`/session/${code}`);
});

test('remount restores active session without a report',async({page})=>{
 const {session,calls}=await setup(page);
 await expect(page.getByText('Lifecycle question 1',{exact:true})).toBeVisible();
 session.answers.push({questionId:'q-1',answer:'Saved',analysis:{status:'evaluated'},isFollowUp:false});session.questions.push(question(2));
 await page.reload();await page.getByRole('button',{name:'Enter Fullscreen',exact:true}).click();
 await expect(page.getByText('Lifecycle question 2',{exact:true})).toBeVisible();expect(calls.evaluate).toBe(0);
 await expect(page.getByRole('heading',{name:'Interview Evaluation',exact:true})).toHaveCount(0);
});

test('report appears only after five explicit submissions and server completion',async({page})=>{
 const {calls,session}=await setup(page);
 for(let number=1;number<=5;number++) {
   await expect(page.getByText(`Lifecycle question ${number}`,{exact:true})).toBeVisible();
   await expect(page.getByRole('heading',{name:'Interview Evaluation',exact:true})).toHaveCount(0);
   await page.getByPlaceholder('Your spoken answer will appear here, or you can type it.').fill('Explicit answer');
   await page.getByRole('button',{name:'Submit Answer',exact:true}).click();
 }
 await expect(page.getByRole('heading',{name:'Interview Evaluation',exact:true})).toBeVisible();expect(calls.evaluate).toBe(5);expect(session.answers).toHaveLength(5);
});

test('evaluation failure displays recoverable error instead of a zero report',async({page})=>{
 await setup(page,{failEvaluation:true});
 for(let number=1;number<=5;number++) {
   await expect(page.getByText(`Lifecycle question ${number}`,{exact:true})).toBeVisible();
   await page.getByPlaceholder('Your spoken answer will appear here, or you can type it.').fill('Answer');await page.getByRole('button',{name:'Submit Answer',exact:true}).click();
 }
 await expect(page.getByText('Evaluation unavailable. Your answers are saved; retry.',{exact:true})).toBeVisible();
 await expect(page.getByRole('heading',{name:'Interview Evaluation',exact:true})).toHaveCount(0);
 await expect(page.getByRole('button',{name:'Retry safely'})).toBeVisible();
});

test('stale completed report with no completed answers is never displayed',async({page})=>{
 const {calls}=await setup(page,{status:'completed',evaluationStatus:'completed',finalEvaluation:{...report,overallScore:0},answers:[]});
 await expect(page.getByText('This previous session does not have a valid completed evaluation. Start a new mock interview.',{exact:true})).toBeVisible();
 await expect(page.getByRole('heading',{name:'Interview Evaluation',exact:true})).toHaveCount(0);expect(calls.evaluate).toBe(0);
});

test('new mock attempts using the same label have separate session codes',async({page})=>{
 await setup(page);
 const codes=await page.evaluate(async()=>{
   const {newMockAttempt}=await import('/src/features/interview/services/interviewLifecycle.js');
   return [newMockAttempt('same-label'),newMockAttempt('same-label')];
 });
 expect(codes[0]).not.toBe(codes[1]);expect(codes.every(value=>value.startsWith('mock-same-label-'))).toBe(true);
});
