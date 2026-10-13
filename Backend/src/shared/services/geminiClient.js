// We bypass the outdated @google/generative-ai SDK and use native Node fetch
// This guarantees we hit the v1beta endpoint and can use gemini-1.5-flash!

const MODEL_NAME = process.env.GEMINI_MODEL || "gemini-3.8-flash";

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const generateContentWithRetry = async (prompt, options = {}) => {
  const {
    isJson = true,
    maxRetries = 2,
    timeoutMs = 60000,
  } = options;

  if (!process.env.GEMINI_API_KEY) {
    return { ok: false, data: null, errorCode: 'MISSING_API_KEY' };
  }

  // Use the newer v1beta endpoint directly
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${process.env.GEMINI_API_KEY}`;

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

  let attempt = 0;
  while (attempt <= maxRetries) {
    try {
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
        throw new Error(`HTTP_${response.status}: ${errorText}`);
      }

      const data = await response.json();
      
      if (!data.candidates || !data.candidates[0].content || !data.candidates[0].content.parts) {
        throw new Error('INVALID_RESPONSE_FORMAT');
      }

      const text = data.candidates[0].content.parts[0].text;

      if (isJson) {
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
      
      const isRetryable = error.message.includes('HTTP_429') || 
                          error.message.includes('HTTP_500') || 
                          error.message.includes('HTTP_503') || 
                          error.message === 'JSON_PARSE_FAILED';
      const isTimeout = error.name === 'AbortError' || error.message === 'REQUEST_TIMEOUT';
      
      if ((isRetryable || isTimeout) && attempt <= maxRetries) {
        const backoffMs = attempt * 2000;
        console.warn(`[GeminiClient] Request failed (${error.message}). Retrying in ${backoffMs}ms... (Attempt ${attempt}/${maxRetries})`);
        await delay(backoffMs);
        continue;
      }

      const cleanMessage = error.message?.replace(/key=([^&]+)/g, 'key=[REDACTED]');
      console.error(`[GeminiClient] Error Details:
  - Error Name: ${error.name}
  - Message: ${cleanMessage}
  - Retryable: ${isRetryable}
  - Timeout: ${isTimeout}`);
      
      return { 
        ok: false, 
        data: null, 
        errorCode: isTimeout ? 'TIMEOUT' : (error.message === 'JSON_PARSE_FAILED' ? 'JSON_PARSE_FAILED' : 'UNKNOWN_ERROR'),
        errorMessage: cleanMessage
      };
    }
  }
};

module.exports = {
  generateContentWithRetry,
  generateContent: generateContentWithRetry
};
