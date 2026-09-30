const violationTypes = new Set([
  'FULLSCREEN_EXIT',
  'TAB_HIDDEN',
  'WINDOW_BLUR',
  'PAGE_HIDE',
  'COPY_ATTEMPT',
  'PASTE_ATTEMPT',
  'CUT_ATTEMPT',
  'CONTEXT_MENU',
  'SHORTCUT_BLOCKED',
  'PRINTSCREEN',
  'PRINT_ATTEMPT',
  'DRAG_DROP',
  'TEXT_SELECTION',
  'NO_FACE',
  'MULTIPLE_FACES',
  'LOOKING_AWAY',
  'CAMERA_STOPPED',
  'MULTIPLE_SESSION',
  'SESSION_MISMATCH',
  'CAMERA_COVERED',
  'EYES_CLOSED',
  'FACE_MISMATCH',
  'VIRTUAL_CAMERA'
]);

const counterFields = {
  FULLSCREEN_EXIT: 'fullscreenExitCount',
  TAB_HIDDEN: 'tabSwitchCount',
  WINDOW_BLUR: 'windowBlurCount',
  COPY_ATTEMPT: 'copyAttemptCount',
  PASTE_ATTEMPT: 'pasteAttemptCount',
  CUT_ATTEMPT: 'cutAttemptCount'
};

const normalizeEventType = (type) => String(type || '').trim().toUpperCase();

const isViolationEvent = (type) => violationTypes.has(normalizeEventType(type));

module.exports = { normalizeEventType, isViolationEvent, counterFields };