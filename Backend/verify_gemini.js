require('dotenv').config();
const { GoogleGenerativeAI } = require("@google/generative-ai");

async function checkGeminiAPI() {
  console.log("Checking Gemini API connection...");
  
  if (!process.env.GEMINI_API_KEY) {
    console.error("❌ ERROR: GEMINI_API_KEY is not set in your .env file.");
    return;
  }
  
  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    // Use the functional model that we confirmed works
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    
    console.log("Sending a test prompt to Gemini (gemini-1.5-flash)...");
    const result = await model.generateContent("Hello, respond with exactly 'API IS WORKING' and nothing else.");
    
    const responseText = await result.response.text();
    console.log("✅ Response received:");
    console.log("-----------------------------------------");
    console.log(responseText.trim());
    console.log("-----------------------------------------");
    console.log("✅ API is working successfully!");
    
  } catch (error) {
    console.error("❌ ERROR connecting to Gemini API:");
    console.error(error.message || error);
    if (error.message && error.message.includes("429")) {
      console.error("\nQuota Exceeded! You have used up your limits for this API key.");
    }
  }
}

checkGeminiAPI();
