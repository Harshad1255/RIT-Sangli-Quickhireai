const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const mongoose = require('mongoose');
const CodingProblem = require('../src/features/coding/models/CodingProblem');

async function main() {
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is required');

  await mongoose.connect(process.env.MONGODB_URI);
  const problems = await CodingProblem.find({})
    .select('_id title companyId isActive createdAt')
    .sort({ createdAt: 1 })
    .lean();
  const groups = new Map();

  for (const problem of problems) {
    const normalizedTitle = String(problem.title || '').trim().toLocaleLowerCase();
    const key = `${problem.companyId || 'unowned'}:${normalizedTitle}`;
    const group = groups.get(key) || [];
    group.push(problem);
    groups.set(key, group);
  }

  const duplicates = Array.from(groups.values()).filter(group => group.length > 1);
  console.log(`Duplicate coding problem title groups: ${duplicates.length}`);
  console.log(JSON.stringify(duplicates, null, 2));
}

main()
  .catch(error => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());