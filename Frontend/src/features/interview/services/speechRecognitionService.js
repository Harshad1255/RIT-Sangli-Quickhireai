/**
 * SpeechRecognitionService
 * Wraps Web Speech API (window.SpeechRecognition || window.webkitSpeechRecognition)
 * with robust error handling, hardware checks, auto-cleanup, and Brave/Edge/Chrome compatibility.
 */

class SpeechRecognitionService {
  constructor() {
    this.recognition = null;
    this.isRecording = false;
    this.isStarting = false;
    this.finalTranscript = '';
    this.onInterimResult = null;
    this.onFinalResult = null;
    this.onError = null;
    this.onStart = null;
    this.onEnd = null;
    this._retryCount = 0;
    this._retryTimer = null;
    this._isBrave = undefined;
    this._abortedManually = false;
  }

  /**
   * Check if the current browser environment supports SpeechRecognition.
   */
  isSupported() {
    return typeof window !== 'undefined' && Boolean(
      window.SpeechRecognition || window.webkitSpeechRecognition
    );
  }

  /**
   * Detect whether the browser is Brave.
   * Caches result so subsequent checks are instantaneous.
   */
  async isBraveBrowser() {
    if (this._isBrave !== undefined) {
      return this._isBrave;
    }
    try {
      if (typeof navigator !== 'undefined') {
        if (navigator.brave && typeof navigator.brave.isBrave === 'function') {
          this._isBrave = await navigator.brave.isBrave();
          return this._isBrave;
        }
        if (navigator.userAgentData?.brands?.some(b => b.brand === 'Brave')) {
          this._isBrave = true;
          return true;
        }
      }
    } catch (e) {
      // ignore
    }
    this._isBrave = false;
    return false;
  }

  /**
   * Synchronous check if already resolved or via userAgentData.
   */
  isBraveSync() {
    if (this._isBrave !== undefined) return this._isBrave;
    if (typeof navigator !== 'undefined') {
      if (navigator.userAgentData?.brands?.some(b => b.brand === 'Brave')) {
        return true;
      }
    }
    return false;
  }

