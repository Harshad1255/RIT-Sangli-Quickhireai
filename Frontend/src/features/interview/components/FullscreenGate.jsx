import React, { useState, useEffect } from 'react';
import './FullscreenGate.css';

const FullscreenGate = ({ onFullscreenEntered }) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const [showInstructions, setShowInstructions] = useState(true);

  useEffect(() => {
    // Check if fullscreen is supported
    if (!document.fullscreenEnabled && 
        !document.webkitFullscreenEnabled && 
        !document.mozFullScreenEnabled && 
        !document.msFullscreenEnabled) {
      setIsSupported(false);
    }

    // Listen for fullscreen changes
    const handleFullscreenChange = () => {
      const fullscreenElement = document.fullscreenElement || 
                               document.webkitFullscreenElement || 
                               document.mozFullScreenElement || 
                               document.msFullscreenElement;
      
      setIsFullscreen(!!fullscreenElement);
      
      if (fullscreenElement) {
        // Fullscreen entered successfully
        console.log('Fullscreen detected in FullscreenGate, calling onFullscreenEntered');
        setTimeout(() => {
          console.log('Calling onFullscreenEntered after delay');
          onFullscreenEntered();
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
  }, [onFullscreenEntered]);

  const requestFullscreen = async () => {
    try {
      setShowInstructions(false);
      console.log('Requesting fullscreen...');
      
      if (document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
      } else if (document.documentElement.webkitRequestFullscreen) {
        await document.documentElement.webkitRequestFullscreen();
      } else if (document.documentElement.mozRequestFullScreen) {
        await document.documentElement.mozRequestFullScreen();
      } else if (document.documentElement.msRequestFullscreen) {
        await document.documentElement.msRequestFullscreen();
      }
      
      // Fallback: Check if fullscreen was actually entered after a short delay
      setTimeout(() => {
        const fullscreenElement = document.fullscreenElement || 
                                 document.webkitFullscreenElement || 
                                 document.mozFullScreenElement || 
                                 document.msFullscreenElement;
        if (fullscreenElement && !isFullscreen) {
          console.log('Fallback: Fullscreen detected, calling onFullscreenEntered');
          onFullscreenEntered();
        }
      }, 1000);
      
    } catch (error) {
      console.error('Error entering fullscreen:', error);
      setShowInstructions(true);
    }
  };

  const exitFullscreen = () => {
    if (document.exitFullscreen) {
      document.exitFullscreen();
    } else if (document.webkitExitFullscreen) {
      document.webkitExitFullscreen();
    } else if (document.mozCancelFullScreen) {
      document.mozCancelFullScreen();
    } else if (document.msExitFullscreen) {
      document.msExitFullscreen();
    }
  };

  if (!isSupported) {
    return (
      <div style={{ minHeight: '100vh', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ background: '#fff', borderRadius: 16, boxShadow: '0 4px 24px rgba(30,41,59,0.10)', padding: '3rem', maxWidth: 600, width: '100%', textAlign: 'center' }}>
          <div className="fullscreen-icon"><i className="fa-solid fa-triangle-exclamation" aria-hidden="true" /></div>
          <h2>Fullscreen Not Supported</h2>
          <p style={{ color: '#1e293b', fontSize: '1.1rem', lineHeight: 1.7 }}>Your browser doesn't support fullscreen mode. For the best interview experience, please use a modern browser.</p>
          <button 
            className="continue-button"
            onClick={onFullscreenEntered}
            style={{ background: 'linear-gradient(90deg,#3b82f6,#10b981)', color: 'white', borderRadius: 10, fontWeight: 700, border: 'none', fontSize: '1.1rem', boxShadow: '0 2px 8px rgba(37,99,235,0.10)' }}
          >
            Continue Anyway
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#fff', borderRadius: 16, boxShadow: '0 4px 24px rgba(30,41,59,0.10)', padding: '3rem 2.5rem', maxWidth: 800, width: '100%', textAlign: 'center' }}>
        <div className="fullscreen-icon">🖥️</div>
        <h2>Interview Fullscreen Required</h2>
        <p style={{ color: '#1e293b', fontSize: '1.1rem', lineHeight: 1.7 }}>To ensure a secure and focused interview experience, please enter fullscreen mode.</p>
        
        {showInstructions && (
          <div className="instructions">
            <h3 style={{ color: '#1e293b', fontSize: '1.1rem', lineHeight: 1.7 }}>Why Fullscreen?</h3>
            <ul>
              <li style={{ color: '#334155', fontWeight: 600 }}>🔒 Prevents accidental tab switching</li>
              <li style={{ color: '#334155', fontWeight: 600 }}>🎯 Maintains focus during the interview</li>
              <li style={{ color: '#334155', fontWeight: 600 }}>📱 Ensures optimal viewing experience</li>
              <li style={{ color: '#334155', fontWeight: 600 }}>⚡ Reduces distractions</li>
            </ul>
          </div>
        )}
        
        <div className="fullscreen-actions">
          <button 
            className="fullscreen-button"
            onClick={requestFullscreen}
            disabled={isFullscreen}
            style={{ background: 'linear-gradient(90deg,#3b82f6,#10b981)', color: 'white', borderRadius: 10, fontWeight: 700, border: 'none', fontSize: '1.1rem', boxShadow: '0 2px 8px rgba(37,99,235,0.10)' }}
          >
            {isFullscreen ? 'Fullscreen Active' : 'Enter Fullscreen'}
          </button>
          
          {isFullscreen && (
            <button 
              className="exit-fullscreen-button"
              onClick={exitFullscreen}
            >
              Exit Fullscreen
            </button>
          )}
          

        </div>
        
        <div className="fullscreen-status">
          {isFullscreen ? (
            <div className="status-success">
              <span className="status-icon">✅</span>
              <span style={{ color: '#1e293b', fontSize: '1.1rem', lineHeight: 1.7 }}>Fullscreen mode active</span>
            </div>
          ) : (
            <div className="status-waiting">
              <span className="status-icon">⏳</span>
              <span style={{ color: '#1e293b', fontSize: '1.1rem', lineHeight: 1.7 }}>Waiting for fullscreen...</span>
            </div>
          )}
        </div>
        
        <div className="fullscreen-tips">
          <h4 style={{ color: '#1e293b', fontSize: '1.1rem', lineHeight: 1.7 }}>Quick Tips:</h4>
          <ul style={{ color: '#334155', fontSize: '1.08rem', margin: '8px 0' }}>
            <li>Press <kbd>F11</kbd> or <kbd>Esc</kbd> to exit fullscreen</li>
            <li>Ensure your microphone and camera are working</li>
            <li>Close other applications to avoid distractions</li>
            <li>Have a stable internet connection</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default FullscreenGate; 