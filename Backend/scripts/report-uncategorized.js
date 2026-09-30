const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const mongoose = require('mongoose');
const CodingProblem = require('../src/features/coding/models/CodingProblem');

async function main() {
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is required');

  await mongoose.connect(process.env.MONGODB_URI);
  const problems = await CodingProblem.find({
    $or: [
      { category: /^algorithms$/i },
      { category: null },
      { category: '' }
    ]
  })
    .select('_id title category companyId createdAt')
    .sort({ createdAt: 1 })
    .lean();

  console.log(`Uncategorized coding problems: ${problems.length}`);
  console.log(JSON.stringify(problems, null, 2));
}

main()
  .catch(error => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());