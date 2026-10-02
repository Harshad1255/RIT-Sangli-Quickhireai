class SpeechRecognitionService {
  constructor() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      throw new Error('Speech recognition not supported');
    }

    this.recognition = new SpeechRecognition();
    this.isRecording = false;
    this.finalTranscript = '';
    this.setupRecognition();
  }

  setupRecognition() {
    this.recognition.continuous = true;
    this.interimResults = true;
    this.recognition.lang = 'en-US';

    this.recognition.onresult = (event) => {
      let interimTranscript = '';
      
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          this.finalTranscript += transcript + ' ';
          if (this.onFinalResult) {
            this.onFinalResult(this.finalTranscript.trim());
          }
        } else {
          interimTranscript += transcript;
          if (this.onInterimResult) {
            this.onInterimResult(interimTranscript);
          }
        }
      }
    };

    this.recognition.onend = () => {
      // Ensure we have the final result before stopping
      if (this.isRecording) {
        if (this.onFinalResult) {
          this.onFinalResult(this.finalTranscript.trim());
        }
      }
    };

    this.recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      if (this.onError) {
        this.onError(event.error);
      }
    };
  }

  startRecording(onInterimResult, onFinalResult, onError) {
    this.finalTranscript = '';
    this.onInterimResult = onInterimResult;
    this.onFinalResult = onFinalResult;
    this.onError = onError;
    this.isRecording = true;

    try {
      this.recognition.start();
      console.log('Speech recognition started');
    } catch (error) {
      console.error('Error starting speech recognition:', error);
      if (onError) onError(error);
    }
  }

  stopRecording() {
    return new Promise((resolve) => {
      console.log('Stopping recording...');
      
      this.recognition.onend = () => {
        this.isRecording = false;
        const finalStr = this.finalTranscript.trim();
        console.log('Recognition ended, resolving with transcript:', finalStr);
        resolve(finalStr);
      };

      try {
        this.recognition.stop();
      } catch (error) {
        console.error('Error stopping recognition:', error);
        this.isRecording = false;
        resolve(this.finalTranscript.trim());
      }
    });
  }

  cancel() {
    this.isRecording = false;
    this.finalTranscript = '';
    try {
      this.recognition.abort();
    } catch (error) {
      console.error('Error canceling recognition:', error);
    }
  }
}

export default new SpeechRecognitionService(); 