import { useState, useEffect, useRef } from "react";
import WebcamFeed from "./WebcamFeed";
import { api } from "../../../shared/services/api";
import "../styles/InterviewScreen.css";
import RealTimeFeedback from './RealTimeFeedback';
import FinalEvaluation from './FinalEvaluation';
import speechRecognitionService from '../services/speechRecognitionService';
import CodeEditor from './CodeEditor';
import TechQuestionTypes from './TechQuestionTypes';

import TabMonitoringService from '../services/tabMonitoringService';
import FullscreenGate from './FullscreenGate';
import FullscreenPause from './FullscreenPause';
import { useLocation, useNavigate, useParams } from 'react-router-dom';

// Persistent state keys
const getStorageKey = (code) => `interviewState_${code}`;

// Restore state from sessionStorage if available
const restoreState = (code) => {
  try {
    const raw = sessionStorage.getItem(getStorageKey(code));
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

// Save state to sessionStorage
const saveState = (code, state) => {
  try {
    sessionStorage.setItem(getStorageKey(code), JSON.stringify(state));
  } catch {}
};

// Clear state from sessionStorage
const clearState = (code) => {
  try {
    sessionStorage.removeItem(getStorageKey(code));
  } catch {}
};

const InterviewScreen = (props) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { interviewCode: paramInterviewCode } = useParams();
  const interviewCode = props.interviewCode || paramInterviewCode;

  // --- State initialization ---
  const restored = restoreState(interviewCode);
  const [currentQuestion, setCurrentQuestion] = useState(restored?.currentQuestion || null);
  const [questions, setQuestions] = useState(restored?.questions || []);
  const [questionIndex, setQuestionIndex] = useState(restored?.questionIndex || 0);
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [currentTopic, setCurrentTopic] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isComplete, setIsComplete] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState('');
  const [code, setCode] = useState("");
  const [allAnswers, setAllAnswers] = useState([]);
  const [finalEvaluation, setFinalEvaluation] = useState(null);
  const [totalQuestions, setTotalQuestions] = useState(5);
  const [answers, setAnswers] = useState(restored?.answers || []);
  const [skippedQuestions, setSkippedQuestions] = useState(restored?.skippedQuestions || []);
  const [recordingStatus, setRecordingStatus] = useState('idle'); // 'idle', 'recording', 'processing'
  const [recordingError, setRecordingError] = useState(null);
  const [skipError, setSkipError] = useState(null);
  const [hasSavedCompletion, setHasSavedCompletion] = useState(false);
  const [isFollowUpQuestion, setIsFollowUpQuestion] = useState(restored?.isFollowUpQuestion || false);
  const [followUpCount, setFollowUpCount] = useState(restored?.followUpCount || 0);
  const [selectedQuestionType, setSelectedQuestionType] = useState('concepts');
  const [tabMonitoringService, setTabMonitoringService] = useState(null);
  const [suspiciousActivities, setSuspiciousActivities] = useState([]);
  const [tabSwitchCount, setTabSwitchCount] = useState(0);
  const [isMonitoringActive, setIsMonitoringActive] = useState(false);
  // Use shared monitoring state from pause screen - initialize from sessionStorage
  const getStoredCount = (key) => {
    const stored = sessionStorage.getItem(key);
    return stored !== null ? parseInt(stored) : 0;
  };
  const [sharedSuspiciousActivityCount, setSharedSuspiciousActivityCount] = useState(() => getStoredCount('pauseSuspiciousActivityCount'));
  const [sharedAppSwitchCount, setSharedAppSwitchCount] = useState(() => getStoredCount('pauseAppSwitchCount'));
  const [isFullscreenEntered, setIsFullscreenEntered] = useState(false);
  const [isFullscreenPaused, setIsFullscreenPaused] = useState(false);
  const [isCurrentlyFullscreen, setIsCurrentlyFullscreen] = useState(false);
  const recentlyIncrementedRef = useRef(false);
  const focusLossIncrementedRef = useRef(false);
  const [faceStatus, setFaceStatus] = useState('');

  // Add at the top of the component
  const getStoredLogs = () => {
    try {
      const raw = sessionStorage.getItem('suspiciousActivityLogs');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  };
  const [suspiciousActivityLogs, setSuspiciousActivityLogs] = useState(getStoredLogs());

  // Helper to add a log
  const addSuspiciousLog = (message) => {
    const log = { time: new Date().toLocaleString(), message };
    setSuspiciousActivityLogs(prev => {
      const updated = [...prev, log];
      sessionStorage.setItem('suspiciousActivityLogs', JSON.stringify(updated));
      return updated;
    });
  };

  // --- Save state on relevant changes ---
  useEffect(() => {
    if (!interviewCode) return;
    saveState(interviewCode, {
      currentQuestion,
      questions,
      questionIndex,
      answers,
      skippedQuestions,
      isFollowUpQuestion,
      followUpCount,
    });
  }, [interviewCode, currentQuestion, questions, questionIndex, answers, skippedQuestions, isFollowUpQuestion, followUpCount]);

  // --- On interview start, clear previous state ---
  useEffect(() => {
    if (!interviewCode) return;
    // If this is a new interview (first question, index 0, etc.), clear state
    if (questionIndex === 0 && answers.length === 0 && (!restored || !restored.questions)) {
      clearState(interviewCode);
    }
  }, [interviewCode]);

  useEffect(() => {
    const initializeInterview = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Strict separation of mock and company interview flows
        let skills = null;
        let isMock = !!props.isMock;
        let codeToUse = interviewCode;

        if (!codeToUse || codeToUse === 'undefined' || codeToUse === '') {
          setError('Invalid or missing interview code. Please restart the interview.');
          setIsLoading(false);
          return;
        }

        if (isMock) {
          // Mock interview: use selectedSkills from props or sessionStorage
          if (props.selectedSkills && props.selectedSkills.length > 0) {
            skills = props.selectedSkills;
          } else {
            skills = JSON.parse(sessionStorage.getItem('selectedSkills'));
          }
        } else if (props.interviewData?.skills) {
          // Company interview: use company skills only
          skills = props.interviewData.skills;
        }

        if (!skills || !Array.isArray(skills) || skills.length < 1) {
          setError('No skills selected or available. Please restart the interview.');
          setIsLoading(false);
          return;
        }

        // Store skills in session storage if coming from location state (for mock interviews)
        if (isMock && props.selectedSkills && props.selectedSkills.length > 0) {
          sessionStorage.setItem('selectedSkills', JSON.stringify(props.selectedSkills));
          sessionStorage.setItem('interviewData', JSON.stringify({ interviewCode: codeToUse }));
        }

        const response = await api.post('/interviews/start', {
          interviewCode: codeToUse,
          skills
        });

        if (response.data.success) {
          const { interview } = response.data;
          setQuestions(interview.questions);
          setCurrentQuestion(interview.questions[0]);
          setTotalQuestions(interview.totalQuestions);
          setQuestionIndex(0);
          setAnswers([]);
          setSkippedQuestions([]);
          setIsFollowUpQuestion(false);
          setFollowUpCount(0);
          clearState(interviewCode); // <-- clear persistent state on new interview
          // Always reset suspicious/app switch counts for a new interview
          sessionStorage.setItem('pauseSuspiciousActivityCount', '0');
          sessionStorage.setItem('pauseAppSwitchCount', '0');
          setSharedSuspiciousActivityCount(0);
          setSharedAppSwitchCount(0);
          sessionStorage.setItem('suspiciousActivityLogs', JSON.stringify([]));
          setSuspiciousActivityLogs([]);
        } else {
          throw new Error(response.data.error || 'Failed to initialize interview');
        }
      } catch (error) {
        console.error('Error initializing interview:', error);
        setError('Failed to initialize interview. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    initializeInterview();

    // Cleanup function
    return () => {
      if (isRecording) {
        speechRecognitionService.stopRecording();
      }
    };
  }, [interviewCode, location.state, navigate, props.interviewData, props.selectedSkills, props.isMock]);

  // Remove the session checking interval as it's causing the redirect issue
  // Instead, check session validity only when needed
  const checkSession = () => {
    const storedData = sessionStorage.getItem('interviewData');
    const storedSkills = sessionStorage.getItem('selectedSkills');
    return storedData && storedSkills;
  };

  const startRecording = () => {
    try {
      setRecordingStatus('recording');
      setRecordingError(null);
      
      speechRecognitionService.startRecording(
        (interim) => setInterimTranscript(interim),
        (final) => setTranscript(final),
        (error) => {
          setRecordingError(error);
          setRecordingStatus('idle');
        }
      );
      setIsRecording(true);
    } catch (error) {
      setRecordingError('Failed to start recording');
      setRecordingStatus('idle');
    }
  };

  const stopRecording = async () => {
    try {
      setRecordingStatus('processing');
      const finalTranscript = await speechRecognitionService.stopRecording();
      setIsRecording(false);
      
      console.log('Recording stopped, final transcript:', finalTranscript);
      
      if (!finalTranscript || !finalTranscript.trim()) {
        console.log('No transcript detected');
        setRecordingError('No speech detected. Please try again.');
        return;
      }

      // Set the transcript in state and submit
      setTranscript(finalTranscript.trim());
      // Log transcript for debugging
      console.log('Transcript to submit:', finalTranscript.trim());
      // Auto-submit code and transcript
      await submitAnswer({ code, transcript: finalTranscript.trim() });

    } catch (error) {
      console.error('Error in stopRecording:', error);
      setRecordingError('Failed to process recording');
    } finally {
      setRecordingStatus('idle');
      setInterimTranscript('');
    }
  };

  // 1. Always show 'Write code here...' as the placeholder
  // 2. Use a simple code editor with line numbers (fallback to textarea with line numbers if no library)
  // 3. Keep Submit Code button below
  // 4. On submit, send both code and transcript in the evaluation

  // For now, use a styled textarea with line numbers (for simplicity and reliability)
  const submitAnswer = async (payload) => {
    try {
      let answerText = typeof payload === 'string' ? payload : payload.transcript;
      let codeText = typeof payload === 'string' ? code : payload.code;
      // If transcript/answerText is empty but codeText is present, use codeText as the answer
      if ((!answerText || !answerText.trim()) && codeText && codeText.trim()) {
        answerText = codeText;
      }
      if (!answerText || !answerText.trim()) {
        throw new Error('No answer to submit');
      }
      setIsProcessing(true);
      setError(null);
      
      // Log the request payload
      const requestPayload = {
        answer: answerText.trim(),
        question: currentQuestion,
        interviewCode,
        code: codeText || '',
      };
      console.log('Submitting answer with payload:', requestPayload);

      const response = await api.post('/interviews/evaluate-answer', requestPayload);

      // Log backend response
      console.log('Evaluation response:', response.data);

      // If interview is complete, show final evaluation
      if (response.data.isComplete && response.data.evaluation) {
        const newAnswer = {
          question: currentQuestion,
          answer: answerText.trim(),
          code: codeText || '',
          evaluation: response.data.lastAnswerEvaluation || response.data.evaluation,
          questionNumber: questionIndex + 1,
          isFollowUp: isFollowUpQuestion
        };
        setAnswers(prev => [...prev, newAnswer]);
        setFinalEvaluation(response.data.evaluation);
        setIsComplete(true);
        // Do NOT call handleInterviewCompletion!
        return;
      }

      const { evaluation, nextQuestion, isFollowUp } = response.data;
      
      // Store the answer
      const newAnswer = {
        question: currentQuestion,
        answer: answerText.trim(),
        code: codeText || '',
        evaluation,
        questionNumber: questionIndex + 1,
        isFollowUp: isFollowUpQuestion
      };
      
      console.log('Storing new answer:', newAnswer);
      setAnswers(prev => [...prev, newAnswer]);
      setFeedback(evaluation);

      // Handle next question
      if (nextQuestion) {
        console.log('Moving to next question:', nextQuestion);
        
        // Check if this is a follow-up question
        if (isFollowUp) {
          setIsFollowUpQuestion(true);
          setFollowUpCount(prev => prev + 1);
          console.log('This is a follow-up question');
        } else {
          setIsFollowUpQuestion(false);
          setFollowUpCount(0);
          setQuestionIndex(prev => prev + 1);
        }
        
        setCurrentQuestion(nextQuestion);
        
        // Ensure recording is stopped for the next question
        if (isRecording) {
          speechRecognitionService.cancel();
          setIsRecording(false);
        }
        
        setTranscript('');
        setInterimTranscript('');
        setCode('');
        setFeedback(null);
      }
    } catch (error) {
      console.error('Error submitting answer:', error);
      setError(error.message || 'Failed to submit answer');
    } finally {
      setIsProcessing(false);
    }
  };

  // --- UI/UX Improvements and Skip Fix ---
  // 1. Add a helper to always send a valid question object for skip/submit
  const getValidQuestion = () => {
    if (!currentQuestion) return null;
    // If currentQuestion has 'question' or 'text', return as is
    if (currentQuestion.question || currentQuestion.text) {
      // Ensure all required fields are present (id, question, topic, difficulty, etc.)
      const q = currentQuestion;
      // Try to find the full question object from questions array if missing fields
      if (q.id && q.topic && q.difficulty) return q;
      const match = questions.find(qq => qq.question === q.question || qq.text === q.text);
      return match ? { ...match, ...q } : q;
    }
    // Fallback: try to get from questions array
    if (questions[questionIndex]) return questions[questionIndex];
    return null;
  };

  // Fix skip: always send valid question object
  const skipQuestion = async () => {
    const validQuestion = getValidQuestion();
    if (!validQuestion) {
      setSkipError('Cannot skip: Invalid question data.');
      return;
    }
    try {
      setIsProcessing(true);
      setSkipError(null);
      setSkippedQuestions(prev => [...prev, questionIndex]);
      
      // Stop recording if active before skipping or auto-submitting
      if (isRecording) {
        speechRecognitionService.cancel();
        setIsRecording(false);
      }
      
      // Auto-submit code/transcript if present before skipping
      const codeTrimmed = code ? code.trim() : '';
      const transcriptTrimmed = transcript ? transcript.trim() : '';
      if (codeTrimmed || transcriptTrimmed) {
        await submitAnswer({ code: codeTrimmed, transcript: transcriptTrimmed });
        return; // Prevent double-advance: if we submitted, do not run skip logic
      }
      const payload = {
        answer: '',
        question: validQuestion, // always send valid object
        interviewCode,
        code: '',
        skipped: true
      };
      console.log('Skip payload:', payload); // <-- Debug log
      const response = await api.post('/interviews/evaluate-answer', payload);
      if (response.data.isComplete && response.data.evaluation) {
        const newAnswer = {
          question: validQuestion,
          answer: '',
          code: '',
          evaluation: response.data.lastAnswerEvaluation || response.data.evaluation,
          questionNumber: questionIndex + 1
        };
        setAnswers(prev => [...prev, newAnswer]);
        setFinalEvaluation(response.data.evaluation);
        setIsComplete(true);
        return;
      }
      const { evaluation, nextQuestion } = response.data;
      const newAnswer = {
        question: validQuestion,
        answer: '',
        code: '',
        evaluation,
        questionNumber: questionIndex + 1
      };
      setAnswers(prev => [...prev, newAnswer]);
      setFeedback(evaluation);
      if (nextQuestion) {
        setQuestionIndex(prev => prev + 1);
        setCurrentQuestion(nextQuestion);
        setTranscript('');
        setInterimTranscript('');
        setCode('');
        setFeedback(null);
      }
    } catch (error) {
      console.error('Error skipping question:', error);
      setSkipError('Failed to skip question. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle question type change
  const handleQuestionTypeChange = (questionType) => {
    setSelectedQuestionType(questionType);
    console.log('Question type changed to:', questionType);
  };

  // Implement exact same monitoring logic as FullscreenPause
  useEffect(() => {
    // Only clear sessionStorage if this is a completely new interview session
    if (!sessionStorage.getItem('interviewStarted')) {
      sessionStorage.setItem('interviewStarted', 'true');
      // Don't clear the counters - let them persist across screens
      // sessionStorage.removeItem('pauseSuspiciousActivityCount');
      // sessionStorage.removeItem('pauseAppSwitchCount');
    }
    
    // Load existing values from sessionStorage to ensure we don't reset
    const existingSuspicious = sessionStorage.getItem('pauseSuspiciousActivityCount');
    const existingAppSwitch = sessionStorage.getItem('pauseAppSwitchCount');
    
    if (existingSuspicious && parseInt(existingSuspicious) !== sharedSuspiciousActivityCount) {
      setSharedSuspiciousActivityCount(parseInt(existingSuspicious));
    }
    if (existingAppSwitch && parseInt(existingAppSwitch) !== sharedAppSwitchCount) {
      setSharedAppSwitchCount(parseInt(existingAppSwitch));
    }

    // Set monitoring as active
    setIsMonitoringActive(true);
    
    // Enhanced application switching detection (exact same as FullscreenPause)
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

    // incrementCountsOnce should NOT be called from click/mouse/keyboard events in fullscreen
    const incrementCountsOnce = (logMessage, eventSource) => {
      if (!recentlyIncrementedRef.current && !focusLossIncrementedRef.current) {
        console.log('[SUSPICIOUS COUNT INCREMENT]', { logMessage, eventSource });
        setSharedSuspiciousActivityCount(prev => {
          const newValue = prev + 1;
          sessionStorage.setItem('pauseSuspiciousActivityCount', newValue.toString());
          return newValue;
        });
        setSharedAppSwitchCount(prev => {
          const newValue = prev + 1;
          sessionStorage.setItem('pauseAppSwitchCount', newValue.toString());
          return newValue;
        });
        if (logMessage) addSuspiciousLog(logMessage);
        recentlyIncrementedRef.current = true;
        focusLossIncrementedRef.current = true;
        setTimeout(() => { recentlyIncrementedRef.current = false; }, 500);
      }
    };

    // Only call incrementCountsOnce from these event handlers:
    // - handleVisibilityChange (when document.hidden && isCurrentlyFullscreen)
    // - handleFocusChange (when !document.hasFocus() && isCurrentlyFullscreen)
    // - handleBlur (when isCurrentlyFullscreen)
    // Do NOT call incrementCountsOnce from click/mouse/keyboard events in fullscreen

    // Only these events should call incrementCountsOnce:
    // - visibilitychange (when document.hidden)
    // - window blur (when not focused)
    // - window focus loss
    // - clipboard change (optional)
    // - rapid window state changes
    // - overlay detection (if implemented)

    // Remove any click/mousedown/mouseup event listeners that call incrementCountsOnce
    // (If any such listeners exist, remove them here)

    const handleVisibilityChange = () => {
      if (document.hidden && isCurrentlyFullscreen && !focusLossIncrementedRef.current) {
        console.log('🚨 SUSPICIOUS: User switched tabs or applications during interview');
        isCurrentlyActive = false;
        suspiciousActivityDetected = true;
        consecutiveSuspiciousChecks++;
        incrementCountsOnce('Tab switch detected via visibilitychange (document.hidden)', 'visibilitychange');
      } else if (!document.hidden) {
        isCurrentlyActive = true;
        updateActivity();
        focusLossIncrementedRef.current = false; // Reset on focus regain
      }
    };

    const handleFocusChange = () => {
      if (!document.hasFocus() && isCurrentlyFullscreen) {
        console.log('🚨 SUSPICIOUS: User switched to another application during interview');
        isCurrentlyActive = false;
        suspiciousActivityDetected = true;
        consecutiveSuspiciousChecks++;
        incrementCountsOnce('App switch detected via focus change (window lost focus)', 'focuschange');
      } else if (document.hasFocus()) {
        isCurrentlyActive = true;
        updateActivity();
        focusLossIncrementedRef.current = false; // Reset on focus regain
      }
    };

    const handleBlur = () => {
      if (isCurrentlyFullscreen && !document.hasFocus() && !focusLossIncrementedRef.current) {
        console.log('🚨 SUSPICIOUS: Window lost focus during interview (actual app/tab switch)');
        isCurrentlyActive = false;
        suspiciousActivityDetected = true;
        consecutiveSuspiciousChecks++;
        incrementCountsOnce('App switch detected via blur event', 'blur');
      }
    };

    const handleFocus = () => {
      isCurrentlyActive = true;
      updateActivity();
      focusLossIncrementedRef.current = false; // Reset on focus regain
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
        // NEVER increment suspicious count for mouse move in fullscreen
      }
    };

    // Ultra-aggressive keyboard monitoring (make less aggressive)
    const handleKeyPress = (event) => {
      if (isCurrentlyActive) {
        updateActivity();
        keyboardActivityCount++;
        // Make thresholds higher and never increment for normal typing in fullscreen
        if (!isCurrentlyFullscreen) {
          if (keyboardActivityCount > 10 && Date.now() - lastActiveTime < 3000) {
            console.log('🚨 SUSPICIOUS: High keyboard activity detected - possible messaging app');
            suspiciousActivityDetected = true;
            consecutiveSuspiciousChecks++;
            incrementCountsOnce('High keyboard activity', 'keyboard');
          }
          if (keyboardActivityCount > 40) {
            console.log('🚨 SUSPICIOUS: Excessive keyboard activity - possible external app');
            suspiciousActivityDetected = true;
            consecutiveSuspiciousChecks++;
            incrementCountsOnce('Excessive keyboard activity', 'keyboard');
          }
        }
      }
    };

    // Monitor clipboard changes
    const handleClipboardChange = () => {
      if (isCurrentlyFullscreen) {
        console.log('🚨 SUSPICIOUS: Clipboard changed - possible app switching');
        suspiciousActivityDetected = true;
        consecutiveSuspiciousChecks++;
        incrementCountsOnce('Clipboard change detected (possible app switch)', 'clipboardchange');
      }
    };

    // Detect rapid window state changes
    let windowStateChanges = 0;
    const handleWindowStateChange = () => {
      if (isCurrentlyFullscreen) {
        windowStateChanges++;
        if (windowStateChanges > 2) {
          console.log('🚨 SUSPICIOUS: Multiple window state changes detected');
          suspiciousActivityDetected = true;
          consecutiveSuspiciousChecks++;
          incrementCountsOnce('Window state change detected (possible app switch)', 'windowstatechange');
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
      if (timeSinceLastActivity > 10000 && isCurrentlyFullscreen && !document.hasFocus()) {
        console.log('🚨 SUSPICIOUS: User appears inactive - possible overlay application');
        suspiciousActivityDetected = true;
        consecutiveSuspiciousChecks++;
        incrementCountsOnce('Inactivity in fullscreen', 'interval');
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
      if (isCurrentlyFullscreen) {
        console.log('🚨 SUSPICIOUS: Window resized - possible overlay application');
        suspiciousActivityDetected = true;
        consecutiveSuspiciousChecks++;
        incrementCountsOnce('Window state change detected (possible app switch)', 'resize');
      }
    };

    // Monitor for selection changes
    const handleSelectionChange = () => {
      if (isCurrentlyFullscreen) {
        const selection = document.getSelection();
        if (selection && !selection.isCollapsed) {
          // Only increment if actual text is selected
          console.log('🚨 SUSPICIOUS: Text selection changed - possible app switching');
          suspiciousActivityDetected = true;
          consecutiveSuspiciousChecks++;
          incrementCountsOnce('Selection change detected (possible app switch)', 'selectionchange');
        }
      }
    };

    // Monitor for context menu (common when switching apps)
    const handleContextMenu = () => {
      if (isCurrentlyFullscreen) {
        console.log('🚨 SUSPICIOUS: Context menu opened - possible app switching');
        suspiciousActivityDetected = true;
        consecutiveSuspiciousChecks++;
        incrementCountsOnce('Context menu opened (possible app switch)', 'contextmenu');
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
    
    // Try to monitor clipboard
    try {
      navigator.clipboard.addEventListener('clipboardchange', handleClipboardChange);
    } catch (e) {
      console.log('Clipboard monitoring not available');
    }

    // --- Disable copy/cut/paste in fullscreen ---
    const preventCopyCutPaste = (e) => {
      if (isCurrentlyFullscreen) {
        e.preventDefault();
        if (e.type === 'copy') {
          alert('Copy is disabled during the interview.');
        }
      }
    };
    document.addEventListener('copy', preventCopyCutPaste);
    document.addEventListener('cut', preventCopyCutPaste);
    document.addEventListener('paste', preventCopyCutPaste);
    // -------------------------------------------

    // --- Prevent text selection in fullscreen ---
    const preventTextSelection = (e) => {
      if (isCurrentlyFullscreen) {
        e.preventDefault();
        // Show notification (only one at a time)
        if (!document.getElementById('no-select-notification')) {
          const notification = document.createElement('div');
          notification.id = 'no-select-notification';
          notification.className = 'fullscreen-required-notification';
          notification.innerHTML = `
            <div class="notification-content">
              <span class="notification-icon">🚫</span>
              <span class="notification-text">You can't select text during the interview.</span>
            </div>
          `;
          notification.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
            color: white;
            padding: 1rem 1.5rem;
            border-radius: 12px;
            box-shadow: 0 8px 25px rgba(239, 68, 68, 0.4);
            z-index: 10001;
            font-family: inherit;
            font-weight: 700;
            animation: slideInUp 0.3s ease;
            border: 2px solid rgba(255, 255, 255, 0.2);
            min-width: 200px;
            text-align: center;
          `;
          document.body.appendChild(notification);
          setTimeout(() => {
            if (notification.parentElement) {
              notification.remove();
            }
          }, 2000);
        }
      }
    };
    document.addEventListener('selectstart', preventTextSelection);
    // -------------------------------------------

    // Sync with sessionStorage every second to ensure consistency
    const syncInterval = setInterval(() => {
      const storedSuspicious = sessionStorage.getItem('pauseSuspiciousActivityCount');
      const storedAppSwitch = sessionStorage.getItem('pauseAppSwitchCount');
      
      if (storedSuspicious) {
        const currentValue = parseInt(storedSuspicious);
        if (currentValue !== sharedSuspiciousActivityCount) {
          console.log('Syncing suspicious activity count:', sharedSuspiciousActivityCount, '->', currentValue);
          setSharedSuspiciousActivityCount(currentValue);
        }
      }
      
      if (storedAppSwitch) {
        const currentValue = parseInt(storedAppSwitch);
        if (currentValue !== sharedAppSwitchCount) {
          console.log('Syncing app switch count:', sharedAppSwitchCount, '->', currentValue);
          setSharedAppSwitchCount(currentValue);
        }
      }
    }, 500); // Sync more frequently to prevent resets

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
      // Remove copy/cut/paste prevention
      document.removeEventListener('copy', preventCopyCutPaste);
      document.removeEventListener('cut', preventCopyCutPaste);
      document.removeEventListener('paste', preventCopyCutPaste);
      // Remove text selection prevention
      document.removeEventListener('selectstart', preventTextSelection);
      try {
        navigator.clipboard.removeEventListener('clipboardchange', handleClipboardChange);
      } catch (e) {
        // Ignore cleanup errors
      }
      clearInterval(checkActivity);
      clearInterval(syncInterval);
      // Clean up session when component unmounts
      sessionStorage.removeItem('interviewStarted');
    };
  }, [isCurrentlyFullscreen, sharedSuspiciousActivityCount, sharedAppSwitchCount]);

  // On mount and on resume from pause, always re-sync counts from sessionStorage
  useEffect(() => {
    const syncCounts = () => {
      setSharedSuspiciousActivityCount(getStoredCount('pauseSuspiciousActivityCount'));
      setSharedAppSwitchCount(getStoredCount('pauseAppSwitchCount'));
    };
    syncCounts();
  }, []);
  useEffect(() => {
    if (!isFullscreenPaused && isFullscreenEntered) {
      setSharedSuspiciousActivityCount(getStoredCount('pauseSuspiciousActivityCount'));
      setSharedAppSwitchCount(getStoredCount('pauseAppSwitchCount'));
    }
  }, [isFullscreenPaused, isFullscreenEntered]);

  // Rehydrate state from sessionStorage when resuming from pause
  useEffect(() => {
    if (!isFullscreenPaused && isFullscreenEntered) {
      // We just resumed from pause, rehydrate state from sessionStorage
      const restored = restoreState(interviewCode);
      if (restored) {
        setCurrentQuestion(restored.currentQuestion || null);
        setQuestions(restored.questions || []);
        setQuestionIndex(restored.questionIndex || 0);
        setAnswers(restored.answers || []);
        setSkippedQuestions(restored.skippedQuestions || []);
        setIsFollowUpQuestion(restored.isFollowUpQuestion || false);
        setFollowUpCount(restored.followUpCount || 0);
      }
    }
    // Only run when resuming from pause
    // eslint-disable-next-line
  }, [isFullscreenPaused, isFullscreenEntered]);

  // Rehydrate suspicious/app switch counts from sessionStorage when resuming from pause
  useEffect(() => {
    if (!isFullscreenPaused && isFullscreenEntered) {
      const storedSuspicious = sessionStorage.getItem('pauseSuspiciousActivityCount');
      const storedAppSwitch = sessionStorage.getItem('pauseAppSwitchCount');
      if (storedSuspicious !== null) setSharedSuspiciousActivityCount(parseInt(storedSuspicious));
      if (storedAppSwitch !== null) setSharedAppSwitchCount(parseInt(storedAppSwitch));
    }
  }, [isFullscreenPaused, isFullscreenEntered]);

  // Always sync suspicious/app switch counts to sessionStorage
  useEffect(() => {
    sessionStorage.setItem('pauseSuspiciousActivityCount', sharedSuspiciousActivityCount.toString());
  }, [sharedSuspiciousActivityCount]);
  useEffect(() => {
    sessionStorage.setItem('pauseAppSwitchCount', sharedAppSwitchCount.toString());
  }, [sharedAppSwitchCount]);

  // Monitor fullscreen exit
  useEffect(() => {
    const handleFullscreenChange = () => {
      const fullscreenElement = document.fullscreenElement || 
                               document.webkitFullscreenElement || 
                               document.mozFullScreenElement || 
                               document.msFullscreenElement;
      
      // Update current fullscreen status
      setIsCurrentlyFullscreen(!!fullscreenElement);
      
      if (!fullscreenElement && isFullscreenEntered) {
        // Fullscreen was exited during interview
        console.log('Fullscreen exited during interview');
        setIsFullscreenPaused(true);
        
        // Stop recording if active
        if (isRecording) {
          speechRecognitionService.stopRecording();
          setIsRecording(false);
        }
        
        // Show warning
        const warningDiv = document.createElement('div');
        warningDiv.className = 'fullscreen-exit-warning';
        warningDiv.innerHTML = `
          <div class="warning-content">
            <span class="warning-icon">🚫</span>
            <span class="warning-text"><strong>INTERVIEW BLOCKED!</strong> Fullscreen mode is MANDATORY to continue.</span>
          </div>
        `;
        
        warningDiv.style.cssText = `
          position: fixed;
          top: 20px;
          right: 20px;
          background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
          color: white;
          padding: 16px 20px;
          border-radius: 12px;
          box-shadow: 0 8px 25px rgba(239, 68, 68, 0.4);
          z-index: 10000;
          font-family: inherit;
          font-weight: 700;
          animation: slideIn 0.3s ease;
          max-width: 450px;
          border: 2px solid rgba(255, 255, 255, 0.2);
        `;
        
        document.body.appendChild(warningDiv);
        
        // Auto-remove after 8 seconds
        setTimeout(() => {
          if (warningDiv.parentElement) {
            warningDiv.remove();
          }
        }, 8000);
      } else if (fullscreenElement && isFullscreenPaused) {
        // Fullscreen was re-entered
        console.log('Fullscreen re-entered, resuming interview');
        setIsFullscreenPaused(false);
        setIsCurrentlyFullscreen(true);
        // Don't reset counters - keep accumulated values
      } else if (fullscreenElement && !isCurrentlyFullscreen) {
        // Fullscreen was entered but we weren't tracking it
        console.log('Fullscreen detected but not paused, updating status');
        setIsCurrentlyFullscreen(true);
        // Don't reset counters - keep accumulated values
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
  }, [isFullscreenEntered]);

  // Fallback: Check fullscreen status periodically when paused
  useEffect(() => {
    if (isFullscreenPaused) {
      const interval = setInterval(() => {
        const fullscreenElement = document.fullscreenElement || 
                                 document.webkitFullscreenElement || 
                                 document.mozFullScreenElement || 
                                 document.msFullscreenElement;
        
        if (fullscreenElement && isFullscreenPaused) {
          console.log('Fallback: Fullscreen detected while paused, resuming interview');
          setIsFullscreenPaused(false);
          setIsCurrentlyFullscreen(true);
        }
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [isFullscreenPaused]);

  // Handle activity reporting
  const handleActivityReport = async (reportData) => {
    try {
      console.log('Reporting suspicious activity:', reportData);
      
      // Send report to backend
      await api.post('/interviews/report-activity', {
        interviewCode,
        reportData
      });
      
      console.log('Activity report sent successfully');
    } catch (error) {
      console.error('Error reporting activity:', error);
    }
  };

  // Handle fullscreen entry
  const handleFullscreenEntered = () => {
    console.log('handleFullscreenEntered called');
    setIsFullscreenEntered(true);
    setIsCurrentlyFullscreen(true);
    console.log('Fullscreen mode entered - states updated');
  };

  // Handle fullscreen resume
  const handleFullscreenResumed = () => {
    console.log('handleFullscreenResumed called');
    setIsFullscreenPaused(false);
    setIsCurrentlyFullscreen(true);
    
    // Ensure counters are preserved by re-syncing with sessionStorage
    const storedSuspicious = sessionStorage.getItem('pauseSuspiciousActivityCount');
    const storedAppSwitch = sessionStorage.getItem('pauseAppSwitchCount');
    
    if (storedSuspicious) {
      const currentValue = parseInt(storedSuspicious);
      if (currentValue !== sharedSuspiciousActivityCount) {
        console.log('Resume: Syncing suspicious activity count:', sharedSuspiciousActivityCount, '->', currentValue);
        setSharedSuspiciousActivityCount(currentValue);
      }
    }
    
    if (storedAppSwitch) {
      const currentValue = parseInt(storedAppSwitch);
      if (currentValue !== sharedAppSwitchCount) {
        console.log('Resume: Syncing app switch count:', sharedAppSwitchCount, '->', currentValue);
        setSharedAppSwitchCount(currentValue);
      }
    }
    
    console.log('Interview resumed after fullscreen re-entry - states updated');
  };

  // Handle disabled button clicks
  const handleDisabledButtonClick = (buttonType) => {
    if (!isCurrentlyFullscreen) {
      // Show notification
      const notification = document.createElement('div');
      notification.className = 'fullscreen-required-notification';
      notification.innerHTML = `
        <div class="notification-content">
          <span class="notification-icon">🚫</span>
          <span class="notification-text">Fullscreen first!</span>
        </div>
      `;
      
      notification.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 12px;
        box-shadow: 0 8px 25px rgba(239, 68, 68, 0.4);
        z-index: 10001;
        font-family: inherit;
        font-weight: 700;
        animation: slideInUp 0.3s ease;
        border: 2px solid rgba(255, 255, 255, 0.2);
        min-width: 200px;
        text-align: center;
      `;
      
      document.body.appendChild(notification);
      
      // Auto-remove after 3 seconds
      setTimeout(() => {
        if (notification.parentElement) {
          notification.remove();
        }
      }, 3000);
      
      console.log(`Button ${buttonType} clicked while not in fullscreen`);
    }
  };

  // Save completion for company-driven interviews
  useEffect(() => {
    const saveCompletion = async () => {
      if (isComplete && finalEvaluation && !props.isMock && !hasSavedCompletion) {
        // Try to get interviewId and candidateCode from props, state, or storage
        const interviewId = props.interviewId || location.state?.interviewId || sessionStorage.getItem('interviewId');
        const candidateCode = props.candidateCode || location.state?.candidateCode || sessionStorage.getItem('candidateCode');
        
        console.log('Saving interview completion:', { interviewId, candidateCode, answers, finalEvaluation });
        
        if (interviewId && candidateCode) {
          try {
            // Call the /end endpoint to mark candidate as completed and save results
            await api.post(`/interviews/end`, { 
              interviewId, 
              candidateCode,
              finalEvaluation,
              answers,
              suspiciousActivityLogs,
              appSwitchCount: sharedAppSwitchCount
            });
            setHasSavedCompletion(true);
          } catch (err) {
            console.error('Failed to save interview completion:', err);
            setHasSavedCompletion(true); // Still allow completion message
          }
        } else {
          console.warn('Missing interviewId or candidateCode for completion:', { interviewId, candidateCode });
          setHasSavedCompletion(true); // Fallback
        }
      }
    };
    
    saveCompletion();
  }, [isComplete, finalEvaluation, props.isMock, hasSavedCompletion, props.interviewData, location.state, answers, suspiciousActivityLogs, sharedAppSwitchCount]);

  const [showLogsModal, setShowLogsModal] = useState(false);

  // Show fullscreen gate if not yet entered
  console.log('InterviewScreen render - isFullscreenEntered:', isFullscreenEntered, 'isFullscreenPaused:', isFullscreenPaused);
  
  if (!isFullscreenEntered) {
    console.log('Showing FullscreenGate');
    return (
      <FullscreenGate onFullscreenEntered={handleFullscreenEntered} />
    );
  }

  // Show fullscreen pause if interview is paused
  if (isFullscreenPaused) {
    console.log('Showing FullscreenPause');
    return (
      <FullscreenPause 
        onFullscreenResumed={handleFullscreenResumed}
        currentQuestion={currentQuestion}
        questionIndex={questionIndex}
        totalQuestions={totalQuestions}
      />
    );
  }

  if (isLoading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <h2>Loading Interview...</h2>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-container">
        <h2>Error</h2>
        <p>{error}</p>
      </div>
    );
  }

  if (isComplete && finalEvaluation) {
    return (
      <div>
        <FinalEvaluation evaluation={finalEvaluation} answers={answers} />
        {/* The FinalEvaluation component already renders the action buttons at the end. Render the Security Monitoring Summary after it. */}
        <div style={{ maxWidth: 800, margin: '2rem auto', background: '#f8fafc', borderRadius: 12, boxShadow: '0 2px 8px #c7d2fe22', padding: '1.5rem 2rem', marginTop: 32 }}>
          <h3 style={{ color: '#dc2626', fontWeight: 800, marginBottom: 12 }}>Security Monitoring Summary</h3>
          <div style={{ marginBottom: 12 }}>
            <strong>Suspicious Activities:</strong> {sharedSuspiciousActivityCount}<br />
            <strong>Tab/App Switches:</strong> {sharedAppSwitchCount}
          </div>
          <div style={{ maxHeight: 200, overflowY: 'auto', background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: 12, marginBottom: 16 }}>
            <strong>Suspicious Activity Logs:</strong>
            <ul style={{ fontSize: '0.98rem', color: '#334155', margin: 0, paddingLeft: 18 }}>
              {suspiciousActivityLogs.length === 0 ? <li>No suspicious activity detected.</li> : suspiciousActivityLogs.map((log, idx) => (
                <li key={idx}><span style={{ color: '#64748b' }}>{log.time}:</span> {log.message}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    );
  }

  // Main interview layout
  console.log('Showing main interview layout');
  const hasQuestion = currentQuestion && (currentQuestion.question || currentQuestion.text);
  const isCodeQuestion = currentQuestion && (
    /sql|query|code|program|function|algorithm|cpp|java|python|javascript/i.test(currentQuestion.question || currentQuestion.text)
  );
  return (
    <div style={{ background: '#f8fafc', minHeight: '100vh' }}>
      {/* Background Effects */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'url("data:image/svg+xml,<svg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 100 100\'><defs><pattern id=\'grain\' width=\'100\' height=\'100\' patternUnits=\'userSpaceOnUse\'><circle cx=\'50\' cy=\'50\' r=\'1\' fill=\'rgba(255,255,255,0.1)\'/></pattern></defs><rect width=\'100\' height=\'100\' fill=\'url(%23grain)\'/></svg>")',
        opacity: 0.3,
        pointerEvents: 'none',
        zIndex: -2
      }}></div>
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: `
          radial-gradient(circle at 20% 80%, rgba(255,255,255,0.1) 0%, transparent 50%),
          radial-gradient(circle at 80% 20%, rgba(255,255,255,0.1) 0%, transparent 50%),
          radial-gradient(circle at 40% 40%, rgba(255,255,255,0.05) 0%, transparent 50%)
        `,
        animation: 'float 20s ease-in-out infinite',
        pointerEvents: 'none',
        zIndex: -2
      }}></div>
      {/* App Bar */}
      
      {/* Fullscreen Warning Banner */}
      {!isCurrentlyFullscreen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
          color: 'white',
          padding: '0.75rem 1rem',
          textAlign: 'center',
          fontWeight: '700',
          fontSize: '1rem',
          zIndex: 1000,
          boxShadow: '0 4px 12px rgba(239, 68, 68, 0.4)',
          animation: 'pulse 2s infinite'
        }}>
          🚫 FULLSCREEN REQUIRED - All interview functions are disabled until you enter fullscreen mode
        </div>
      )}
      
      {/* Main Content */}
      <main
        className="interview-main-card"
        style={{
          marginTop: 32,
          width: '100%',
          maxWidth: 1300,
          minHeight: 600,
          margin: '0 auto',
          background: 'white',
          borderRadius: 24,
          boxShadow: '0 8px 40px rgba(30,41,59,0.13)',
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'stretch',
          gap: 0,
          animation: 'fadeIn 0.8s',
          overflow: 'hidden',
          position: 'relative',
          transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
          opacity: !isCurrentlyFullscreen ? 0.7 : 1,
          filter: !isCurrentlyFullscreen ? 'grayscale(0.3)' : 'none',
        }}
      >
        {/* Left Panel: Question/Answer */}
        <div style={{
          flex: 1.2,
          minWidth: 220,
          maxWidth: 480,
          padding: '1.5rem 1.2rem 1.2rem 1.2rem',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'stretch',
          background: 'transparent',
        }}>
            {/* Title & Progress */}
            <div style={{ marginBottom: 18 }}>
              <h2 style={{ fontWeight: 900, fontSize: '2.1rem', color: '#1e293b', margin: 0, letterSpacing: '-1px' }}>Technical Interview</h2>
              <div style={{ color: '#64748b', fontSize: '1.1rem', marginTop: 6, marginBottom: 18 }}>Question {questionIndex + 1} of {totalQuestions}</div>
              {/* Progress Circles */}
              <div className="progress-circles-horizontal" style={{ display: 'flex', flexDirection: 'row', justifyContent: 'flex-start', alignItems: 'center', gap: 18, marginBottom: 32 }}>
                {Array.from({ length: totalQuestions }).map((_, idx) => {
                  let status = '';
                  if (idx < answers.length) {
                    status = answers[idx].answer === '' ? 'skipped' : 'done';
                  } else if (idx === questionIndex) {
                    status = 'current';
                  }
                  return (
                    <div key={idx} aria-label={`Question ${idx + 1} ${status}`} className={`progress-dot ${status}`} style={{ width: 38, height: 38, borderRadius: '50%', background: status === 'done' ? 'linear-gradient(135deg,#22c55e 60%,#a7f3d0 100%)' : status === 'skipped' ? 'linear-gradient(135deg,#f59e42 60%,#fde68a 100%)' : status === 'current' ? 'linear-gradient(135deg,#3b82f6 60%,#a5b4fc 100%)' : '#e5e7eb', color: status === 'current' ? '#fff' : '#222', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 22, border: status === 'current' ? '3px solid #3b82f6' : '3px solid #e5e7eb', boxShadow: status === 'current' ? '0 0 0 3px #dbeafe' : 'none', transition: 'all 0.2s', position: 'relative' }}>
                  {status === 'done' ? <span style={{ fontSize: 20, color: '#fff' }}>&#10003;</span> : status === 'current' ? <span style={{ fontSize: 20, color: '#fff' }}>&#8594;</span> : idx + 1}
                </div>
              );
            })}
              </div>
            </div>
            {hasQuestion ? (
              <>
                {/* Follow-up Question Indicator */}
                {isFollowUpQuestion && (
                  <div style={{
                    background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
                    color: '#fff',
                    padding: '8px 16px',
                    borderRadius: '20px',
                    fontSize: '0.9rem',
                    fontWeight: 600,
                    marginBottom: 16,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    boxShadow: '0 4px 12px rgba(251, 191, 36, 0.3)'
                  }}>
                    <span style={{ fontSize: '1.1rem' }}>🔄</span>
                    Follow-up Question {followUpCount > 0 ? `(${followUpCount})` : ''}
                  </div>
                )}
                <h2 className="question-text" style={{ fontSize: '1.35rem', fontWeight: 800, color: '#1e293b', marginBottom: 12 }}>{currentQuestion.question || currentQuestion.text}</h2>
                <div className="question-meta" style={{ marginBottom: 10 }}>
                  {currentQuestion.topic && <span className="topic-badge">{currentQuestion.topic}</span>}
                  {currentQuestion.difficulty && <span className="difficulty-badge">{currentQuestion.difficulty}</span>}
                  {currentQuestion.duration && <span className="duration-text">{currentQuestion.duration} sec</span>}
                  {isFollowUpQuestion && <span className="follow-up-badge" style={{
                    background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
                    color: '#fff',
                    padding: '4px 12px',
                    borderRadius: '12px',
                    fontSize: '0.8rem',
                    fontWeight: 600
                  }}>Follow-up</span>}
                </div>
                {/* Suspicious Activity Monitor - Advanced Modern Look */}
                <div
                  className="security-monitor-card"
                  style={{
                    marginBottom: '1.5rem',
                    padding: '1.3rem 1.2rem 1.1rem 1.2rem',
                    background: 'rgba(255,255,255,0.35)',
                    backdropFilter: 'blur(10px)',
                    border: '2.5px solid rgba(59,130,246,0.18)',
                    borderRadius: '18px',
                    boxShadow: '0 8px 32px rgba(30,64,175,0.10)',
                    position: 'relative',
                    minHeight: 120,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.7rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: 28, color: '#2563eb', filter: 'drop-shadow(0 2px 6px #3b82f655)' }}>🛡️</span>
                      <span style={{ fontWeight: 800, fontSize: '1.18rem', color: '#1e293b', letterSpacing: '0.2px' }}>Security Monitoring</span>
                      <span
                        style={{
                          marginLeft: 10,
                          fontSize: 13,
                          color: '#64748b',
                          background: 'rgba(59,130,246,0.08)',
                          borderRadius: 8,
                          padding: '2px 10px',
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                        title="We monitor for suspicious activity, app switches, and more."
                      >ℹ️</span>
                      <button
                        style={{
                          marginLeft: 12,
                          fontSize: 13,
                          color: '#2563eb',
                          background: 'rgba(59,130,246,0.10)',
                          border: '1.5px solid #2563eb33',
                          borderRadius: 8,
                          padding: '2px 14px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          transition: 'background 0.2s',
                          boxShadow: '0 1px 4px #a5b4fc22',
                        }}
                        onClick={() => setShowLogsModal(true)}
                        aria-label="Show suspicious logs"
                      >
                        Logs
                      </button>
                    </div>
                    {/* Status badge */}
                    <span
                      style={{
                        fontWeight: 700,
                        fontSize: 14,
                        color: sharedSuspiciousActivityCount === 0 && sharedAppSwitchCount === 0 ? '#16a34a' : (sharedSuspiciousActivityCount < 3 && sharedAppSwitchCount < 3 ? '#f59e42' : '#dc2626'),
                        background: sharedSuspiciousActivityCount === 0 && sharedAppSwitchCount === 0 ? 'rgba(16,185,129,0.13)' : (sharedSuspiciousActivityCount < 3 && sharedAppSwitchCount < 3 ? 'rgba(251,191,36,0.13)' : 'rgba(239,68,68,0.13)'),
                        borderRadius: 8,
                        padding: '2.5px 14px',
                        marginLeft: 8,
                        letterSpacing: '0.5px',
                        boxShadow: '0 1px 4px #a5b4fc22',
                      }}
                    >
                      {sharedSuspiciousActivityCount === 0 && sharedAppSwitchCount === 0
                        ? 'All Clear'
                        : (sharedSuspiciousActivityCount < 3 && sharedAppSwitchCount < 3 ? 'Warning' : 'Critical')}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 24, marginBottom: 2 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                      <span style={{ fontSize: 13, color: '#64748b', fontWeight: 600 }}>Suspicious</span>
                      <span className={`badge badge-suspicious`} style={{
                        fontWeight: 800,
                        fontSize: 20,
                        color: sharedSuspiciousActivityCount === 0 ? '#16a34a' : (sharedSuspiciousActivityCount < 3 ? '#f59e42' : '#dc2626'),
                        background: sharedSuspiciousActivityCount === 0 ? 'rgba(16,185,129,0.13)' : (sharedSuspiciousActivityCount < 3 ? 'rgba(251,191,36,0.13)' : 'rgba(239,68,68,0.13)'),
                        borderRadius: 8,
                        padding: '2px 18px',
                        minWidth: 36,
                        textAlign: 'center',
                        boxShadow: '0 1px 4px #a5b4fc22',
                      }}>{sharedSuspiciousActivityCount}</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                      <span style={{ fontSize: 13, color: '#64748b', fontWeight: 600 }}>App Switches</span>
                      <span className={`badge badge-appswitch`} style={{
                        fontWeight: 800,
                        fontSize: 20,
                        color: sharedAppSwitchCount === 0 ? '#16a34a' : (sharedAppSwitchCount < 3 ? '#f59e42' : '#dc2626'),
                        background: sharedAppSwitchCount === 0 ? 'rgba(16,185,129,0.13)' : (sharedAppSwitchCount < 3 ? 'rgba(251,191,36,0.13)' : 'rgba(239,68,68,0.13)'),
                        borderRadius: 8,
                        padding: '2px 18px',
                        minWidth: 36,
                        textAlign: 'center',
                        boxShadow: '0 1px 4px #a5b4fc22',
                      }}>{sharedAppSwitchCount}</span>
                    </div>
                    {/* Progress bar for suspicion level */}
                    <div style={{ flex: 1, minWidth: 120, marginLeft: 18, marginRight: 8 }}>
                      <div style={{ fontSize: 12, color: '#64748b', fontWeight: 600, marginBottom: 2 }}>Suspicion Level</div>
                      <div style={{ width: '100%', height: 13, background: '#e0e7ef', borderRadius: 8, overflow: 'hidden', boxShadow: '0 1px 4px #a5b4fc22' }}>
                        <div style={{
                          width: `${Math.min((sharedSuspiciousActivityCount + sharedAppSwitchCount) * 20, 100)}%`,
                          height: '100%',
                          background: sharedSuspiciousActivityCount + sharedAppSwitchCount === 0 ? 'linear-gradient(90deg,#16a34a 60%,#22d3ee 100%)' : (sharedSuspiciousActivityCount + sharedAppSwitchCount < 3 ? 'linear-gradient(90deg,#fbbf24 60%,#fde68a 100%)' : 'linear-gradient(90deg,#ef4444 60%,#fca5a5 100%)'),
                          borderRadius: 8,
                          transition: 'width 0.4s cubic-bezier(0.4,0,0.2,1)',
                        }} />
                      </div>
                    </div>
                  </div>
                  {/* Last suspicious event log */}
                  <div style={{ marginTop: 8, fontSize: 13, color: '#334155', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ color: '#2563eb', fontSize: 16 }}>📝</span>
                    <span style={{ color: '#64748b', fontWeight: 700 }}>Last Event:</span>
                    <span style={{ color: '#1e293b', fontWeight: 600 }}>
                      {suspiciousActivityLogs && suspiciousActivityLogs.length > 0
                        ? `${suspiciousActivityLogs[suspiciousActivityLogs.length - 1].message} (${suspiciousActivityLogs[suspiciousActivityLogs.length - 1].time})`
                        : 'No suspicious activity detected.'}
                    </span>
                  </div>
                </div>
                {/* Suspicious Logs Modal */}
                {showLogsModal && (
                  <div
                    style={{
                      position: 'fixed',
                      top: 0,
                      left: 0,
                      width: '100vw',
                      height: '100vh',
                      background: 'rgba(30,41,59,0.18)',
                      zIndex: 9999,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <div
                      style={{
                        background: 'rgba(255,255,255,0.98)',
                        borderRadius: 18,
                        boxShadow: '0 8px 32px rgba(30,64,175,0.18)',
                        minWidth: 340,
                        maxWidth: 420,
                        maxHeight: 480,
                        padding: '2.2rem 1.5rem 1.5rem 1.5rem',
                        overflowY: 'auto',
                        position: 'relative',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'flex-start',
                      }}
                    >
                      <button
                        onClick={() => setShowLogsModal(false)}
                        style={{
                          position: 'absolute',
                          top: 12,
                          right: 16,
                          background: 'none',
                          border: 'none',
                          color: '#dc2626',
                          fontSize: 22,
                          fontWeight: 900,
                          cursor: 'pointer',
                        }}
                        aria-label="Close logs modal"
                      >×</button>
                      <h3 style={{ fontWeight: 800, fontSize: '1.25rem', color: '#1e293b', marginBottom: 18, letterSpacing: '0.2px' }}>
                        Suspicious Activity Logs
                      </h3>
                      {suspiciousActivityLogs && suspiciousActivityLogs.length > 0 ? (
                        <ul style={{ listStyle: 'none', padding: 0, margin: 0, width: '100%' }}>
                          {suspiciousActivityLogs.slice().reverse().map((log, idx) => (
                            <li key={idx} style={{ marginBottom: 14, padding: '0.7rem 0.8rem', background: '#f1f5f9', borderRadius: 10, boxShadow: '0 1px 4px #a5b4fc11' }}>
                              <div style={{ fontWeight: 700, color: '#2563eb', fontSize: 13, marginBottom: 2 }}>{log.time}</div>
                              <div style={{ color: '#1e293b', fontWeight: 600, fontSize: 14 }}>{log.message}</div>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <div style={{ color: '#64748b', fontWeight: 600, fontSize: 15 }}>No suspicious activity detected.</div>
                      )}
                    </div>
                  </div>
                )}
                {/* Tech Question Types */}
                {!isFollowUpQuestion && (
                  <TechQuestionTypes 
                    currentQuestion={currentQuestion}
                    onQuestionTypeChange={handleQuestionTypeChange}
                  />
                )}
              </>
            ) : (
              <div className="question-error">
                <h2>No questions available.</h2>
                <p>Please contact support or try again later.</p>
              </div>
            )}
            {/* Remove control buttons from here */}
            {/* Controls always at the bottom, sticky if needed */}
            {/* <div className="control-buttons sticky-controls" style={{ ... }}> ... </div> */}
            {/* Error messages for recording/skip will be moved to right panel */}
          </div>
          {/* Divider */}
          <div style={{ width: 2, minHeight: '100%', background: 'linear-gradient(180deg,#e0e7ef 0%,#c7d2fe 100%)', borderRadius: 2, boxShadow: '0 0 8px #c7d2fe44', alignSelf: 'stretch' }}></div>
          {/* Right Panel: Webcam & Transcript & Controls & Code Editor */}
          <div style={{
            flex: 1.1,
            minWidth: 420,
            maxWidth: 520,
            padding: '2.2rem 1.5rem 1.5rem 1.5rem',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            background: 'transparent',
          }}>
            {/* Face detection warning above webcam */}
            {(faceStatus === 'No face detected' || faceStatus === 'More than 1 person detected') && (
              <div style={{
                width: 400,
                margin: '0 auto 18px auto',
                background: '#fff6f6',
                color: '#dc2626',
                border: '2px solid #ef4444',
                borderRadius: 10,
                fontWeight: 700,
                fontSize: '1.08rem',
                padding: '0.7rem 1.2rem',
                textAlign: 'center',
                boxShadow: '0 2px 12px rgba(220,38,38,0.08)',
                zIndex: 1000
              }}>
                {faceStatus === 'No face detected'
                  ? 'No face detected. Please ensure your face is visible in the frame.'
                  : 'Warning: More than one person detected. Only one person should be in the frame.'}
              </div>
            )}
            <WebcamFeed onFaceStatusChange={setFaceStatus} />
            {/* Transcript Area as chat bubble */}
            <div style={{ width: '100%', marginTop: 18, background: 'linear-gradient(135deg,#f8fafc 80%,#e0e7ef 100%)', borderRadius: 14, minHeight: 70, maxHeight: 140, overflowY: 'auto', padding: '0.8rem', color: '#334155', fontSize: '1.08rem', boxShadow: '0 2px 8px rgba(30,41,59,0.08)', border: '1.2px solid #c7d2fe', transition: 'box-shadow 0.2s', display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
              <span style={{ fontWeight: 700, fontSize: '1rem', color: '#2563eb', marginBottom: 4 }}>Transcript:</span>
              <span style={{ marginTop: 6, background: '#fff', borderRadius: 8, padding: '0.5rem 0.8rem', boxShadow: '0 1px 4px #c7d2fe22', color: '#334155', fontSize: '1.01rem', minWidth: 60 }}>{transcript || <span style={{ color: '#b6b6b6' }}>Your spoken answer will appear here.</span>}</span>
            </div>
            {/* Control Buttons moved below transcript */}
            <div className="control-buttons" style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 10,
              marginTop: 16,
              width: '100%',
              padding: 0,
              background: 'none',
              boxShadow: 'none',
              border: 'none',
            }}>
              <button 
                className={`record-button${isRecording ? ' recording' : ''}`} 
                style={{
                  width: '100%',
                  maxWidth: 260,
                  minHeight: 54,
                  padding: '0.9rem 0',
                  fontSize: '1.18rem',
                  borderRadius: 22,
                  marginBottom: 14,
                  boxShadow: '0 2px 8px rgba(16,185,129,0.13)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  letterSpacing: '0.5px',
                }}
                onClick={(e) => {
                  if (!isCurrentlyFullscreen) {
                    e.preventDefault();
                    handleDisabledButtonClick('record');
                  } else {
                    isRecording ? stopRecording() : startRecording();
                  }
                }} 
                disabled={isProcessing || !hasQuestion} 
                aria-label={isRecording ? 'Stop Recording' : 'Start Recording'}
                title={!isCurrentlyFullscreen ? 'Fullscreen required to record' : ''}
              >
                {isRecording ? 'Stop' : 'Record Audio'}
                {!isCurrentlyFullscreen && !isRecording && <span style={{ marginLeft: '4px', fontSize: '1.1rem' }}>🔒</span>}
              </button>
              <button 
                className="skip-button" 
                style={{
                  width: '100%',
                  maxWidth: 260,
                  minHeight: 54,
                  padding: '0.9rem 0',
                  fontSize: '1.18rem',
                  borderRadius: 22,
                  marginBottom: 0,
                  boxShadow: '0 2px 8px rgba(100,116,139,0.09)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  letterSpacing: '0.5px',
                }}
                onClick={(e) => {
                  if (!isCurrentlyFullscreen) {
                    e.preventDefault();
                    handleDisabledButtonClick('skip');
                  } else {
                    skipQuestion();
                  }
                }} 
                disabled={isProcessing || !hasQuestion} 
                aria-label="Skip this question"
                title={!isCurrentlyFullscreen ? 'Fullscreen required to skip' : ''}
              >
                Skip Question
                {!isCurrentlyFullscreen && <span style={{ marginLeft: '4px', fontSize: '1.1rem' }}>🔒</span>}
              </button>
            </div>
            {/* Code Editor for code/SQL questions moved below control buttons */}
            {isCodeQuestion && (
              <div style={{ width: '100%', minHeight: 260, margin: '28px 0 0 0', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ width: '100%', display: 'flex', flexDirection: 'row', alignItems: 'flex-start', background: '#18181b', borderRadius: 8, border: '1.5px solid #c7d2fe', marginBottom: 14 }}>
                  {/* Line numbers */}
                  <pre style={{
                    margin: 0,
                    padding: '1rem 0.5rem 1rem 1rem',
                    background: 'transparent',
                    color: '#64748b',
                    fontFamily: 'Consolas, Monaco, monospace',
                    fontSize: 16,
                    userSelect: 'none',
                    minWidth: 32,
                    textAlign: 'right',
                    borderRight: '1px solid #27272a',
                    height: '100%',
                    lineHeight: '1.5',
                  }}>
                    {Array.from({ length: (code.match(/\n/g)?.length || 0) + 1 }).map((_, i) => i + 1).join('\n')}
                  </pre>
                  <textarea
                    value={code}
                    onChange={e => setCode(e.target.value)}
                    placeholder={'Write code here...'}
                    style={{
                      width: '100%',
                      minHeight: 220,
                      fontFamily: 'Consolas, Monaco, monospace',
                      fontSize: 16,
                      border: 'none',
                      outline: 'none',
                      background: 'transparent',
                      color: '#f1f5f9',
                      padding: '1rem',
                      resize: 'vertical',
                      boxSizing: 'border-box',
                      lineHeight: '1.5',
                    }}
                  />
                </div>
                {/* Submit button removed */}
              </div>
            )}
            {/* Error messages for recording/skip below buttons */}
            {recordingError && <div className="recording-error">{recordingError}</div>}
            {skipError && <div className="recording-error" style={{ color: '#b91c1c', background: '#fef2f2', border: '1px solid #fecaca', marginTop: 8 }}>{skipError}</div>}
            {!isCurrentlyFullscreen && (
              <div className="fullscreen-warning" style={{
                background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                color: 'white',
                padding: '0.75rem 1rem',
                borderRadius: '8px',
                marginTop: '12px',
                fontSize: '0.9rem',
                fontWeight: '600',
                textAlign: 'center',
                boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)',
                animation: 'pulse 2s infinite'
              }}>
                🚫 All buttons are disabled. Enter fullscreen mode to continue the interview.
              </div>
            )}
          </div>
        </main>
      <footer style={{ 
        width: '100%', 
        textAlign: 'center', 
        padding: '1.2rem 0 0.7rem 0', 
        color: 'rgba(255, 255, 255, 0.9)', 
        fontSize: 15, 
        background: 'transparent', 
        letterSpacing: '0.2px',
        position: 'relative',
        zIndex: 10,
        textShadow: '0 2px 4px rgba(0, 0, 0, 0.3)'
      }}>
        &copy; {new Date().getFullYear()} QuickHire AI &mdash; Elevate Your Interview Experience
      </footer>
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: none; }
        }
        @keyframes slideInUp {
          from { opacity: 0; transform: translate(-50%, -40%); }
          to { opacity: 1; transform: translate(-50%, -50%); }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-20px) rotate(180deg); }
        }
        .main-card:hover { box-shadow: 0 12px 40px rgba(30,41,59,0.22) !important; transform: scale(1.01) !important; }
        .record-button, .submit-button, .skip-button {
          transition: background 0.2s, color 0.2s, transform 0.15s;
        }
        .record-button:hover:not(:disabled), .submit-button:hover:not(:disabled), .skip-button:hover:not(:disabled) {
          filter: brightness(1.08);
          transform: scale(1.04);
          box-shadow: 0 2px 8px #a5b4fc44;
        }
        .record-button:disabled, .submit-button:disabled, .skip-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          filter: grayscale(0.5);
        }
        .record-button:disabled:hover, .submit-button:disabled:hover, .skip-button:disabled:hover {
          transform: none;
          filter: grayscale(0.5);
        }
        /* Special styling for buttons when not in fullscreen */
        .record-button:not(:disabled):not(.recording):not([disabled]) {
          cursor: pointer;
        }
        .skip-button:not(:disabled):not([disabled]) {
          cursor: pointer;
        }
        .submit-button:not(:disabled):not([disabled]) {
          cursor: pointer;
        }
        /* Visual indicator for buttons that require fullscreen */
        .record-button:not(.recording):not(:disabled):hover,
        .skip-button:not(:disabled):hover,
        .submit-button:not(:disabled):hover {
          box-shadow: 0 0 0 2px rgba(239, 68, 68, 0.3);
        }
        @media (max-width: 900px) {
          .interview-main-card { flex-direction: column !important; min-width: 0 !important; max-width: 100vw !important; width: 99vw !important; }
          .interview-main-card > div { max-width: 100vw !important; width: 100vw !important; padding: 1.2rem 0.5rem 1rem 0.5rem !important; }
          .interview-main-card > div:nth-child(2) { display: none !important; }
        }
        @media (max-width: 600px) {
          .interview-main-card > div { padding: 0.5rem 0.2rem 0.5rem 0.2rem !important; }
        }
        @media (max-width: 700px) {
          .sticky-controls {
            position: fixed !important;
            left: 0; right: 0; bottom: 0;
            width: 100vw;
            background: #fff;
            border-top: 1.5px solid #e5e7eb;
            z-index: 100;
            padding: 0.7rem 0.5rem 0.7rem 0.5rem !important;
            box-shadow: 0 -2px 12px #a5b4fc22;
          }
        }
      `}</style>
    </div>
  );
};

export default InterviewScreen; 