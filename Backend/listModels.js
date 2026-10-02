const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

async function listModels() {
  const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GEMINI_API_KEY}`;
  
  try {
    const res = await fetch(url);
    const data = await res.json();
    
    console.log("=== AVAILABLE MODELS ===");
    if (data.models) {
      data.models.forEach(m => {
        if (m.supportedGenerationMethods && m.supportedGenerationMethods.includes('generateContent')) {
          console.log(`- ${m.name.replace('models/', '')}`);
        }
      });
    } else {
      console.log(data);
    }
  } catch (err) {
    console.error("Error fetching models:", err.message);
  }
}

listModels();
