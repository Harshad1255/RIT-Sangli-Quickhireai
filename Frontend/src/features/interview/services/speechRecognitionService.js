/**
 * SpeechRecognitionService
 * Wraps Web Speech API (window.SpeechRecognition || window.webkitSpeechRecognition)
 * with robust error handling, hardware checks, auto-cleanup, and Brave/Edge/Chrome compatibility.
 */

class SpeechRecognitionService {
  constructor() {
    this.recognition = null;
    this.isRecording = false;
    this.finalTranscript = '';
    this.onInterimResult = null;
    this.onFinalResult = null;
    this.onError = null;
    this.onStart = null;
    this.onEnd = null;
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

    // Clean up any existing instance to avoid duplicate listeners or state collision
    if (this.recognition) {
      try {
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
      this.isRecording = true;
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

    rec.onerror = (event) => {
      console.error('[SpeechRecognition] Error event:', event.error);
      this.isRecording = false;

      let friendlyMessage = 'Speech recognition encountered an issue. You can type your answer below.';
      switch (event.error) {
        case 'not-allowed':
        case 'service-not-allowed':
          friendlyMessage = 'Microphone or speech recognition permission was denied. Please allow microphone access in your browser address bar, or type your answer below.';
          break;
        case 'audio-capture':
          friendlyMessage = 'Could not capture audio from your microphone. Please check your audio input device or type your answer below.';
          break;
        case 'network':
          friendlyMessage = "Speech service network connection failed. If using Brave Browser, enable 'Use Google services for speech recognition' in brave://settings/system, or use Google Chrome / Microsoft Edge. You can also type your answer below.";
          break;
        case 'no-speech':
          friendlyMessage = 'No speech was detected. Please speak clearly into your microphone, or type your answer below.';
          break;
        case 'language-not-supported':
          friendlyMessage = 'Speech recognition language is not supported. Please type your answer below.';
          break;
        default:
          friendlyMessage = `Speech recognition error (${event.error}). You can type your answer below.`;
      }

      if (this.onError) {
        this.onError({ code: event.error, message: friendlyMessage });
      }
    };

    rec.onend = () => {
      console.log('[SpeechRecognition] Recognition session ended');
      this.isRecording = false;
      if (this.onEnd) {
        this.onEnd(this.finalTranscript.trim());
      }
    };

    this.recognition = rec;
    return rec;
  }

  /**
   * Start recording audio into transcript.
   * @param {string} initialTranscript Existing text to preserve/append to
   * @param {object} callbacks { onStart, onInterimResult, onFinalResult, onError, onEnd }
   */
  startRecording(initialTranscript, callbacks = {}) {
    if (!this.isSupported()) {
      const err = new Error('Speech recognition is not supported in this browser. Please use Chrome or Edge, or type your answer.');
      if (callbacks.onError) {
        callbacks.onError({ code: 'unsupported', message: err.message });
      }
      return;
    }

    // Preserve existing transcript with trailing space separator if needed
    const base = (initialTranscript || '').trim();
    this.finalTranscript = base ? `${base} ` : '';

    this.onStart = callbacks.onStart;
    this.onInterimResult = callbacks.onInterimResult;
    this.onFinalResult = callbacks.onFinalResult;
    this.onError = callbacks.onError;
    this.onEnd = callbacks.onEnd;

    try {
      const rec = this._initRecognition();
      if (!rec) {
        throw new Error('Failed to initialize speech recognition engine');
      }
      rec.start();
    } catch (error) {
      console.error('[SpeechRecognition] Error starting recognition:', error);
      this.isRecording = false;
      if (this.onError) {
        this.onError({ code: 'start_failed', message: error.message || 'Failed to start speech recognition' });
      }
    }
  }

  /**
   * Stop recording audio. Returns a Promise resolving with the final transcript text.
   * Safe with a timeout so it never hangs indefinitely.
   */
  stopRecording() {
    return new Promise((resolve) => {
      const currentFinal = this.finalTranscript.trim();

      if (!this.recognition || !this.isRecording) {
        this.isRecording = false;
        resolve(currentFinal);
        return;
      }

      let resolved = false;
      const finish = () => {
        if (!resolved) {
          resolved = true;
          this.isRecording = false;
          resolve(this.finalTranscript.trim());
        }
      };

      // Safety timeout: resolve within 1500ms even if onend doesn't fire
      const timer = setTimeout(() => {
        console.warn('[SpeechRecognition] stopRecording timeout reached; resolving');
        finish();
      }, 1500);

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
   * Cancel and abort any active recognition.
   */
  cancel() {
    this.isRecording = false;
    if (this.recognition) {
      try {
        this.recognition.abort();
      } catch (error) {
        console.warn('[SpeechRecognition] Error during cancel():', error);
      }
    }
  }
}

export default new SpeechRecognitionService();