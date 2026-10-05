const mongoose = require('mongoose');
const { Progress, AptitudeSubmission, User } = require('./backend/src/features/scholastic/models');
const connectDB = require('./backend/src/config/db');

require('dotenv').config({ path: './backend/.env' });

async function run() {
  await connectDB();
  
  const submissions = await AptitudeSubmission.find().populate('userId').populate('questionId').limit(10);
  console.log("Found Submissions:", submissions.length);
  for (let s of submissions) {
    console.log(`- User: ${s.userId?.email}, Q: ${s.questionId?._id}, isCorrect: ${s.isCorrect}`);
  }

  const progresses = await Progress.find().populate('userId').limit(10);
  console.log("Found Progresses:", progresses.length);
  for (let p of progresses) {
    console.log(`- User: ${p.userId?.email}, Aptitude:`, p.questionsSolved?.aptitude);
  }

  mongoose.connection.close();
}

run().catch(console.error);
