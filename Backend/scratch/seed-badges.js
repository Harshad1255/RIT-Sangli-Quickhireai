require('dotenv').config({ path: '../.env' });
const mongoose = require('mongoose');
const Badge = require('../src/features/scholastic/models/Badge');

async function seed() {
  await mongoose.connect(process.env.MONGODB_URI);
  
  const badges = [
    {
      key: 'daily_grinder',
      name: 'Daily Grinder',
      description: 'Solve 5 questions in a single day',
      icon: 'fas fa-dumbbell',
      color: '#3b82f6',
      criteria: { metric: 'daily_solved_count', threshold: 5 }
    },
    {
      key: 'on_fire',
      name: 'On Fire',
      description: 'Maintain a 14-day daily streak',
      icon: 'fas fa-fire',
      color: '#ef4444',
      criteria: { metric: 'daily_streak', threshold: 14 }
    },
    {
      key: 'combo_master',
      name: 'Combo Master',
      description: 'Solve at least 1 aptitude and 1 coding question on the same day',
      icon: 'fas fa-handshake',
      color: '#8b5cf6',
      criteria: { metric: 'combo_day', threshold: 1 }
    }
  ];

  for (const b of badges) {
    await Badge.findOneAndUpdate({ key: b.key }, b, { upsert: true });
    console.log('Seeded badge:', b.key);
  }

  mongoose.disconnect();
}

seed().catch(console.error);
