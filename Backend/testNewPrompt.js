require('dotenv').config();
const { analyzeAnswer } = require('./src/features/interviews/services/geminiService');
const mongoose = require('mongoose');

async function test() {
  try {
    console.log('Testing the new 4-dimension prompt...');
    const result = await analyzeAnswer(
      "general 4 + programming language known for high performance exability and low level memory control its core concept includes of UKG per encapsulation in a returns polymorphism and abduction along with pointers references template and STL",
      "Explain the core concepts and fundamental principles."
    );
    console.log('Result:', JSON.stringify(result, null, 2));
  } catch (err) {
    console.error('Error:', err);
  }
}

test();
