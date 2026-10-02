const { GoogleGenerativeAI } = require("@google/generative-ai");

// Get model name from env or default to a known stable flash model
const MODEL_NAME = process.env.GEMINI_MODEL || "gemini-1.5-flash";

let genAI = null;

const getGenAI = () => {
  if (!genAI && process.env.GEMINI_API_KEY) {
    genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  }
  return genAI;
};

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const generateContentWithRetry = async (prompt, options = {}) => {
  const {
    isJson = true,
    maxRetries = 2,
    timeoutMs = 60000,
  } = options;

  const instance = getGenAI();
  if (!instance) {
    return { ok: false, data: null, errorCode: 'MISSING_API_KEY' };
  }

  const modelOpts = { model: MODEL_NAME };
  
  // If we need JSON output, and the SDK version supports it, we can pass it here.
  // We'll wrap the call to handle older SDK versions gracefully if they don't support systemInstructions/generationConfig.
  if (isJson) {
    modelOpts.generationConfig = { responseMimeType: "application/json" };
  }

  const model = instance.getGenerativeModel(modelOpts);

  let attempt = 0;
  while (attempt <= maxRetries) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      // We pass the abort signal if the SDK supports it.
      // Older SDKs might ignore it, but we can race with a timeout promise.
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('REQUEST_TIMEOUT')), timeoutMs)
      );

      const generatePromise = model.generateContent(prompt);
      
      const result = await Promise.race([generatePromise, timeoutPromise]);
      clearTimeout(timeoutId);

      const response = await result.response;
      const text = response.text();

      if (isJson) {
        // Safe parse and repair: extract only the JSON block
        let cleanJson = text;
        const match = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
        if (match) {
          cleanJson = match[1].trim();
        } else {
          cleanJson = text.trim();
        }
        
        try {
          const parsed = JSON.parse(cleanJson);
          return { ok: true, data: parsed, errorCode: null };
        } catch (parseErr) {
          console.error(`[GeminiClient] JSON Parse Failed. Response was: ${text}`);
          throw new Error('JSON_PARSE_FAILED');
        }
      }

      return { ok: true, data: text, errorCode: null };

    } catch (error) {
      attempt++;
      
      const status = error.status || error.response?.status;
      const isRetryable = status === 429 || status === 500 || status === 503 || error.message === 'JSON_PARSE_FAILED';
      const isTimeout = error.message === 'REQUEST_TIMEOUT' || error.name === 'AbortError';
      
      if ((isRetryable || isTimeout) && attempt <= maxRetries) {
        const backoffMs = attempt * 2000;
        console.warn(`[GeminiClient] Request failed (${status || error.message}). Retrying in ${backoffMs}ms... (Attempt ${attempt}/${maxRetries})`);
        await delay(backoffMs);
        continue;
      }

      // Log error safely without prompt or key
      console.error(`[GeminiClient] Error: ${error.name} - ${error.message?.split('key=')[0]}`);
      
      return { 
        ok: false, 
        data: null, 
        errorCode: isTimeout ? 'TIMEOUT' : (status ? `HTTP_${status}` : 'UNKNOWN_ERROR')
      };
    }
  }
};

module.exports = {
  generateContentWithRetry,
  generateContent: generateContentWithRetry
};
