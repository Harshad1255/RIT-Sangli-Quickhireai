export const PROCTORING_CONFIG = {
  // Detection intervals
  DETECTION_INTERVAL_MS: 2000,
  ADAPTIVE_INTERVAL_SLOW_MS: 4000, // if CPU is struggling
  
  // Debounce (persistence) thresholds: event must be continuous for this duration before it counts
  DEBOUNCE: {
    NO_FACE: 3000,
    MULTIPLE_FACES: 2500,
    LOOKING_AWAY: 4000,
    CAMERA_COVERED: 3000,
    FACE_MISMATCH: 3000
  },
  
  // Cooldown thresholds: wait this long before counting the *same* violation again
  COOLDOWN: {
    NO_FACE: 10000,
    MULTIPLE_FACES: 10000,
    LOOKING_AWAY: 10000,
    CAMERA_COVERED: 10000,
    FACE_MISMATCH: 30000
  },
  
  // Visual thresholds
  THRESHOLDS: {
    YAW: 30, // degrees
    PITCH: 20, // degrees
    MIN_BRIGHTNESS: 30, // 0-255 scale
    MAX_BRIGHTNESS: 240, // 0-255 scale
    MIN_FACE_AREA_RATIO: 0.05, // face must take up at least 5% of frame
    FACE_MISMATCH_DISTANCE: 0.5, // embedding distance threshold (lower is stricter)
  },
  
  // Severities for different events
  SEVERITY: {
    NO_FACE: 'warning',
    MULTIPLE_FACES: 'critical',
    LOOKING_AWAY: 'warning',
    CAMERA_COVERED: 'critical',
    FACE_MISMATCH: 'critical',
    CAMERA_STOPPED: 'critical',
    TAB_SWITCH: 'critical',
    WINDOW_BLUR: 'warning'
  },
  
  PERIODIC_SNAPSHOT_INTERVAL_MS: 60000,
  PERIODIC_SNAPSHOT_JITTER_MS: 15000, // +/- 15s randomness
};
