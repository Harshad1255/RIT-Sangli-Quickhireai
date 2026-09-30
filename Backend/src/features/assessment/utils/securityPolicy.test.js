const { isViolationEvent, normalizeEventType } = require('./securityPolicy');

describe('assessment security policy', () => {
  it('counts proctoring violations regardless of legacy event casing', () => {
    expect(isViolationEvent('fullscreen_exit')).toBe(true);
    expect(isViolationEvent('TAB_HIDDEN')).toBe(true);
    expect(isViolationEvent('NO_FACE')).toBe(true);
  });

  it('does not count focus recovery or periodic snapshots as violations', () => {
    expect(isViolationEvent('WINDOW_FOCUS')).toBe(false);
    expect(isViolationEvent('TAB_VISIBLE')).toBe(false);
    expect(isViolationEvent('WEBCAM_SNAPSHOT')).toBe(false);
    expect(isViolationEvent('OFFLINE_PERIOD')).toBe(false);
  });

  it('normalizes event type names for consistent persistence', () => {
    expect(normalizeEventType('  tab_switch ')).toBe('TAB_SWITCH');
  });
});