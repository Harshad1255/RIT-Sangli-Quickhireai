const { resolveSlotState } = require('../../Backend/src/features/aptitude/utils/slotUtils');

describe('slot state regression checks', () => {
  test('marks a slot as scheduled before its start time', () => {
    const slot = {
      startTime: '2025-01-02T10:00:00Z',
      endTime: '2025-01-03T10:00:00Z'
    };

    expect(resolveSlotState(slot, new Date('2025-01-01T10:00:00Z'))).toBe('scheduled');
  });

  test('marks a slot as active during its active window', () => {
    const slot = {
      startTime: '2025-01-02T10:00:00Z',
      endTime: '2025-01-03T10:00:00Z'
    };

    expect(resolveSlotState(slot, new Date('2025-01-02T12:00:00Z'))).toBe('active');
  });
});
