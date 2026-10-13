export class SpeechRecognitionService {
  constructor({ maxAutoRestarts = 3 } = {}) {
    const Recognition = typeof window === 'undefined' ? null : window.SpeechRecognition || window.webkitSpeechRecognition;
    this.Recognition = Recognition;
    this.instance = null;
    this.isRecording = false;
    this.running = false;
    this.state = 'idle';
    this.finalTranscript = '';
    this.interimTranscript = '';
    this.confidences = [];
    this.networkRetries = 0;
    this.restartDelay = 250;
    this.restartCount = 0;
    this.maxAutoRestarts = maxAutoRestarts;
    this.language = 'en-IN';
  }
  get recognition() {
    if (!this.instance && this.Recognition) {
      const started = performance.now();
      this.instance = new this.Recognition();
      this.setupRecognition();
      console.info("[interview timing]",{stage:"speech_initialization",durationMs:performance.now()-started});
    }
    return this.instance;
  }
  setupRecognition() {
    const r = this.recognition;
    r.continuous = true;
    r.interimResults = true;
    r.lang = this.language;
    r.onstart = () => {
      this.running = true;
      this.isRecording = true;
      this.setState('listening');
    };
    r.onresult = event => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        this.segments.set(i, { text: result[0].transcript.trim(), final: result.isFinal, confidence: result[0].confidence });
      }
      const segments = [...this.segments.values()];
      this.finalTranscript = [this.baseTranscript, ...segments.filter(s => s.final).map(s => s.text)].filter(Boolean).join(' ');
      this.interimTranscript = segments.filter(s => !s.final).map(s => s.text).join(' ');
      if (this.finalTranscript || this.interimTranscript) this.restartCount = 0;
      if (this.lastFinal !== this.finalTranscript) this.onFinalResult?.(this.finalTranscript);
      if (this.lastInterim !== this.interimTranscript) this.onInterimResult?.(this.interimTranscript);
      this.lastFinal = this.finalTranscript;
      this.lastInterim = this.interimTranscript;
    };
    r.onerror = event => {
      if (event.error === 'language-not-supported' && this.languageFallbacks < 1) {
        this.languageFallbacks++;
        r.lang = r.lang === 'en-IN' ? 'en-US' : 'en-IN';
        return;
      }
      if (event.error === 'no-speech') return;
      this.commit();
      if (event.error === 'network' && this.isRecording && this.networkRetries < 1 && window.navigator?.onLine !== false) {
        r.lang = r.lang === 'en-IN' ? 'en-US' : 'en-IN';
        this.networkRetries++;
        this.restartDelay = 1000;
        this.setState('processing');
        return;
      }
      this.isRecording = false;
      clearTimeout(this.restartTimer);
      this.setState('error');
      this.onError?.(this.errorMessage(event.error));
    };
    r.onend = () => {
      this.running = false;
      this.commit();
      if (this.stopResolve) {
        clearTimeout(this.stopTimer);
        const resolve = this.stopResolve;
        this.stopResolve = null;
        this.stopPromise = null;
        resolve(this.finalTranscript);
        this.setState('stopped');
      } else if (this.isRecording && this.restartCount < this.maxAutoRestarts) {
        this.restartCount++;
        this.setState('processing');
        this.restartTimer = setTimeout(() => {
          if (this.isRecording) this.startSession();
        }, this.restartDelay);
        this.restartDelay = Math.min(2000, this.restartDelay * 2);
      } else if (this.isRecording) {
        this.isRecording = false;
        this.setState('stopped');
        this.onError?.('Speech recognition stopped after repeated interruptions. Your captured text is preserved; retry recording or type your answer.');
      } else {
        this.setState('stopped');
      }
    };
  }
  setState(state) {
    this.state = state;
    this.onStateChange?.(state);
  }
  errorMessage(code) {
    const messages = {
      network: 'The browser speech service could not connect using either English language setting. Check your internet connection, then retry or type your answer below.',
      'not-allowed': 'Microphone access was denied. Allow the microphone in your browser site settings and retry, or type your answer.',
      'service-not-allowed': 'This browser cannot use its speech recognition service. Try Chrome, or type your answer.',
      'audio-capture': 'The microphone could not be accessed. Check your selected microphone and retry, or type your answer.',
      'language-not-supported': 'Speech recognition does not support the selected language. Please type your answer.',
      aborted: 'Recording stopped. Your captured text is preserved; retry or type your answer.'
    };
    return messages[code] || 'Speech recognition could not start. Retry recording or type your answer.';
  }
  commit() {
    this.finalTranscript = [this.finalTranscript, this.interimTranscript].filter(Boolean).join(' ').trim();
    for (const segment of this.segments?.values() || []) {
      if (segment.final && Number.isFinite(segment.confidence) && segment.confidence > 0 && segment.confidence <= 1) this.confidences.push(segment.confidence);
    }
    this.baseTranscript = this.finalTranscript;
    this.interimTranscript = '';
    this.segments = new Map();
    this.onFinalResult?.(this.finalTranscript);
    this.onInterimResult?.('');
  }
  startSession() {
    if (this.running) return;
    this.segments = new Map();
    this.baseTranscript = this.finalTranscript;
    try {
      this.setState('initializing');
      this.recognition.start();
      this.running = true;
    } catch (error) {
      this.isRecording = false;
      this.running = false;
      this.setState('error');
      this.onError?.(this.errorMessage(error.name === 'NotAllowedError' ? 'not-allowed' : error.name));
    }
  }
  startRecording(initialTranscript, onInterimResult, onFinalResult, onError, options = {}) {
    if (!this.recognition) throw new Error('Speech recognition is not supported in this browser. Please type your answer.');
    if (this.isRecording || this.running || this.stopResolve) return;
    clearTimeout(this.restartTimer);
    this.lastFinal = null;
    this.lastInterim = null;
    this.networkRetries = 0;
    this.languageFallbacks = 0;
    this.restartCount = 0;
    this.restartDelay = 250;
    this.confidences = [];
    this.finalTranscript = (initialTranscript || '').trim();
    this.interimTranscript = '';
    this.language = options.language === 'en-US' ? 'en-US' : 'en-IN';
    this.recognition.lang = this.language;
    this.onInterimResult = onInterimResult;
    this.onFinalResult = onFinalResult;
    this.onError = onError;
    this.onStateChange = options.onStateChange;
    if (window.navigator?.onLine === false) {
      this.setState('error');
      this.onError(this.errorMessage('network'));
      return;
    }
    this.isRecording = true;
    this.startSession();
  }
  get speechConfidence() { return this.confidences.length ? this.confidences.reduce((a,b) => a+b,0) / this.confidences.length : null; }
  stopRecording() {
    this.isRecording = false;
    clearTimeout(this.restartTimer);
    this.setState('processing');
    if (this.stopPromise && this.stopResolve) return this.stopPromise;
    if (!this.running) {
      this.commit();
      this.setState('stopped');
      return Promise.resolve(this.finalTranscript);
    }
    this.stopPromise = new Promise(resolve => {
      this.stopResolve = resolve;
      this.stopTimer = setTimeout(() => {
        this.running = false;
        this.commit();
        this.stopResolve = null;
        this.stopPromise = null;
        this.recognition.abort();
        this.setState('stopped');
        resolve(this.finalTranscript);
      }, 2000);
      try { this.recognition.stop(); }
      catch {
        clearTimeout(this.stopTimer);
        this.running = false;
        this.commit();
        this.stopResolve = null;
        this.stopPromise = null;
        this.setState('stopped');
        resolve(this.finalTranscript);
      }
    });
    return this.stopPromise;
  }
  cancel() {
    this.isRecording = false;
    clearTimeout(this.restartTimer);
    clearTimeout(this.stopTimer);
    this.onFinalResult = null;
    this.onInterimResult = null;
    this.onError = null;
    this.onStateChange = null;
    this.stopResolve?.(this.finalTranscript);
    this.stopResolve = null;
    this.stopPromise = null;
    this.finalTranscript = '';
    this.interimTranscript = '';
    this.baseTranscript = '';
    this.confidences = [];
    this.segments = new Map();
    this.setState('idle');
    if (this.running) this.recognition.abort();
  }
}
export default new SpeechRecognitionService();
