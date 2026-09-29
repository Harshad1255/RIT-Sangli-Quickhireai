/**
 * Resolves the computed state of a slot based on the current time.
 * @param {Object} slot The slot object containing status, startTime, and endTime.
 * @param {Date} now The current time to evaluate against (defaults to new Date()).
 * @returns {String} One of: 'cancelled', 'scheduled', 'active', 'closed'
 */
function resolveSlotState(slot, now = new Date()) {
  if (slot.status === 'cancelled') return 'cancelled';

  const currentTime = now instanceof Date ? now : new Date(now);
  const startTime = new Date(slot.startTime);
  const endTime = new Date(slot.endTime);

  if (Number.isNaN(startTime.getTime()) || Number.isNaN(endTime.getTime())) {
    return 'closed';
  }

  if (currentTime < startTime) return 'scheduled';
  if (currentTime >= startTime && currentTime < endTime) return 'active';
  return 'closed';
}

/**
 * Validates and sorts an array of slots.
 * @param {Array} slots Array of slot objects.
 * @returns {Object} { isValid: boolean, error?: string, sortedSlots?: Array }
 */
function validateAndSortSlots(slots) {
  if (!Array.isArray(slots)) return { isValid: true, sortedSlots: [] };
  
  const sorted = [...slots].sort((a, b) => new Date(a.startTime) - new Date(b.startTime));
  
  for (let i = 0; i < sorted.length; i++) {
    const slot = sorted[i];
    slot.order = i + 1;
    
    if (!slot.startTime || !slot.endTime) {
      return { isValid: false, error: 'All slots must have a startTime and endTime.' };
    }
    
    const start = new Date(slot.startTime);
    const end = new Date(slot.endTime);
    
    if (end <= start) {
      return { isValid: false, error: 'Slot endTime must be strictly after startTime.' };
    }
    
    // Check overlap with the next slot
    if (i < sorted.length - 1) {
      const nextStart = new Date(sorted[i + 1].startTime);
      if (end > nextStart) {
        return { isValid: false, error: 'Slots cannot overlap in time.' };
      }
    }
  }
  
  return { isValid: true, sortedSlots: sorted };
}

module.exports = {
  resolveSlotState,
  validateAndSortSlots
};
