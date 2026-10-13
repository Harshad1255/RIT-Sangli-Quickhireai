// Gemini API Client using native Node fetch with automatic fallback model cascade
// Guaranteed compatibility with Google Generative Language v1beta API

function getCandidateModels() {
  const envModel = process.env.GEMINI_MODEL;
  const list = [];
  if (envModel && !envModel.includes('3.8-flash') && !envModel.includes('2.5-flash')) {
    list.push(envModel.trim());
  }
  list.push('gemini-1.5-flash', 'gemini-1.5-flash-latest', 'gemini-2.0-flash');
  return [...new Set(list)];
}

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const generateContentWithRetry = async (prompt, options = {}) => {
  const {
    isJson = true,
    maxRetries = 2,
    timeoutMs = 30000,
  } = options;

  if (!process.env.GEMINI_API_KEY) {
    return { ok: false, data: null, errorCode: 'MISSING_API_KEY', errorMessage: 'GEMINI_API_KEY is not configured.' };
  }

  const candidateModels = getCandidateModels();
  const payload = {
    contents: [
      {
        parts: [{ text: prompt }]
      }
    ]
  };

  if (isJson) {
    payload.generationConfig = { responseMimeType: "application/json" };
  }

  for (const modelName of candidateModels) {
    let attempt = 0;
    while (attempt <= maxRetries) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${process.env.GEMINI_API_KEY}`;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload),
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorText = await response.text();
          // If model is 404 (not found) or 400 (unsupported), break retry to try next model in cascade
          if (response.status === 404 || (response.status === 400 && errorText.includes('models/'))) {
            console.warn(`[GeminiClient] Model ${modelName} not available (${response.status}). Trying next candidate model.`);
            break;
          }
          throw new Error(`HTTP_${response.status}: ${errorText}`);
        }

        const data = await response.json();
        
        if (!data.candidates || !data.candidates[0]?.content?.parts?.[0]?.text) {
          throw new Error('INVALID_RESPONSE_FORMAT');
        }

        const text = data.candidates[0].content.parts[0].text;

        if (isJson) {
          let cleanJson = text.trim();
          const match = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
          if (match) {
            cleanJson = match[1].trim();
          } else {
            const firstBrace = text.indexOf('{');
            const lastBrace = text.lastIndexOf('}');
            if (firstBrace !== -1 && lastBrace > firstBrace) {
              cleanJson = text.substring(firstBrace, lastBrace + 1);
            }
          }
          
          try {
            const parsed = JSON.parse(cleanJson);
            return { ok: true, data: parsed, errorCode: null, modelUsed: modelName };
          } catch (parseErr) {
            try {
              const sanitized = cleanJson
                .replace(/,\s*}/g, '}')
                .replace(/,\s*]/g, ']');
              const parsed = JSON.parse(sanitized);
              return { ok: true, data: parsed, errorCode: null, modelUsed: modelName };
            } catch (sanitizedErr) {
              console.error(`[GeminiClient] JSON Parse Failed. Response was: ${text}`);
              throw new Error('JSON_PARSE_FAILED');
            }
          }
        }

        return { ok: true, data: text, errorCode: null, modelUsed: modelName };

      } catch (error) {
        attempt++;
        
        const isRetryable = error.message.includes('HTTP_429') || 
                            error.message.includes('HTTP_500') || 
                            error.message.includes('HTTP_503') || 
                            error.message === 'JSON_PARSE_FAILED';
        const isTimeout = error.name === 'AbortError' || error.message === 'REQUEST_TIMEOUT';
        
        if ((isRetryable || isTimeout) && attempt <= maxRetries) {
          const backoffMs = attempt * 1500;
          console.warn(`[GeminiClient] Request failed (${error.message}). Retrying in ${backoffMs}ms... (Attempt ${attempt}/${maxRetries})`);
          await delay(backoffMs);
          continue;
        }

        const cleanMessage = error.message?.replace(/key=([^&]+)/g, 'key=[REDACTED]');
        console.error(`[GeminiClient] Attempt ${attempt} error for model ${modelName}: ${cleanMessage}`);
        break; // Try next model or finish
      }
    }
  }

  return { 
    ok: false, 
    data: null, 
    errorCode: 'AI_SERVICE_UNAVAILABLE',
    errorMessage: 'All Gemini model candidates exhausted or unavailable. Activating fallback.'
  };
};

module.exports = {
  generateContentWithRetry,
  generateContent: generateContentWithRetry
};
