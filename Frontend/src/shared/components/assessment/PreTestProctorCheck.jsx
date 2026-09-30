import React, { useState, useEffect, useRef } from 'react';
import { api } from '../../services/api';
import './ExamSecurityWrapper.css';

const PreTestProctorCheck = ({ videoRef, detectorStateRef, onComplete }) => {
  const [status, setStatus] = useState('checking');
  const [messages, setMessages] = useState(['Analyzing video feed...']);
  const [consent, setConsent] = useState(false);
  const [referencePhoto, setReferencePhoto] = useState(null);

  const canvasRef = useRef(null);
  const consecutiveValidRef = useRef(0);

  useEffect(() => {
    let interval;
    if (status === 'checking') {
      interval = setInterval(() => {
        if (!videoRef.current || videoRef.current.readyState < 2) return;
        
        // Virtual camera check
        const stream = videoRef.current.srcObject;
        if (stream && stream.getVideoTracks().length > 0) {
          const track = stream.getVideoTracks()[0];
          const label = track.label.toLowerCase();
          if (label.includes('obs') || label.includes('virtual') || label.includes('manycam')) {
            setMessages(['Virtual cameras (e.g., OBS, ManyCam) are not permitted. Please use a real webcam.']);
            return;
          }
        }
        
        const faceState = detectorStateRef?.current;
        if (faceState === 'NO_FACE') {
          setMessages(['No face detected. Please ensure you are visible in the camera.']);
          consecutiveValidRef.current = 0;
          return;
        } else if (faceState === 'MULTIPLE_FACES') {
          setMessages(['Multiple faces detected. You must be alone during the assessment.']);
          consecutiveValidRef.current = 0;
          return;
        } else if (faceState === 'LOOKING_AWAY') {
          setMessages(['Please look directly at the camera.']);
          consecutiveValidRef.current = 0;
          return;
        } else if (faceState !== 'ONE_FACE') {
          setMessages(['Initializing face detection...']);
          return;
        }

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        let totalBrightness = 0;
        for (let i = 0; i < imageData.data.length; i += 4) {
          totalBrightness += (0.299 * imageData.data[i] + 0.587 * imageData.data[i+1] + 0.114 * imageData.data[i+2]);
        }
        const avgBrightness = totalBrightness / (canvas.width * canvas.height);
        
        const isBrightEnough = avgBrightness > 40 && avgBrightness < 240;
        
        if (isBrightEnough) {
          consecutiveValidRef.current += 1;
          setMessages(['Face detected perfectly! Hold still...']);
          
          if (consecutiveValidRef.current >= 3) {
            canvas.toBlob((blob) => {
              setReferencePhoto(blob);
              setStatus('ready');
            }, 'image/jpeg', 0.8);
          }
        } else {
          setMessages(['Lighting is too dark or too bright. Please adjust your environment.']);
          consecutiveValidRef.current = 0;
        }
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [status, videoRef, detectorStateRef]);


  const handleSubmit = () => {
    if (!consent || !referencePhoto) return;
    setStatus('uploading');
    onComplete({ referencePhoto, consentAccepted: consent });
  };

  return (
    <div className="exam-security-gate">
      <div className="exam-security-card" style={{ maxWidth: 600 }}>
        <h2 style={{ marginBottom: 20 }}>Pre-Test Proctoring Check</h2>
        
        <div style={{ display: 'flex', gap: 20, alignItems: 'center', marginBottom: 20 }}>
          <div style={{ flex: 1, background: '#000', borderRadius: 8, overflow: 'hidden', position: 'relative', height: 200 }}>
            <canvas ref={canvasRef} width={320} height={240} style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }} />
          </div>
          <div style={{ flex: 1 }}>
            <ul style={{ paddingLeft: 20, color: '#334155', lineHeight: '1.6', listStyle: 'none', margin: 0, padding: 0 }}>
              <li><i className={status === 'ready' ? 'fas fa-check-circle' : 'fas fa-circle-notch fa-spin'} style={{ color: status === 'ready' ? '#10b981' : '#3b82f6', marginRight: 8 }}></i> Lighting adequate</li>
              <li><i className={status === 'ready' ? 'fas fa-check-circle' : 'fas fa-circle-notch fa-spin'} style={{ color: status === 'ready' ? '#10b981' : '#3b82f6', marginRight: 8 }}></i> Face detected</li>
              <li><i className={status === 'ready' ? 'fas fa-check-circle' : 'fas fa-circle-notch fa-spin'} style={{ color: status === 'ready' ? '#10b981' : '#3b82f6', marginRight: 8 }}></i> Face centered</li>
            </ul>
            {status === 'checking' && <p style={{ color: '#ef4444', fontSize: '0.9rem', marginTop: 10 }}>{messages[0]}</p>}
          </div>
        </div>

        {status === 'ready' && (
          <div style={{ textAlign: 'left', background: '#f8fafc', padding: 15, borderRadius: 8, border: '1px solid #e2e8f0', marginBottom: 20 }}>
            <h4 style={{ margin: '0 0 10px 0' }}>Consent Notice</h4>
            <p style={{ fontSize: '0.85rem', color: '#475569', marginBottom: 10 }}>
              By proceeding, you consent to the collection of a reference photo and continuous webcam monitoring during this assessment to ensure academic integrity. Data is securely retained for up to 30 days.
            </p>
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: '0.95rem', fontWeight: 600 }}>
              <input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} style={{ width: 18, height: 18 }} />
              I understand and agree
            </label>
          </div>
        )}

        <button 
          className="exam-security-button" 
          disabled={status !== 'ready' || !consent} 
          onClick={handleSubmit}
          style={(status !== 'ready' || !consent) ? { opacity: 0.5, cursor: 'not-allowed', background: '#94a3b8' } : {}}
        >
          {status === 'uploading' ? 'Finalizing...' : 'Continue to Assessment'}
        </button>
      </div>
    </div>
  );
};

export default PreTestProctorCheck;
