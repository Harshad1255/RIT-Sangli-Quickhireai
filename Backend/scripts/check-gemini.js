const path=require('node:path');
require('dotenv').config({path:path.join(__dirname,'../.env'),quiet:true});
const {generateContentWithRetry,config}=require('../src/shared/services/geminiClient');
const {parseEvaluation}=require('../src/features/interviews/services/evaluationUtils');
async function run() {
  const current=config();
  console.log(JSON.stringify({stage:'connectivity_configuration',...current,apiVersion:'v1beta'}));
  if(!current.keyConfigured) {process.exitCode=1;return;}
  if(!/^[\w.-]+$/.test(current.model)) {console.log(JSON.stringify({errorCode:'INVALID_MODEL_CONFIGURATION'}));process.exitCode=1;return;}
  const endpoint=`https://generativelanguage.googleapis.com/v1beta/models/${current.model}`;
  try {
    const response=await fetch(endpoint,{headers:{'x-goog-api-key':process.env.GEMINI_API_KEY},signal:AbortSignal.timeout(20000)});
    const body=await response.json();
    console.log(JSON.stringify({stage:'model_access',httpStatus:response.status,supportsGenerateContent:body.supportedGenerationMethods?.includes('generateContent') || false}));
  }catch(error){console.log(JSON.stringify({stage:'model_access',errorCode:error.name==='TimeoutError'?'TIMEOUT':'NETWORK_ERROR'}));}
  const prompt='Evaluate the synthetic answer "A closure retains access to its lexical scope" to "What is a JavaScript closure?". Return ONLY JSON with numeric technicalKnowledge, codingAbility, communicationSkills, problemSolving scores from 0 to 10, feedback (string), strengths (array of strings) and improvements (array of strings). Do not include personal information.';
  const result=await generateContentWithRetry(prompt,{isJson:true,maxRetries:0,timeoutMs:Math.min(60000,Math.max(5000,Number(process.env.GEMINI_EVALUATION_TIMEOUT_MS)||45000)),parseJson:parseEvaluation});
  console.log(JSON.stringify({stage:'connectivity_evaluation',ok:result.ok,errorCode:result.errorCode,httpStatus:result.httpStatus,scoreValidated:result.ok && result.data.status==='evaluated'}));
  if(!result.ok) process.exitCode=1;
}
run().catch(()=>{console.log(JSON.stringify({errorCode:'CONNECTIVITY_CHECK_FAILED'}));process.exitCode=1;});
