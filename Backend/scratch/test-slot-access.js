// Run this file via Node or directly copy its logic to test slot access
require('dotenv').config({ path: '../../.env' });
const mongoose = require('mongoose');
const AptitudeTest = require('./src/features/aptitude/models/AptitudeTest');
const { resolveSlotState } = require('./src/features/aptitude/utils/slotUtils');

async function testSlotAccess() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to DB');

  // Find a test that has multi_slot enabled
  const test = await AptitudeTest.findOne({ schedulingMode: 'multi_slot' });
  if (!test) {
    console.log('No multi-slot test found. Please create one in the UI first.');
    process.exit(0);
  }

  console.log(`Testing slots for Test: ${test.title}`);

  for (const slot of test.slots) {
    console.log(`\nSlot: ${slot.label} (Order: ${slot.order})`);
    console.log(`Start: ${slot.startTime}`);
    console.log(`End: ${slot.endTime}`);
    
    // Simulate real-time resolution
    const state = resolveSlotState(slot);
    console.log(`Real-Time State: ${state}`);

    // Simulate future scenario
    const oneHourBeforeStart = new Date(new Date(slot.startTime).getTime() - 60 * 60 * 1000);
    console.log(`Simulated State (1h before start): ${resolveSlotState(slot, oneHourBeforeStart)}`);

    const duringSlot = new Date(new Date(slot.startTime).getTime() + 60 * 1000);
    console.log(`Simulated State (1min after start): ${resolveSlotState(slot, duringSlot)}`);

    const afterEnd = new Date(new Date(slot.endTime).getTime() + 60 * 1000);
    console.log(`Simulated State (1min after end): ${resolveSlotState(slot, afterEnd)}`);
  }

  process.exit(0);
}

testSlotAccess().catch(console.error);
