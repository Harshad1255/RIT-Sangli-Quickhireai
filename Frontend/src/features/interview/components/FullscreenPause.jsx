import React, { useState, useEffect, useRef } from 'react';
import '../styles/FullscreenPause.css';

const FullscreenPause = ({ onFullscreenResumed, currentQuestion, questionIndex, totalQuestions }) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showInstructions, setShowInstructions] = useState(true);
  const [pauseTime, setPauseTime] = useState(0);
  // --- State initialization ---
  const getStoredCount = (key) => {
    const stored = sessionStorage.getItem(key);
    return stored !== null ? parseInt(stored) : 0;
  };
  const [suspiciousActivityCount, setSuspiciousActivityCount] = useState(() => getStoredCount('pauseSuspiciousActivityCount'));
  const [appSwitchCount, setAppSwitchCount] = useState(() => getStoredCount('pauseAppSwitchCount'));

  // Add suspicious activity logs state and helper
  const getStoredLogs = () => {
    try {
      const raw = sessionStorage.getItem('suspiciousActivityLogs');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  };
  const [suspiciousActivityLogs, setSuspiciousActivityLogs] = useState(getStoredLogs());
  const addSuspiciousLog = (message) => {
    const log = { time: new Date().toLocaleString(), message };
    setSuspiciousActivityLogs(prev => {
      const updated = [...prev, log];
      sessionStorage.setItem('suspiciousActivityLogs', JSON.stringify(updated));
      return updated;
    });
  };

  const recentlyIncrementedRef = useRef(false);
  const incrementCountsOnce = (logMessage) => {
    if (!recentlyIncrementedRef.current) {
      setSuspiciousActivityCount(prev => {
        const newValue = prev + 1;
        sessionStorage.setItem('pauseSuspiciousActivityCount', newValue.toString());
        return newValue;
      });
      setAppSwitchCount(prev => {
        const newValue = prev + 1;
        sessionStorage.setItem('pauseAppSwitchCount', newValue.toString());
        return newValue;
      });
      if (logMessage) addSuspiciousLog(logMessage);
      recentlyIncrementedRef.current = true;
      setTimeout(() => { recentlyIncrementedRef.current = false; }, 500);
    }
  };

  // Track pause time
  useEffect(() => {
    const interval = setInterval(() => {
      setPauseTime(prev => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Reset pause time when fullscreen is resumed
  useEffect(() => {
    if (isFullscreen) {
      setPauseTime(0);
      // Don't reset the counters when fullscreen is resumed
      // Keep the accumulated values - this prevents reset on minimize/restore
    }
  }, [isFullscreen]);

  // Always sync suspicious/app switch counts to sessionStorage
  useEffect(() => {
      sessionStorage.setItem('pauseSuspiciousActivityCount', suspiciousActivityCount.toString());
  }, [suspiciousActivityCount]);
  useEffect(() => {
      sessionStorage.setItem('pauseAppSwitchCount', appSwitchCount.toString());
  }, [appSwitchCount]);

  // On mount and on resume, always re-sync counts from sessionStorage
  useEffect(() => {
    setSuspiciousActivityCount(getStoredCount('pauseSuspiciousActivityCount'));
    setAppSwitchCount(getStoredCount('pauseAppSwitchCount'));
  }, []);

  // Enhanced application switching detection without intrusive monitoring
  useEffect(() => {
    
    let lastActiveTime = Date.now();
    let isCurrentlyActive = true;
    let mouseMovementCount = 0;
    let keyboardActivityCount = 0;
    let suspiciousActivityDetected = false;
    let lastActivityCheck = Date.now();
    let consecutiveSuspiciousChecks = 0;

    // Track all types of user activity
    const updateActivity = () => {
      lastActiveTime = Date.now();
      lastActivityCheck = Date.now();
    };

    const handleVisibilityChange = () => {
      if (document.hidden && !isFullscreen) {
        console.log('🚨 SUSPICIOUS: User switched tabs or applications while interview is paused');
        isCurrentlyActive = false;
        suspiciousActivityDetected = true;
        consecutiveSuspiciousChecks++;
        incrementCountsOnce('Tab switch detected via visibilitychange (document.hidden) [pause screen]');
      } else if (!document.hidden) {
        isCurrentlyActive = true;
        updateActivity();
      }
    };

    const handleFocusChange = () => {
      if (!document.hasFocus() && !isFullscreen) {
        console.log('🚨 SUSPICIOUS: User switched to another application while interview is paused');
        isCurrentlyActive = false;
        suspiciousActivityDetected = true;
        consecutiveSuspiciousChecks++;
        incrementCountsOnce('App switch detected via focus change (window lost focus) [pause screen]');
      } else if (document.hasFocus()) {
        isCurrentlyActive = true;
        updateActivity();
      }
    };

    const handleBlur = (e) => {
      if (document.activeElement && document.activeElement.tagName === 'IFRAME') return;
      
      setTimeout(() => {
        if (!isFullscreen && !document.hasFocus() && !recentlyIncrementedRef.current) {
          console.log('🚨 SUSPICIOUS: Window lost focus - user may have switched applications');
          isCurrentlyActive = false;
          suspiciousActivityDetected = true;
          consecutiveSuspiciousChecks++;
          incrementCountsOnce('App switch detected via blur event [pause screen]');
        }
      }, 1500);
    };

    const handleFocus = () => {
      isCurrentlyActive = true;
      updateActivity();
    };

    // Enhanced mouse tracking with pixel-level detection
    const handleMouseMove = (event) => {
      const currentPosition = { x: event.clientX, y: event.clientY };
      
      // Check if mouse movement is within the browser window bounds
      const isWithinBounds = currentPosition.x >= 0 && 
                           currentPosition.x <= window.innerWidth &&
                           currentPosition.y >= 0 && 
                           currentPosition.y <= window.innerHeight;

      if (isCurrentlyActive && isWithinBounds) {
        updateActivity();
        mouseMovementCount++;
      }
    };

    // Ultra-aggressive keyboard monitoring
    const handleKeyPress = (event) => {
      if (isCurrentlyActive) {
        updateActivity();
        keyboardActivityCount++;
        
        // Detect suspicious keyboard patterns (like typing in WhatsApp)
        if (keyboardActivityCount > 30 && Date.now() - lastActiveTime < 3000) {
          console.log('🚨 SUSPICIOUS: High keyboard activity detected - possible messaging app');
          suspiciousActivityDetected = true;
          consecutiveSuspiciousChecks++;
          incrementCountsOnce();
        }
        
        // Detect rapid typing patterns
        if (keyboardActivityCount > 100) {
          console.log('🚨 SUSPICIOUS: Excessive keyboard activity - possible external app');
          suspiciousActivityDetected = true;
          consecutiveSuspiciousChecks++;
          incrementCountsOnce();
        }
      }
    };

    // Detect rapid window state changes
    let windowStateChanges = 0;
    const handleWindowStateChange = () => {
      if (!isFullscreen) {
        windowStateChanges++;
        if (windowStateChanges > 2) {
          console.log('🚨 SUSPICIOUS: Multiple window state changes detected');
          suspiciousActivityDetected = true;
          consecutiveSuspiciousChecks++;
          incrementCountsOnce('Window state change detected (possible app switch) [pause screen]');
        }
      }
    };

    // Overlay detection - less aggressive
    const checkForOverlayApplications = () => {
      const timeSinceLastActivity = Date.now() - lastActiveTime;
      
      // Only detect if multiple indicators are present for a longer period
      const indicators = [];
      
      if (timeSinceLastActivity > 4000) indicators.push('inactivity');
      if (mouseMovementCount < 1 && timeSinceLastActivity > 3000) indicators.push('no_mouse_activity');
      if (keyboardActivityCount < 1 && timeSinceLastActivity > 3000) indicators.push('no_keyboard_activity');
      if (document.hasFocus() && !document.hidden && timeSinceLastActivity > 5000) indicators.push('focused_but_inactive');
      
      if (indicators.length >= 3 && !document.hasFocus()) {
        console.log('🚨 SUSPICIOUS: Multiple indicators suggest overlay application:', indicators);
        suspiciousActivityDetected = true;
        consecutiveSuspiciousChecks++;
        incrementCountsOnce();
      }
      
      // Reset counters if user is active
      if (timeSinceLastActivity < 2000) {
        consecutiveSuspiciousChecks = 0;
        windowStateChanges = 0;
      }
    };

    // Activity checking - less aggressive to prevent false positives
    const checkActivity = setInterval(() => {
      const timeSinceLastActivity = Date.now() - lastActiveTime;
      
      // Only detect if user is actually inactive for a longer period
      if (timeSinceLastActivity > 5000 && !isFullscreen && !document.hasFocus()) {
        console.log('🚨 SUSPICIOUS: User appears inactive - possible overlay application');
        suspiciousActivityDetected = true;
        consecutiveSuspiciousChecks++;
        incrementCountsOnce();
      }
      
      // Check for overlay applications less frequently
      checkForOverlayApplications();
      
      // Reset activity counters periodically
      if (timeSinceLastActivity > 8000) {
        mouseMovementCount = 0;
        keyboardActivityCount = 0;
      }
      
      // Log suspicious activity levels
      if (consecutiveSuspiciousChecks > 1) {
        console.log(`🚨 HIGH SUSPICION LEVEL: ${consecutiveSuspiciousChecks} consecutive suspicious checks`);
      }
    }, 2000); // Check every 2 seconds instead of 1

    // Monitor for window resize events
    const handleResize = () => {
      if (!isFullscreen) {
        console.log('🚨 SUSPICIOUS: Window resized - possible overlay application');
        suspiciousActivityDetected = true;
        consecutiveSuspiciousChecks++;
        incrementCountsOnce();
      }
    };

    // Monitor for selection changes
    const handleSelectionChange = () => {
      if (!isFullscreen) {
        console.log('🚨 SUSPICIOUS: Text selection changed - possible app switching');
        suspiciousActivityDetected = true;
        consecutiveSuspiciousChecks++;
        incrementCountsOnce('Selection change detected (possible app switch) [pause screen]');
      }
    };

    // Monitor for context menu (common when switching apps)
    const handleContextMenu = () => {
      if (!isFullscreen) {
        console.log('🚨 SUSPICIOUS: Context menu opened - possible app switching');
        suspiciousActivityDetected = true;
        consecutiveSuspiciousChecks++;
        incrementCountsOnce('Context menu opened (possible app switch) [pause screen]');
      }
    };

    // Add all event listeners
    document.addEventListener('visibilitychange', handleVisibilityChange);
    document.addEventListener('focus', handleFocus);
    document.addEventListener('blur', handleBlur);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);
    window.addEventListener('resize', handleResize);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('keydown', handleKeyPress);
    document.addEventListener('keyup', handleKeyPress);
    document.addEventListener('selectionchange', handleSelectionChange);
    document.addEventListener('contextmenu', handleContextMenu);
    
    // Sync with sessionStorage to ensure consistency with InterviewScreen
    const syncInterval = setInterval(() => {
      const storedSuspicious = sessionStorage.getItem('pauseSuspiciousActivityCount');
      const storedAppSwitch = sessionStorage.getItem('pauseAppSwitchCount');
      
      if (storedSuspicious) {
        const currentValue = parseInt(storedSuspicious);
        if (currentValue !== suspiciousActivityCount) {
          console.log('Pause: Syncing suspicious activity count:', suspiciousActivityCount, '->', currentValue);
          setSuspiciousActivityCount(currentValue);
        }
      }
      
      if (storedAppSwitch) {
        const currentValue = parseInt(storedAppSwitch);
        if (currentValue !== appSwitchCount) {
          console.log('Pause: Syncing app switch count:', appSwitchCount, '->', currentValue);
          setAppSwitchCount(currentValue);
        }
      }
    }, 500);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.removeEventListener('focus', handleFocus);
      document.removeEventListener('blur', handleBlur);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('keydown', handleKeyPress);
      document.removeEventListener('keyup', handleKeyPress);
      document.removeEventListener('selectionchange', handleSelectionChange);
      document.removeEventListener('contextmenu', handleContextMenu);
      
      clearInterval(checkActivity);
      clearInterval(syncInterval);
    };
  }, [isFullscreen, suspiciousActivityCount, appSwitchCount]);

  useEffect(() => {
    // Listen for fullscreen changes
    const handleFullscreenChange = () => {
      const fullscreenElement = document.fullscreenElement || 
                               document.webkitFullscreenElement || 
                               document.mozFullScreenElement || 
                               document.msFullscreenElement;
      
      setIsFullscreen(!!fullscreenElement);
      
      if (fullscreenElement) {
        // Fullscreen re-entered successfully
        console.log('FullscreenPause: Fullscreen detected, calling onFullscreenResumed');
        setTimeout(() => {
          console.log('FullscreenPause: Calling onFullscreenResumed after delay');
          onFullscreenResumed();
        }, 500);
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
    };
  }, [onFullscreenResumed]);

  const requestFullscreen = async () => {
    try {
      setShowInstructions(false);
      
      if (document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
      } else if (document.documentElement.webkitRequestFullscreen) {
        await document.documentElement.webkitRequestFullscreen();
      } else if (document.documentElement.mozRequestFullScreen) {
        await document.documentElement.mozRequestFullScreen();
      } else if (document.documentElement.msRequestFullscreen) {
        await document.documentElement.msRequestFullscreen();
      }
    } catch (error) {
      console.error('Error entering fullscreen:', error);
      setShowInstructions(true);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#fff', borderRadius: 16, boxShadow: '0 4px 24px rgba(30,41,59,0.10)', padding: '2.5rem 2.5rem', maxWidth: 800, width: '100%', textAlign: 'center' }}>
        <div style={{ fontSize: '2.5rem', marginBottom: 18 }}>⏸️</div>
        <h2 style={{ color: '#1e293b', fontWeight: 900, fontSize: '2rem', marginBottom: 10 }}>Interview Paused</h2>
        <p style={{ color: '#334155', fontSize: '1.1rem', marginBottom: 18 }}><strong>Fullscreen mode is REQUIRED</strong> to continue your interview.</p>
        <div style={{ background: '#fef3c7', color: '#b45309', borderRadius: 10, padding: '0.8rem 1rem', marginBottom: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
          <span style={{ fontSize: '1.3rem' }}>⚠️</span>
          <span>You must enter fullscreen mode to proceed with the interview.</span>
        </div>
        {currentQuestion && (
          <div style={{ background: '#f1f5f9', borderRadius: 10, padding: '1rem', marginBottom: 18, textAlign: 'left' }}>
            <div style={{ color: '#2563eb', fontWeight: 700, marginBottom: 6 }}>Question {questionIndex + 1} of {totalQuestions}</div>
            <div style={{ color: '#1e293b', fontWeight: 600, marginBottom: 4 }}>Current Question:</div>
            <div style={{ color: '#334155', fontSize: '1rem' }}>{currentQuestion.question || currentQuestion.text}</div>
          </div>
        )}
        {showInstructions && (
          <div style={{ background: '#f1f5f9', borderRadius: 10, padding: '1.2rem', marginBottom: 18, textAlign: 'left' }}>
            <div style={{ color: '#1e293b', fontWeight: 700, marginBottom: 8 }}>Why Fullscreen is MANDATORY?</div>
            <ul style={{ color: '#334155', fontSize: '1.05rem', lineHeight: 1.7, margin: 0, paddingLeft: 18 }}>
              <li>🔒 Required for interview security</li>
              <li>🎯 Mandatory to maintain focus</li>
              <li>📱 Essential for optimal experience</li>
              <li>⚡ Necessary to prevent distractions</li>
            </ul>
            <div style={{ background: '#fee2e2', color: '#b91c1c', borderRadius: 8, padding: '0.6rem 1rem', marginTop: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span>⚠️</span>
              <span>You cannot continue without entering fullscreen mode.</span>
            </div>
          </div>
        )}
        <div style={{ margin: '1.5rem 0' }}>
          <button
            style={{ background: 'linear-gradient(90deg,#3b82f6,#10b981)', color: 'white', borderRadius: 10, fontWeight: 700, border: 'none', fontSize: '1.1rem', boxShadow: '0 2px 8px rgba(37,99,235,0.10)', padding: '1rem 2rem', cursor: isFullscreen ? 'not-allowed' : 'pointer', opacity: isFullscreen ? 0.7 : 1 }}
            onClick={requestFullscreen}
            disabled={isFullscreen}
          >
            {isFullscreen ? 'Returning to Interview...' : 'ENTER FULLSCREEN TO CONTINUE'}
          </button>
        </div>
        <div style={{ margin: '1.5rem 0' }}>
          {isFullscreen ? (
            <div style={{ color: '#16a34a', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span>🔄</span>
              <span>Resuming interview...</span>
            </div>
          ) : (
            <div style={{ color: '#b91c1c', fontWeight: 700, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
              <span>⏸️ Interview BLOCKED - Fullscreen required</span>
              {pauseTime > 0 && (
                <div style={{ color: '#b91c1c', fontWeight: 500, fontSize: '0.98rem' }}>
                  Blocked for {Math.floor(pauseTime / 60)}:{(pauseTime % 60).toString().padStart(2, '0')}
                </div>
              )}
              {(suspiciousActivityCount > 0 || appSwitchCount > 0) && (
                <div style={{ marginTop: 8, color: '#b91c1c', fontWeight: 600, fontSize: '0.98rem', display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <div>🚨 Suspicious Activities: {suspiciousActivityCount}</div>
                  <div>📱 App Switches: {appSwitchCount}</div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FullscreenPause; 