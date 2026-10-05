import React, { useEffect, useRef, useState } from 'react';
import { FaceMesh } from '@mediapipe/face_mesh';
import { api } from '../../services/api';
import PreTestProctorCheck from './PreTestProctorCheck';
import { PROCTORING_CONFIG } from '../../config/proctoringConfig';
import { generateHmacSignature } from '../../utils/cryptoUtil';
import { queueSnapshot, syncSnapshots } from '../../utils/offlineQueue';
import './ExamSecurityWrapper.css';

const getFullscreenElement = () =>
  document.fullscreenElement ||
  document.webkitFullscreenElement ||
  document.mozFullScreenElement ||
  document.msFullscreenElement;

const normalizeEventType = (type) => {
  const map = {
    fullscreen_exit: 'FULLSCREEN_EXIT',
    tab_switch: 'TAB_HIDDEN',
    window_blur: 'WINDOW_BLUR',
    copy: 'COPY_ATTEMPT',
    paste: 'PASTE_ATTEMPT',
    cut: 'CUT_ATTEMPT',
    context_menu: 'CONTEXT_MENU',
    fullscreen_error: 'FULLSCREEN_ERROR',
    window_focus: 'WINDOW_FOCUS',
    tab_visible: 'TAB_VISIBLE',
    fullscreen_reentered: 'FULLSCREEN_REENTERED'
  };
  return map[type] || String(type || 'WINDOW_BLUR').toUpperCase();
};

