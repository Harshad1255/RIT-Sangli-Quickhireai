// Use the REST API so deployments can select the model through GEMINI_MODEL.

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

  const started = Date.now();
  let attempt = 0;
  while (attempt <= maxRetries) {
    let timeoutId;
    try {
      const controller = new AbortController();
      timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload),
        signal: controller.signal
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP_${response.status}: ${errorText}`);
      }

      const data = await response.json();

      if (!data.candidates || !data.candidates[0].content || !data.candidates[0].content.parts) {
        throw new Error('INVALID_RESPONSE_FORMAT');
      }

      const text = data.candidates[0].content.parts.map(part => part.text || '').join('');
      clearTimeout(timeoutId);

      if (isJson) {
        let cleanJson = text;
        const match = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
        if (match) {
          cleanJson = match[1].trim();
        } else {
          cleanJson = text.trim();
        }

        try {
          const parsed = options.parseJson ? options.parseJson(cleanJson) : JSON.parse(cleanJson);
          console.info("[interview timing]",{stage:"gemini_json",model:MODEL_NAME,durationMs:Date.now()-started,attempts:attempt+1});
          return { ok: true, data: parsed, errorCode: null };
        } catch (parseErr) {
          console.error(`[GeminiClient] JSON Parse Failed. Response was: ${text}`);
          throw new Error('JSON_PARSE_FAILED');
        }
      }

      return { ok: true, data: text, errorCode: null };

    } catch (error) {
      clearTimeout(timeoutId);
      attempt++;

      const isRetryable = ['ECONNRESET','ECONNREFUSED','ETIMEDOUT','EAI_AGAIN'].includes(error.cause?.code || error.code) || error.message.includes('HTTP_429') ||
                          error.message.includes('HTTP_500') ||
                          error.message.includes('HTTP_503') ||
                          error.message === 'JSON_PARSE_FAILED';
      const isTimeout = error.name === 'AbortError' || error.message === 'REQUEST_TIMEOUT';

      if ((isRetryable || isTimeout) && attempt <= maxRetries) {
        const backoffMs = attempt * 500;
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
