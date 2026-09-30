function normalizeDate(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function getSlotWindowInfo(slot, now = new Date()) {
  if (!slot) {
    return { state: 'closed', startTime: null, endTime: null, opensInSeconds: 0, closesInSeconds: 0 };
  }

  const currentTime = now instanceof Date ? now : new Date(now);
  const startTime = normalizeDate(slot.startTime);
  const endTime = normalizeDate(slot.endTime);

  if (slot.status === 'cancelled') {
    return { state: 'cancelled', startTime, endTime, opensInSeconds: 0, closesInSeconds: 0 };
  }

  if (!startTime || !endTime || Number.isNaN(startTime.getTime()) || Number.isNaN(endTime.getTime())) {
    return { state: 'closed', startTime, endTime, opensInSeconds: 0, closesInSeconds: 0 };
  }

  const opensInSeconds = Math.max(0, Math.ceil((startTime.getTime() - currentTime.getTime()) / 1000));
  const closesInSeconds = Math.max(0, Math.ceil((endTime.getTime() - currentTime.getTime()) / 1000));

  if (currentTime < startTime) {
    return { state: 'scheduled', startTime, endTime, opensInSeconds, closesInSeconds };
  }

  if (currentTime >= startTime && currentTime < endTime) {
    return { state: 'active', startTime, endTime, opensInSeconds: 0, closesInSeconds };
  }

  return { state: 'closed', startTime, endTime, opensInSeconds: 0, closesInSeconds: 0 };
}

/**
 * Resolves the computed state of a slot based on the current time.
 * @param {Object} slot The slot object containing status, startTime, and endTime.
 * @param {Date} now The current time to evaluate against (defaults to new Date()).
 * @returns {String} One of: 'cancelled', 'scheduled', 'active', 'closed'
 */
function resolveSlotState(slot, now = new Date()) {
  return getSlotWindowInfo(slot, now).state;
}

function computeAttemptDeadline(startedAt, durationSeconds, slotEndTime) {
  const start = normalizeDate(startedAt);
  const slotEnd = normalizeDate(slotEndTime);
  const durationMs = Number(durationSeconds || 0) * 1000;

  if (!start) {
    return slotEnd ? new Date(slotEnd.getTime()) : new Date();
  }

  const candidateDeadline = new Date(start.getTime() + durationMs);

  if (slotEnd) {
    return new Date(Math.min(candidateDeadline.getTime(), slotEnd.getTime()));
  }

  return candidateDeadline;
}

function getRemainingSeconds(deadline, serverNow = new Date()) {
  const safeDeadline = normalizeDate(deadline);
  const safeNow = normalizeDate(serverNow);
  if (!safeDeadline || !safeNow) return 0;
  return Math.max(0, Math.ceil((safeDeadline.getTime() - safeNow.getTime()) / 1000));
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

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      return { isValid: false, error: 'Slot times must be valid ISO dates.' };
    }

    if (end <= start) {
      return { isValid: false, error: 'Slot endTime must be strictly after startTime.' };
    }

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
  normalizeDate,
  getSlotWindowInfo,
  resolveSlotState,
  computeAttemptDeadline,
  getRemainingSeconds,
  validateAndSortSlots
};
