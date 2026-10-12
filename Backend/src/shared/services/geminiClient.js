const diagnostics = require('./evaluationDiagnostics');
const delay = ms => new Promise(resolve=>setTimeout(resolve,ms));
const config = () => ({model:process.env.GEMINI_MODEL || 'gemini-3.8-flash',keyConfigured:!!process.env.GEMINI_API_KEY});
const messages = {
  MISSING_API_KEY:'GEMINI_API_KEY is missing on the backend.',
  HTTP_400:'Gemini rejected the request or API credential. Check backend key and request configuration.',
  HTTP_401:'Gemini API credentials are invalid.',
  HTTP_403:'Gemini access is denied. Check key restrictions and model permissions.',
  HTTP_404:'The configured Gemini model or API endpoint is unavailable.',
  HTTP_429:'Gemini quota or rate limit was exceeded. Check quota and billing before retrying.',
  TIMEOUT:'Gemini did not respond within the request timeout.',
  NETWORK_ERROR:'The backend could not connect to Gemini.',
  JSON_PARSE_FAILED:'Gemini returned malformed JSON.',
  SCORE_VALIDATION_FAILED:'Gemini returned invalid or missing evaluation scores.',
  EMPTY_RESPONSE:'Gemini returned no answer text.',
  BLOCKED_RESPONSE:'Gemini blocked the request or response.',
  TOKEN_LIMIT:'Gemini stopped before completing its response.',
  INVALID_RESPONSE_FORMAT:'Gemini returned an unsupported response format.',
  API_KEY_BLOCKED:'Gemini has blocked the API key. Replace it in the backend environment.',
  INVALID_MODEL_CONFIGURATION:'GEMINI_MODEL must be a model ID, not a URL.'
};
const failure = (code, extra={}) => Object.assign(new Error(messages[code] || 'Gemini service is unavailable.'),{errorCode:code,...extra});
const generateContentWithRetry = async (prompt, options={}) => {
  const {isJson=true,maxRetries=2,timeoutMs=60000}=options;
  const {model,keyConfigured}=config();
  const endpoint=`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
  const started=Date.now();
  const context={...Object.fromEntries(['sessionId','questionId','requestId'].filter(key=>options.context?.[key]).map(key=>[key,options.context[key]])),model:/^[\w.-]+$/.test(model)?model:'invalid',endpoint:/^[\w.-]+$/.test(model)?endpoint:'invalid',keyConfigured};
  const resultError = error => {
    const errorCode=error.errorCode || (error.name==='AbortError'?'TIMEOUT':'NETWORK_ERROR');
    const retryable=error.retryable ?? ['TIMEOUT','NETWORK_ERROR','JSON_PARSE_FAILED'].includes(errorCode);
    diagnostics.log('gemini_failed',{...context,errorCode,httpStatus:error.httpStatus,providerStatus:error.providerStatus,quotaMetric:error.quotaMetric,quotaLimit:error.quotaLimit,durationMs:Date.now()-started});
    return {ok:false,data:null,errorCode,errorMessage:messages[errorCode] || 'Gemini service is unavailable.',httpStatus:error.httpStatus,providerStatus:error.providerStatus,retryable};
  };
  if(!keyConfigured) return resultError(failure('MISSING_API_KEY',{retryable:false}));
  if(!/^[\w.-]+$/.test(model)) return resultError(failure('INVALID_MODEL_CONFIGURATION',{retryable:false}));
  const payload={contents:[{role:'user',parts:[{text:prompt}]}]};
  if(isJson) payload.generationConfig={responseMimeType:'application/json'};
  if(model === 'gemini-3.8-flash') payload.generationConfig={...payload.generationConfig,thinkingConfig:{thinkingLevel:'LOW',includeThoughts:false}};
  for(let attempt=0;attempt<=maxRetries;attempt++) {
    let timer;
    try {
      diagnostics.log('gemini_started',{...context,attempt:attempt+1});
      const controller=new AbortController();timer=setTimeout(()=>controller.abort(),timeoutMs);
      const response=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':process.env.GEMINI_API_KEY},body:JSON.stringify(payload),signal:controller.signal});
      diagnostics.log('gemini_http',{...context,httpStatus:response.status,attempt:attempt+1,durationMs:Date.now()-started});
      if(!response.ok) {
        let body={};try {body=JSON.parse(await response.text());}catch { /* Error bodies are never logged. */ }
        const providerStatus=/^[A-Z_]+$/.test(body.error?.status || '')?body.error.status:undefined;
        const errorCode=/reported as leaked/i.test(body.error?.message || '')?'API_KEY_BLOCKED':`HTTP_${response.status}`;
        const violation=(Array.isArray(body.error?.details)?body.error.details:[]).flatMap(detail=>Array.isArray(detail.violations)?detail.violations:[]).find(item=>item.quotaMetric);
        const quotaMetric=/^[\w./-]+$/.test(violation?.quotaMetric || '')?violation.quotaMetric:undefined;
        const quotaLimit=body.error?.message?.match(/limit:\s*(\d+)/i)?.[1];
        throw failure(errorCode,{httpStatus:response.status,providerStatus,quotaMetric,quotaLimit:quotaLimit===undefined?undefined:Number(quotaLimit),retryable:response.status===408 || response.status===429 || response.status>=500});
      }
      let body;
      try {body=await response.json();}catch(error) {if(error.name==='AbortError') throw error;throw failure('INVALID_RESPONSE_FORMAT',{retryable:false});}
      if(body.promptFeedback?.blockReason) throw failure('BLOCKED_RESPONSE',{retryable:false});
      const candidate=body.candidates?.[0];
      if(!candidate) throw failure('EMPTY_RESPONSE',{retryable:false});
      const finishReason=candidate.finishReason;
      diagnostics.log('gemini_candidate',{...context,finishReason:/^[A-Z_]+$/.test(finishReason || '')?finishReason:undefined});
      if(finishReason==='MAX_TOKENS') throw failure('TOKEN_LIMIT',{retryable:false});
      if(finishReason && finishReason!=='STOP') throw failure('BLOCKED_RESPONSE',{retryable:false});
      if(!Array.isArray(candidate.content?.parts)) throw failure('EMPTY_RESPONSE',{retryable:false});
      const text=candidate.content.parts.filter(part=>!part.thought && typeof part.text==='string').map(part=>part.text).join('').trim();
      if(!text) throw failure('EMPTY_RESPONSE',{retryable:false});
      let data=text;
      if(isJson) {
        const match=text.match(/```(?:json)?\s*([\s\S]*?)```/i);
        const cleaned=match?match[1].trim():text;
        try {data=options.parseJson?options.parseJson(cleaned):JSON.parse(cleaned);}
        catch(error) {throw failure(error.message==='INVALID_EVALUATION_RESPONSE'?'SCORE_VALIDATION_FAILED':'JSON_PARSE_FAILED');}
      }
      diagnostics.log('gemini_parsed',{...context,valid:true,durationMs:Date.now()-started});
      return {ok:true,data,errorCode:null};
    } catch(error) {
      const result=resultError(error);
      if(!result.retryable || attempt===maxRetries) return result;
      await delay(Math.min(2000,500*2**attempt));
    } finally {clearTimeout(timer);}
  }
};
module.exports={generateContentWithRetry,generateContent:generateContentWithRetry,config};
