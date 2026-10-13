import React, { useRef, useEffect, useState } from 'react';
import Webcam from 'react-webcam';
import { FaceMesh } from '@mediapipe/face_mesh';
import { Camera } from '@mediapipe/camera_utils';
import '../styles/WebcamFeed.css';

const WebcamFeed = ({ onConfidenceScore, onFaceStatusChange }) => {
  const webcamRef = useRef(null);
  const canvasRef = useRef(null);
  const [confidence, setConfidence] = useState(0);
  const [faceStatus, setFaceStatus] = useState('Loading...');

  useEffect(() => {
    let camera = null;
    let faceMesh = null;

    const setupFaceMesh = async () => {
      faceMesh = new FaceMesh({
        locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`,
      });
      faceMesh.setOptions({
        maxNumFaces: 3,
        refineLandmarks: true,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });

      faceMesh.onResults((results) => {
        const ctx = canvasRef.current?.getContext('2d');
        if (ctx && webcamRef.current && webcamRef.current.video) {
          const video = webcamRef.current.video;
          canvasRef.current.width = video.videoWidth;
          canvasRef.current.height = video.videoHeight;
          ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);

          // Mirror the canvas to match the video
          ctx.save();
          ctx.translate(video.videoWidth, 0);
          ctx.scale(-1, 1);
        }
        let newFaceStatus = 'No face detected';
        if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
          if (ctx && webcamRef.current && webcamRef.current.video) {
            const video = webcamRef.current.video;
            results.multiFaceLandmarks.forEach(landmarks => {
              let minX = 1, minY = 1, maxX = 0, maxY = 0;
              landmarks.forEach(pt => {
                if (pt.x < minX) minX = pt.x;
                if (pt.y < minY) minY = pt.y;
                if (pt.x > maxX) maxX = pt.x;
                if (pt.y > maxY) maxY = pt.y;
              });
              const margin = 0.03;
              minX = Math.max(0, minX - margin);
              minY = Math.max(0, minY - margin);
              maxX = Math.min(1, maxX + margin);
              maxY = Math.min(1, maxY + margin);
              ctx.strokeStyle = '#22c55e';
              ctx.lineWidth = 3;
              ctx.strokeRect(
                minX * video.videoWidth,
                minY * video.videoHeight,
                (maxX - minX) * video.videoWidth,
                (maxY - minY) * video.videoHeight
              );
            });
            ctx.restore();
          }
          if (results.multiFaceLandmarks.length === 1) {
            newFaceStatus = 'Face detected';
            const landmarks = results.multiFaceLandmarks[0];
            const nose = landmarks[1];
            const video = webcamRef.current.video;
            const frameCenter = { x: video.videoWidth / 2, y: video.videoHeight / 2 };
            const dx = (nose.x * video.videoWidth) - frameCenter.x;
            const dy = (nose.y * video.videoHeight) - frameCenter.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const maxDist = Math.sqrt(Math.pow(frameCenter.x, 2) + Math.pow(frameCenter.y, 2));
            const centerScore = 1 - Math.min(dist / maxDist, 1);
            const score = Math.round(centerScore * 100);
            setConfidence(score);
            if (onConfidenceScore) onConfidenceScore(score);
            // Debug log
            console.log('Face detected. Confidence:', score);
          } else {
            newFaceStatus = 'More than 1 person detected';
            setConfidence(0);
            if (onConfidenceScore) onConfidenceScore(0);
            // Debug log
            console.log('More than 1 person detected');
          }
        } else {
          setConfidence(0);
          if (onConfidenceScore) onConfidenceScore(0);
          // Debug log
          console.log('No face detected');
        }
        setFaceStatus(newFaceStatus);
        if (onFaceStatusChange) onFaceStatusChange(newFaceStatus);
      });

      if (webcamRef.current && webcamRef.current.video) {
        camera = new Camera(webcamRef.current.video, {
          onFrame: async () => {
            if (webcamRef.current && webcamRef.current.video) {
              await faceMesh.send({ image: webcamRef.current.video });
            }
          },
          width: 400,
          height: 300,
        });
        camera.start();
      } else {
        console.warn('Webcam video element not ready yet');
      }
    };

    const initializeFaceDetection = () => {
      if (webcamRef.current && webcamRef.current.video && webcamRef.current.video.readyState === 4) {
        setupFaceMesh();
      } else {
        setTimeout(initializeFaceDetection, 100);
      }
    };

    initializeFaceDetection();

    return () => {
      if (camera) camera.stop();
    };
  }, [onConfidenceScore, onFaceStatusChange]);

  return (
    <div className="webcam-container">
      <div className="video-wrapper" style={{ position: 'relative', width: 400, height: 300 }}>
        <Webcam
          ref={webcamRef}
          audio={false}
          videoConstraints={{ width: 400, height: 300, facingMode: "user" }}
          className="webcam-feed"
          style={{
            objectFit: 'cover',
            width: 400,
            height: 300,
            borderRadius: 10,
            transform: 'scaleX(-1)'
          }}
        />
        <canvas
          ref={canvasRef}
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            width: 400,
            height: 300,
            pointerEvents: 'none',
            borderRadius: 10
          }}
        />
        <div className="face-detection-overlay" style={{
          position: 'absolute',
          left: 0, right: 0, bottom: 0,
          background: 'rgba(255,255,255,0.92)',
          borderTopLeftRadius: 10,
          borderTopRightRadius: 10,
          padding: '0.5rem 1rem',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          boxShadow: '0 -2px 8px rgba(0,0,0,0.04)',
          border: faceStatus === 'Face detected' ? '2px solid #22c55e' : faceStatus === 'More than 1 person detected' ? '2px solid #f59e42' : '2px solid #ef4444',
          maxWidth: 380,
          minHeight: 60,
          overflow: 'auto',
          zIndex: 2
        }}>
          <div className="confidence-score" style={{
            fontSize: '1rem',
            fontWeight: 600,
            color: '#222',
            marginTop: '0.2rem',
            background: '#f3f4f6',
            borderRadius: 6,
            padding: '0.2rem 0.7rem',
            display: 'inline-block',
            maxWidth: '100%',
            wordBreak: 'break-word'
          }}>
            {faceStatus}
          </div>
        </div>
      </div>
    </div>
  );
};

export default WebcamFeed; 