  /**
   * Probe microphone hardware and permissions via getUserMedia.
   * Immediately stops tracks so media devices are never leaked.
   */
  async testMicrophoneAccess() {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      return {
        ok: false,
        reason: 'unsupported',
        message: 'Microphone media access is not supported in this browser context (HTTPS or localhost is required).'
      };
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const tracks = stream.getAudioTracks();
      const hasLiveTrack = tracks.some(t => t.readyState === 'live');
      // Immediately stop all probed tracks to avoid holding the microphone
      tracks.forEach(track => {
        try {
          track.stop();
        } catch (e) {
          // ignore
        }
      });

      if (!hasLiveTrack) {
        return {
          ok: false,
          reason: 'no_live_track',
          message: 'Microphone was detected but could not capture an active audio track.'
        };
      }

      return { ok: true };
    } catch (error) {
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        return {
          ok: false,
          reason: 'permission_denied',
          message: 'Microphone permission was denied. Please allow microphone access in your browser address bar/settings.'
        };
      }
      if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
        return {
          ok: false,
          reason: 'no_device',
          message: 'No microphone hardware found. Please connect or enable an audio input device.'
        };
      }
      return {
        ok: false,
        reason: 'error',
        message: error.message || 'Unable to access microphone hardware.'
      };
    }
  }

  /**
   * Cleanly initialize a SpeechRecognition instance with event handlers.
   */
  _initRecognition() {
    const SpeechRecognition = typeof window !== 'undefined' && (
      window.SpeechRecognition || window.webkitSpeechRecognition
    );

    if (!SpeechRecognition) {
      return null;
    }

    // Safely detach listeners and abort existing instance to prevent duplicate events
    if (this.recognition) {
      try {
        this.recognition.onstart = null;
        this.recognition.onresult = null;
        this.recognition.onerror = null;
        this.recognition.onend = null;
        this.recognition.abort();
      } catch (e) {
        // ignore
      }
      this.recognition = null;
    }

    const rec = new SpeechRecognition();
    rec.continuous = true;
    rec.interimResults = true;
    rec.maxAlternatives = 1;
    rec.lang = 'en-US';

    rec.onstart = () => {
      console.log('[SpeechRecognition] Recognition session started');
      this.isStarting = false;
      this.isRecording = true;
      this._retryCount = 0;
      if (this.onStart) {
        this.onStart();
      }
    };

    rec.onresult = (event) => {
      let interimTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const item = event.results[i];
        const transcriptSegment = item[0]?.transcript || '';
        if (item.isFinal) {
          this.finalTranscript += transcriptSegment + ' ';
          if (this.onFinalResult) {
            this.onFinalResult(this.finalTranscript.trim());
          }
        } else {
          interimTranscript += transcriptSegment;
        }
      }

      if (this.onInterimResult) {
        this.onInterimResult(interimTranscript);
      }
    };

    rec.onerror = async (event) => {
      const errCode = event.error;
      const isBrave = await this.isBraveBrowser();
      const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

      // Diagnostic logging (WITHOUT logging speech content or transcripts)
      console.warn('[SpeechRecognition] Diagnostic error:', {
        errorCode: errCode,
        isBrave,
        isOnline,
        isRecording: this.isRecording,
        isStarting: this.isStarting,
        retryCount: this._retryCount
      });

      this.isStarting = false;
      this.isRecording = false;

      // If aborted manually via stop/cancel/cleanup, don't surface as user-facing error
      if (errCode === 'aborted' || this._abortedManually) {
        this._abortedManually = false;
        return;
      }

      // Check if recoverable via bounded retry (max 1 retry in Chrome/Edge for transient network glitch)
      if (errCode === 'network' && !isBrave && isOnline && this._retryCount < 1) {
        this._retryCount++;
        console.log(`[SpeechRecognition] Attempting 1 bounded retry for network glitch (attempt ${this._retryCount})...`);
        this._retryTimer = setTimeout(() => {
          this._retryTimer = null;
          try {
            const retryRec = this._initRecognition();
            if (retryRec) {
              this.isStarting = true;
              retryRec.start();
            }
          } catch (retryErr) {
            console.warn('[SpeechRecognition] Retry start failed:', retryErr);
            this._notifyError(errCode, isBrave);
          }
        }, 800);
        return;
      }

      this._notifyError(errCode, isBrave);
    };

    rec.onend = () => {
      console.log('[SpeechRecognition] Recognition session ended');
      this.isStarting = false;
      this.isRecording = false;
      if (this.onEnd) {
        this.onEnd(this.finalTranscript.trim());
      }
    };

    this.recognition = rec;
    return rec;
  }

  _notifyError(errCode, isBrave) {
    let friendlyMessage = 'Speech recognition encountered an issue. You can type your answer directly in the box below.';

    switch (errCode) {
      case 'not-allowed':
      case 'service-not-allowed':
        friendlyMessage = 'Microphone or speech recognition permission was denied. Please allow microphone access in your browser address bar, or type your answer directly in the box below.';
        break;

      case 'audio-capture':
        friendlyMessage = 'Could not capture audio from your microphone. Please check your audio input device or type your answer directly in the box below.';
        break;

      case 'network':
        if (isBrave) {
          friendlyMessage = "Brave Browser blocks Google's cloud speech recognition engine by design for privacy. To record voice in-browser, please open this interview in Google Chrome or Microsoft Edge. You can also type your answer directly in the box below (or press Win + H for Windows Voice Typing).";
        } else {
          friendlyMessage = "Speech service network connection failed. The speech recognition service could not be reached. Please check your internet connection or firewall, or type your answer directly in the box below.";
        }
        break;

      case 'no-speech':
        friendlyMessage = 'No speech was detected. Please speak clearly into your microphone, or type your answer directly in the box below.';
        break;

      case 'language-not-supported':
        friendlyMessage = 'Speech recognition language (en-US) is not supported in this browser. Please type your answer directly in the box below.';
        break;

      case 'start_failed':
        if (isBrave) {
          friendlyMessage = "Brave Browser blocks Google's cloud speech recognition engine by design for privacy. Please use Google Chrome or Microsoft Edge to record audio, or type your answer directly in the box below.";
        } else {
          friendlyMessage = 'Failed to start speech recognition. You can type your answer directly in the box below.';
        }
        break;

      default:
        friendlyMessage = `Speech recognition error (${errCode}). You can type your answer directly in the box below.`;
    }

    if (this.onError) {
      this.onError({
        code: errCode,
        message: friendlyMessage,
        isBrave: Boolean(isBrave)
      });
    }
  }

  /**
   * Start recording audio into transcript.
   * @param {string} initialTranscript Existing text to preserve/append to
   * @param {object} callbacks { onStart, onInterimResult, onFinalResult, onError, onEnd }
   */
  async startRecording(initialTranscript, callbacks = {}) {
    if (this.isStarting || this.isRecording) {
      console.warn('[SpeechRecognition] Recording is already in progress or starting; ignoring duplicate start');
      return;
    }

    if (!this.isSupported()) {
      const err = new Error('Speech recognition is not supported in this browser. Please use Google Chrome or Microsoft Edge, or type your answer directly in the box below.');
      if (callbacks.onError) {
        callbacks.onError({ code: 'unsupported', message: err.message });
      }
      return;
    }

    this._abortedManually = false;
    this._retryCount = 0;
    if (this._retryTimer) {
      clearTimeout(this._retryTimer);
      this._retryTimer = null;
    }

    // Preserve existing transcript with trailing space separator if needed
    const base = (initialTranscript || '').trim();
    this.finalTranscript = base ? `${base} ` : '';

    this.onStart = callbacks.onStart;
    this.onInterimResult = callbacks.onInterimResult;
    this.onFinalResult = callbacks.onFinalResult;
    this.onError = callbacks.onError;
    this.onEnd = callbacks.onEnd;

    // Proactive check for Brave browser
    const isBrave = await this.isBraveBrowser();
    if (isBrave) {
      console.warn('[SpeechRecognition] Brave browser detected. Web Speech API cloud provider is stripped by Brave.');
      this.isStarting = false;
      this.isRecording = false;
      this._notifyError('network', true);
      return;
    }

    try {
      this.isStarting = true;
      const rec = this._initRecognition();
      if (!rec) {
        throw new Error('Failed to initialize speech recognition engine');
      }
      rec.start();
    } catch (error) {
      console.error('[SpeechRecognition] Error starting recognition:', error);
      this.isStarting = false;
      this.isRecording = false;
      this._notifyError('start_failed', isBrave);
    }
  }

  /**
   * Stop recording audio. Returns a Promise resolving with the final transcript text.
   * Safe with a timeout so it never hangs indefinitely.
   */
  stopRecording() {
    return new Promise((resolve) => {
      const currentFinal = this.finalTranscript.trim();

      if (this._retryTimer) {
        clearTimeout(this._retryTimer);
        this._retryTimer = null;
      }

      if (!this.recognition || (!this.isRecording && !this.isStarting)) {
        this.isStarting = false;
        this.isRecording = false;
        resolve(currentFinal);
        return;
      }

      let resolved = false;
      const finish = () => {
        if (!resolved) {
          resolved = true;
          this.isStarting = false;
          this.isRecording = false;
          resolve(this.finalTranscript.trim());
        }
      };

      // Safety timeout: resolve within 1200ms even if onend doesn't fire
      const timer = setTimeout(() => {
        console.warn('[SpeechRecognition] stopRecording timeout reached; resolving');
        finish();
      }, 1200);

      const prevOnEnd = this.onEnd;
      this.onEnd = (finalText) => {
        clearTimeout(timer);
        if (prevOnEnd) prevOnEnd(finalText);
        finish();
      };

      try {
        this.recognition.stop();
      } catch (error) {
        console.warn('[SpeechRecognition] Error during stop():', error);
        clearTimeout(timer);
        finish();
      }
    });
  }

  /**
   * Cancel and abort any active recognition without firing error alerts.
   */
  cancel() {
    this._abortedManually = true;
    this.isStarting = false;
    this.isRecording = false;
    if (this._retryTimer) {
      clearTimeout(this._retryTimer);
      this._retryTimer = null;
    }
    if (this.recognition) {
      try {
        this.recognition.abort();
      } catch (error) {
        console.warn('[SpeechRecognition] Error during cancel():', error);
      }
    }
  }

  /**
   * Clean up all state, recognizer instances, and timers on component unmount.
   */
  cleanup() {
    this.cancel();
    if (this.recognition) {
      try {
        this.recognition.onstart = null;
        this.recognition.onresult = null;
        this.recognition.onerror = null;
        this.recognition.onend = null;
        this.recognition.abort();
      } catch (e) {
        // ignore
      }
      this.recognition = null;
    }
    this.onStart = null;
    this.onInterimResult = null;
    this.onFinalResult = null;
    this.onError = null;
    this.onEnd = null;
    this._retryCount = 0;
  }
}

export default new SpeechRecognitionService();