const ExamSecurityWrapper = ({
  active,
  title = 'Assessment',
  subtitle = 'Please complete this assessment in fullscreen mode.',
  children,
  onViolation,
  onStart,
  startButtonLabel = 'Start Assessment',
  requireFullscreen = true,
  assessmentType = 'aptitude',
  assessmentId,
  attemptId,
  sessionId,
  hmacSecret,
  initialViolationCount = 0,
  initialMaxViolationCount = 3,
  disabled = false,
}) => {
  const [pipStatus, setPipStatus] = useState('#fff');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPreChecking, setIsPreChecking] = useState(false);
  const [warningMessage, setWarningMessage] = useState('');
  const [showWarning, setShowWarning] = useState(false);
  const [isUnsupported, setIsUnsupported] = useState(false);
  const [fullscreenBlocked, setFullscreenBlocked] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [violationCount, setViolationCount] = useState(initialViolationCount);
  const [maxViolationCount, setMaxViolationCount] = useState(initialMaxViolationCount);
  const seenEventsRef = useRef(new Map());
  const sessionIdRef = useRef(sessionId || (() => {
    const storageKey = `aptitude-proctor-session-${assessmentId || 'unknown'}`;
    let storedSessionId = window.sessionStorage.getItem(storageKey);
    if (!storedSessionId) {
      storedSessionId = `session-${globalThis.crypto?.randomUUID?.() || Math.random().toString(16).slice(2)}`;
      window.sessionStorage.setItem(storageKey, storedSessionId);
    }
    return storedSessionId;
  })());
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const faceMeshRef = useRef(null);
  const switchDebounceRef = useRef(0);
  const detectorStateRef = useRef(null);
  const lookingAwaySinceRef = useRef(null);
  const lookingAwayReportedRef = useRef(false);
  const onViolationRef = useRef(onViolation);
  const activeRef = useRef(active);
  activeRef.current = active;

  useEffect(() => {
    onViolationRef.current = onViolation;
  }, [onViolation]);

  useEffect(() => {
    setViolationCount(initialViolationCount);
    setMaxViolationCount(initialMaxViolationCount);
  }, [initialViolationCount, initialMaxViolationCount]);

  const captureSnapshot = async () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth || !video.videoHeight) return null;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d')?.drawImage(video, 0, 0, canvas.width, canvas.height);
    return new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.72));
  };

  const logSecurityEvent = async (type, message) => {
    if (!active) return;

    const normalizedType = normalizeEventType(type);
    const eventKey = `${normalizedType}:${message}`;
    const lastSeen = seenEventsRef.current.get(eventKey);
    const now = Date.now();
    const eventNonce = globalThis.crypto?.randomUUID?.() || Math.random().toString(16).slice(2);
    if (lastSeen && now - lastSeen < 2000) {
      return;
    }
    seenEventsRef.current.set(eventKey, now);

    const event = {
      type: normalizedType,
      message,
      timestamp: new Date().toISOString(),
      severity: normalizedType === 'FULLSCREEN_EXIT' || normalizedType === 'TAB_HIDDEN' ? 'critical' : 'warning',
      metadata: {
        assessmentType,
        assessmentId,
        attemptId,
        sessionId: sessionIdRef.current,
        requireFullscreen,
        active
      },
      eventId: `${assessmentType}-${attemptId || assessmentId || 'unknown'}-${normalizedType}-${now}-${eventNonce}`,
      eventSequence: now
    };

    const countsAsViolation = !['WINDOW_FOCUS', 'TAB_VISIBLE', 'FULLSCREEN_REENTERED', 'WEBCAM_SNAPSHOT'].includes(normalizedType);
    if (countsAsViolation) {
      setWarningMessage(message);
      setShowWarning(true);
    }

    if (!assessmentType || !message || !attemptId) {
      onViolationRef.current?.(event);
      return;
    }

    try {
      const snapshot = await captureSnapshot();
      let response;
      const headers = {};
      if (hmacSecret) {
        const payloadString = `${attemptId}:${normalizedType}:${event.eventId || ''}`;
        const signature = await generateHmacSignature(payloadString, hmacSecret);
        if (signature) headers['x-proctor-signature'] = signature;
      }
      
      if (snapshot) {
        const formData = new FormData();
        formData.append('snapshot', snapshot, 'proctoring.jpg');
        formData.append('assessmentType', assessmentType);
        formData.append('assessmentId', assessmentId || '');
        formData.append('attemptId', attemptId);
        formData.append('sessionId', sessionIdRef.current);
        formData.append('eventType', normalizedType);
        formData.append('message', message);
        formData.append('severity', event.severity);
        formData.append('eventId', event.eventId);
        formData.append('timestamp', event.timestamp);
        formData.append('metadata', JSON.stringify(event.metadata));
        headers['Content-Type'] = 'multipart/form-data';
        
        try {
          response = await api.post('/assessment/snapshot', formData, { headers });
        } catch (netErr) {
          if (!netErr.response || netErr.response.status >= 500) {
            await queueSnapshot(formData, headers);
          }
          throw netErr;
        }
      } else {
        response = await api.post('/assessment/log', {
          assessmentType,
          assessmentId,
          attemptId,
          sessionId: sessionIdRef.current,
          eventType: normalizedType,
          message,
          metadata: event.metadata,
          severity: event.severity,
          eventId: event.eventId,
          timestamp: event.timestamp,
          eventSequence: event.eventSequence
        }, { headers });
      }
      const serverCount = Number(response.data?.violationCount);
      const serverMax = Number(response.data?.maxViolationCount);
      if (Number.isFinite(serverCount)) setViolationCount(serverCount);
      if (Number.isFinite(serverMax) && serverMax > 0) setMaxViolationCount(serverMax);
      if (countsAsViolation) {
        setWarningMessage(`Violation ${Number.isFinite(serverCount) ? serverCount : violationCount + 1} of ${Number.isFinite(serverMax) ? serverMax : maxViolationCount}: ${message}`);
        setShowWarning(true);
      }
      onViolationRef.current?.(event, response.data);
      if (response.data?.autoSubmitted) {
        setWarningMessage('The maximum violation limit was reached. Your assessment has been submitted.');
        setShowWarning(true);
      }
    } catch (error) {
      console.warn('Failed to persist exam violation event:', error.message || error);
      onViolationRef.current?.(event);
    }
  };

  const logViolation = logSecurityEvent;
  const logSecurityEventRef = useRef(logSecurityEvent);
  logSecurityEventRef.current = logSecurityEvent;

  const uploadPeriodicSnapshot = async () => {
    const snapshot = await captureSnapshot();
    if (!snapshot || !attemptId) return;
    
    // Sync any queued offline snapshots first before taking the new one
    syncSnapshots().catch(() => {});

    const formData = new FormData();
    formData.append('snapshot', snapshot, 'proctoring.jpg');
    formData.append('assessmentType', assessmentType);
    formData.append('assessmentId', assessmentId || '');
    formData.append('attemptId', attemptId);
    formData.append('sessionId', sessionIdRef.current);
    formData.append('eventType', 'WEBCAM_SNAPSHOT');
    formData.append('message', 'Periodic webcam snapshot.');
    formData.append('timestamp', new Date().toISOString());
    
    const headers = { 'Content-Type': 'multipart/form-data' };
    if (hmacSecret) {
      const payloadString = `${attemptId}:WEBCAM_SNAPSHOT:`;
      const signature = await generateHmacSignature(payloadString, hmacSecret);
      if (signature) headers['x-proctor-signature'] = signature;
    }
    
    try {
      await api.post('/assessment/snapshot', formData, { headers });
    } catch (error) {
      console.warn('Failed to upload periodic webcam snapshot:', error.message || error);
      if (!error.response || error.response.status >= 500) {
        await queueSnapshot(formData, headers);
      }
    }
  };

  useEffect(() => {
    const isFullScreenSupported = !!(
      document.fullscreenEnabled ||
      document.webkitFullscreenEnabled ||
      document.mozFullScreenEnabled ||
      document.msFullscreenEnabled
    );

    setIsUnsupported(!isFullScreenSupported);

    const handleFullscreenChange = () => {
      const full = !!getFullscreenElement();
      setIsFullscreen(full);
      setFullscreenBlocked(false);

      if (requireFullscreen && active && !full) {
        logViolation('fullscreen_exit', 'You have exited full-screen mode. Please return to the assessment.');
      } else if (full) {
        setFullscreenBlocked(false);
      }
    };

    const handleVisibilityChange = () => {
      if (active && document.hidden) {
        logViolation('tab_switch', 'The assessment is no longer active. Please return to it.');
      }
    };

    const handleWindowBlur = () => {
      if (active) {
        const now = Date.now();
        if (now - switchDebounceRef.current > 2000) {
          switchDebounceRef.current = now;
          logViolation('window_blur', 'The assessment lost focus. Please return to the exam window.');
        }
      }
    };

    const handleWindowFocus = () => {
      if (active) logSecurityEvent('window_focus', 'The assessment window regained focus.');
    };

    const handlePageHide = () => {
      const now = Date.now();
      if (active && now - switchDebounceRef.current > 2000) {
        switchDebounceRef.current = now;
        logViolation('page_hide', 'The assessment page was closed or hidden.');
      }
    };

    const handleBeforeUnload = (event) => {
      if (!active) return;
      event.preventDefault();
      event.returnValue = 'Your assessment is still in progress. Leaving now may count as a policy violation.';
      return event.returnValue;
    };

    const historyTrap = () => {
      if (!active) return;
      window.history.pushState(null, '', window.location.href);
    };

    const handleKeydown = (event) => {
      if (!active) return;

      const key = event.key ? event.key.toLowerCase() : '';
      const ctrl = event.ctrlKey || event.metaKey;
      const isDeveloperShortcut =
        (ctrl && event.shiftKey && ['i', 'j', 'c'].includes(key)) ||
        (ctrl && ['u', 's', 'p', 'c', 'v', 'x'].includes(key)) ||
        (ctrl && ['r'].includes(key)) ||
        (event.key === 'F12') ||
        (event.key === 'PrintScreen') ||
        (event.key === 'F5');

      if (isDeveloperShortcut || (event.altKey && key === 'tab')) {
        event.preventDefault();
        logViolation('shortcut_blocked', `Blocked shortcut: ${event.key}`);
        return;
      }

      if (key === 'printscreen') {
        event.preventDefault();
        logViolation('printscreen', 'Screen capture is disabled during the assessment.');
      }
    };

    const handleBlockedClipboard = (event, type) => {
      if (!active) return;
      event.preventDefault();
      logViolation(type, 'Clipboard activity is disabled while the assessment is active.');
    };

    const handleCopy = (event) => handleBlockedClipboard(event, 'copy');
    const handlePaste = (event) => handleBlockedClipboard(event, 'paste');
    const handleCut = (event) => handleBlockedClipboard(event, 'cut');
    const handleDragStart = (event) => {
      if (active) {
        event.preventDefault();
        logViolation('drag_drop', 'Dragging and dropping content is disabled.');
      }
    };
    const handleContextMenu = (event) => {
      if (active) {
        event.preventDefault();
        logViolation('context_menu', 'Right-click is disabled for this assessment.');
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    document.addEventListener('keydown', handleKeydown);
    document.addEventListener('copy', handleCopy);
    document.addEventListener('paste', handlePaste);
    document.addEventListener('cut', handleCut);
    document.addEventListener('dragstart', handleDragStart);
    document.addEventListener('contextmenu', handleContextMenu);
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('blur', handleWindowBlur);
    window.addEventListener('focus', handleWindowFocus);
    window.addEventListener('pagehide', handlePageHide);
    window.history.pushState(null, '', window.location.href);
    window.addEventListener('popstate', historyTrap);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.removeEventListener('keydown', handleKeydown);
      document.removeEventListener('copy', handleCopy);
      document.removeEventListener('paste', handlePaste);
      document.removeEventListener('cut', handleCut);
      document.removeEventListener('dragstart', handleDragStart);
      document.removeEventListener('contextmenu', handleContextMenu);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('blur', handleWindowBlur);
      window.removeEventListener('focus', handleWindowFocus);
      window.removeEventListener('pagehide', handlePageHide);
      window.removeEventListener('popstate', historyTrap);
    };
  }, [active, requireFullscreen, attemptId, assessmentId, assessmentType, sessionId]);

  const requestFullscreen = async () => {
    try {
      if (document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
      } else if (document.documentElement.webkitRequestFullscreen) {
        await document.documentElement.webkitRequestFullscreen();
      } else if (document.documentElement.mozRequestFullScreen) {
        await document.documentElement.mozRequestFullScreen();
      } else if (document.documentElement.msRequestFullscreen) {
        await document.documentElement.msRequestFullscreen();
      }
      return !!getFullscreenElement();
    } catch (error) {
      return false;
    }
  };

  const handleStart = async () => {
    setCameraError('');
    if (requireFullscreen && (isUnsupported || !(await requestFullscreen()))) {
      setCameraError('Fullscreen mode is required. Allow fullscreen and try again.');
      return;
    }
    
    setIsPreChecking(true);
  };

  useEffect(() => {
    if (!active && !isPreChecking) return;

    let cancelled = false;
    const startCamera = async () => {
      if (streamRef.current) return; // already started
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false });
        if (cancelled) {
          stream.getTracks().forEach(t => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }

        const faceMesh = new FaceMesh({
          locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`
        });
        faceMesh.setOptions({ maxNumFaces: 3, refineLandmarks: true, minDetectionConfidence: 0.5, minTrackingConfidence: 0.5 });
        faceMeshRef.current = faceMesh;

        // State tracking for debounce and cooldown
        const stateTracking = {
          activeViolation: null,
          violationStartTime: null,
          lastReportedTime: {
            NO_FACE: 0,
            MULTIPLE_FACES: 0,
            LOOKING_AWAY: 0
          }
        };

        faceMesh.onResults((results) => {
          if (!activeRef.current && !isPreChecking) return;
          
          const now = Date.now();
          const faces = results.multiFaceLandmarks || [];
          let currentState = 'ONE_FACE';
          
          if (faces.length === 0) currentState = 'NO_FACE';
          else if (faces.length > 1) currentState = 'MULTIPLE_FACES';
          else {
            const landmarks = faces[0];
            const eyeWidth = Math.abs(landmarks[263].x - landmarks[33].x);
            const noseOffset = Math.abs(landmarks[1].x - ((landmarks[33].x + landmarks[263].x) / 2));
            if (eyeWidth > 0 && noseOffset / eyeWidth > 0.18) {
              currentState = 'LOOKING_AWAY';
            }
          }

          // Pre-checking uses current state for UI (face count check)
          if (isPreChecking && !activeRef.current) {
            detectorStateRef.current = currentState;
            return;
          }

          // State changed
          if (currentState !== stateTracking.activeViolation) {
            stateTracking.activeViolation = currentState;
            stateTracking.violationStartTime = now;
          }
          
          if (activeRef.current) {
            const statusColor = currentState === 'ONE_FACE' ? '#10b981' : currentState === 'NO_FACE' ? '#ef4444' : '#f59e0b';
            setPipStatus(statusColor);
          }

          // Apply debounce & cooldown
          if (currentState !== 'ONE_FACE' && stateTracking.violationStartTime) {
            const debounceMs = PROCTORING_CONFIG.DEBOUNCE[currentState] || 3000;
            const cooldownMs = PROCTORING_CONFIG.COOLDOWN[currentState] || 10000;
            const timeInState = now - stateTracking.violationStartTime;
            const timeSinceLastReport = now - (stateTracking.lastReportedTime[currentState] || 0);

            if (timeInState >= debounceMs && timeSinceLastReport >= cooldownMs) {
              stateTracking.lastReportedTime[currentState] = now;
              
              const messages = {
                'NO_FACE': 'No face was detected in the camera view.',
                'MULTIPLE_FACES': 'More than one face was detected in the camera view.',
                'LOOKING_AWAY': 'Your face has been turned away from the screen.'
              };
              
              logSecurityEventRef.current(currentState, messages[currentState]);
            }
          }
        });
        
        if (videoRef.current && videoRef.current.readyState >= 2) {
            await faceMesh.send({ image: videoRef.current });
        }
      } catch (error) {
        setCameraError(error.name === 'NotAllowedError'
          ? 'Camera access is required. Allow camera permission and try again.'
          : `Camera proctoring could not start: ${error.message}`);
        setIsPreChecking(false);
      }
    };
    
    startCamera();

    return () => {
      cancelled = true;
    };
  }, [active, isPreChecking]);

  useEffect(() => {
    if (!active || !streamRef.current) return undefined;
    const videoTrack = streamRef.current.getVideoTracks()[0];
    const handleTrackEnded = () => logViolation('CAMERA_STOPPED', 'The camera stream ended during the assessment.');
    videoTrack?.addEventListener('ended', handleTrackEnded);
    const detectionInterval = setInterval(() => {
      if (videoRef.current?.readyState >= 2 && faceMeshRef.current) {
        faceMeshRef.current.send({ image: videoRef.current }).catch(() => {
          logViolation('CAMERA_STOPPED', 'Camera face detection stopped unexpectedly.');
        });
      }
    }, 2500);
    const snapshotInterval = setInterval(uploadPeriodicSnapshot, 60000);
    return () => {
      clearInterval(detectionInterval);
      clearInterval(snapshotInterval);
      videoTrack?.removeEventListener('ended', handleTrackEnded);
    };
  }, [active, attemptId]);

  useEffect(() => () => {
    faceMeshRef.current?.close();
    streamRef.current?.getTracks().forEach(track => track.stop());
  }, []);

  useEffect(() => {
    if (!active) return undefined;
    let offlineSince = null;
    const handleOffline = () => { offlineSince = new Date().toISOString(); };
    const handleOnline = () => {
      if (!offlineSince) return;
      const startedAt = offlineSince;
      offlineSince = null;
      logViolation('OFFLINE_PERIOD', `Internet connection was unavailable from ${startedAt} until ${new Date().toISOString()}.`);
      syncSnapshots().catch(() => {});
    };
    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);
    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, [active, attemptId]);

  const handlePreCheckComplete = async ({ referencePhoto, consentAccepted }) => {
    try {
      // Store reference photo to send after attempt is created.
      // We will pass these back via a callback or we can hit a new initialization endpoint.
      // But we don't have attemptId yet.
      // Wait, onStart starts the test and creates attemptId. We can pass the photo up to the parent!
      // But the parent is AptitudeTestAttempt, which calls /start.
      // Let's just store it in sessionStorage or a global state, or pass it to onStart.
      // onStart(sessionIdRef.current, { referencePhoto, consentAccepted });
      if (onStart) {
         onStart(sessionIdRef.current, { referencePhoto, consentAccepted });
      }
    } catch (err) {
      setCameraError('Failed to initialize proctoring.');
    }
  };

  let content = null;
  if (!active) {
    if (isPreChecking) {
      content = (
        <PreTestProctorCheck 
          videoRef={videoRef}
          detectorStateRef={detectorStateRef}
          onComplete={handlePreCheckComplete}
        />
      );
    } else {
      content = (
        <div className="exam-security-gate">
          <div className="exam-security-card">
            <div className="exam-security-icon">▣</div>
            <h2>{title}</h2>
            <p>{subtitle}</p>

            {cameraError && <div className="exam-security-message error">{cameraError}</div>}

            {isUnsupported ? (
              <div className="exam-security-message error">
                Fullscreen mode is not supported in this browser. Please use the latest Chrome or Edge browser for a secure assessment experience.
              </div>
            ) : (
              <div className="exam-security-message">
                This exam is protected. Please enter full-screen mode before starting.
              </div>
            )}

            <button className="exam-security-button" onClick={handleStart} disabled={disabled} style={disabled ? { opacity: 0.6, cursor: 'not-allowed' } : {}}>
              {startButtonLabel}
            </button>
            {disabled && onExit && (
              <button 
                className="exam-security-button" 
                onClick={onExit} 
                style={{ marginTop: '10px', background: '#64748b' }}
              >
                Go Back
              </button>
            )}
          </div>
        </div>
      );
    }
  } else {
    content = (
      <div className="exam-security-shell">
        {showWarning && (
          <div className="exam-security-warning">
            <div className="exam-security-warning-box">
              <strong>Proctoring Alert</strong>
              <p>{warningMessage}</p>
              {violationCount > 0 && <p>Violation {violationCount} of {maxViolationCount}</p>}
              <button onClick={() => setShowWarning(false)}>Dismiss</button>
            </div>
          </div>
        )}

        <div className="exam-fullscreen-indicator">
          <span className={isFullscreen ? 'online' : 'offline'} />
          {isFullscreen ? 'Full-screen active' : 'Full-screen required'}
        </div>

        {fullscreenBlocked ? (
          <div role="alertdialog" aria-modal="true" className="exam-security-warning" style={{ position: 'fixed', inset: 0, zIndex: 1002, display: 'grid', placeItems: 'center', background: 'rgba(15, 23, 42, 0.92)' }}>
            <div className="exam-security-warning-box">
              <strong>Fullscreen required</strong>
              <p>Questions are blocked until you return to fullscreen mode.</p>
              <button onClick={async () => {
                const restored = await requestFullscreen();
                setIsFullscreen(restored);
                setFullscreenBlocked(!restored);
              }}>Re-enter fullscreen</button>
            </div>
          </div>
        ) : children}
      </div>
    );
  }

  // Use it on the video tag at the end
  return (
    <>
      <video ref={videoRef} muted playsInline style={{ position: 'fixed', right: 16, bottom: 16, width: 144, height: 108, zIndex: 1001, objectFit: 'cover', border: `3px solid ${pipStatus}`, borderRadius: 4, background: '#111', display: active ? 'block' : 'none', transform: 'scaleX(-1)' }} />
      {content}
    </>
  );
};

export default ExamSecurityWrapper;
