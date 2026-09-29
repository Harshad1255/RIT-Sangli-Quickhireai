const { resolveSlotState, validateAndSortSlots } = require('./slotUtils');

describe('slotUtils', () => {
  describe('resolveSlotState', () => {
    it('returns cancelled if cancelled is true', () => {
      const slot = { startTime: '2025-01-01', endTime: '2025-01-02', status: 'cancelled' };
      expect(resolveSlotState(slot)).toBe('cancelled');
    });

    it('returns scheduled if now is before startTime', () => {
      const slot = { startTime: '2025-01-02', endTime: '2025-01-03' };
      const now = new Date('2025-01-01');
      expect(resolveSlotState(slot, now)).toBe('scheduled');
    });

    it('returns active if now is exactly startTime', () => {
      const slot = { startTime: '2025-01-02T10:00:00Z', endTime: '2025-01-03T10:00:00Z' };
      const now = new Date('2025-01-02T10:00:00Z');
      expect(resolveSlotState(slot, now)).toBe('active');
    });

    it('returns active if now is between start and end', () => {
      const slot = { startTime: '2025-01-01', endTime: '2025-01-03' };
      const now = new Date('2025-01-02');
      expect(resolveSlotState(slot, now)).toBe('active');
    });

    it('returns closed if now is exactly endTime', () => {
      const slot = { startTime: '2025-01-01T10:00:00Z', endTime: '2025-01-02T10:00:00Z' };
      const now = new Date('2025-01-02T10:00:00Z');
      expect(resolveSlotState(slot, now)).toBe('closed');
    });

    it('returns closed if now is after endTime', () => {
      const slot = { startTime: '2025-01-01', endTime: '2025-01-02' };
      const now = new Date('2025-01-03');
      expect(resolveSlotState(slot, now)).toBe('closed');
    });
  });

  describe('validateAndSortSlots', () => {
    it('returns error if missing times', () => {
      const slots = [{ label: '1' }];
      expect(validateAndSortSlots(slots).isValid).toBe(false);
    });

    it('returns error if end <= start', () => {
      const slots = [{ startTime: '2025-01-02', endTime: '2025-01-01' }];
      expect(validateAndSortSlots(slots).isValid).toBe(false);
    });

    it('returns error if slots overlap', () => {
      const slots = [
        { startTime: '2025-01-01T10:00', endTime: '2025-01-01T12:00' },
        { startTime: '2025-01-01T11:00', endTime: '2025-01-01T13:00' }
      ];
      expect(validateAndSortSlots(slots).isValid).toBe(false);
    });

    it('sorts non-overlapping slots and assigns order', () => {
      const slots = [
        { startTime: '2025-01-02T10:00', endTime: '2025-01-02T12:00' },
        { startTime: '2025-01-01T10:00', endTime: '2025-01-01T12:00' }
      ];
      const res = validateAndSortSlots(slots);
      expect(res.isValid).toBe(true);
      expect(res.sortedSlots[0].startTime).toBe('2025-01-01T10:00');
      expect(res.sortedSlots[0].order).toBe(1);
      expect(res.sortedSlots[1].startTime).toBe('2025-01-02T10:00');
      expect(res.sortedSlots[1].order).toBe(2);
    });
  });
});
