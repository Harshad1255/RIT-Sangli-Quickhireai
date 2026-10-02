const path = require('path');
require('dotenv').config({path: path.join(__dirname, '../.env')});
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function run() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.log('fail, 401, Error: GEMINI_API_KEY missing');
    return;
  }

  // 1. Check ListModels using fetch (since older SDK might not support it)
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    if (!res.ok) {
      console.log(`ListModels fail: ${res.status} ${res.statusText}`);
    } else {
      const data = await res.json();
      const models = data.models.map(m => m.name.split('/')[1]);
      console.log('Available models:', models.join(', '));
    }
  } catch (err) {
    console.log('ListModels request failed:', err.message);
  }

  // 2. Check generateContent using the SDK
  const genAI = new GoogleGenerativeAI(apiKey);
  try {
    const modelStr = process.env.GEMINI_MODEL || "gemini-1.5-flash";
    const model = genAI.getGenerativeModel({ model: modelStr });
    const result = await model.generateContent("Respond with exactly the word ok");
    const text = result.response.text();
    console.log(`ok, 200 (Model responded: ${text.trim()})`);
  } catch (err) {
    const safeMessage = err.message ? err.message.split('key=')[0].replace(apiKey, '[REDACTED]') : 'Unknown message';
    console.log(`fail, ${err.status || 'unknown status'}, ${err.name || 'Error'}: ${safeMessage}`);
  }
}

run();
