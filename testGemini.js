const path = require('path');
require('dotenv').config({ path: path.join(__dirname, 'backend', '.env') });

const { analyzeAnswer } = require('./backend/src/features/interviews/services/geminiService');

async function test() {
  console.log('Testing Gemini API integration...');
  console.log('API Key available:', !!process.env.GEMINI_API_KEY);
  if (process.env.GEMINI_API_KEY) {
      console.log('Key prefix:', process.env.GEMINI_API_KEY.substring(0, 5) + '...');
  }
  
  const question = "Explain the core concepts and fundamental principles of C++.";
  const answer = "C++ is an object oriented general purpose programming language known for performance, flexibility, memory control, encapsulation, inheritance, polymorphism and templates.";
  
  console.log('\nEvaluating answer...');
  const result = await analyzeAnswer(answer, question);
  console.log('\nEvaluation Result:');
  console.log(JSON.stringify(result, null, 2));
}

test();
