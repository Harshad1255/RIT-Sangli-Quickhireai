# Speech recognition network recovery

The interview uses browser Web Speech recognition for speech-to-text. Its `network` error means the browser could not communicate with its speech recognition service. This happens independently of Gemini evaluation or Render API credentials. A screenshot cannot establish whether the underlying cause is connectivity, browser support, a proxy, or speech-service availability.

Changes:
- Retry a network failure once, after recognition ends, with a one-second delay.
- Preserve both final and interim captured text when recognition fails.
- Show actionable network, microphone permission, capture, language and unsupported-service messages.
- Allow retry or typed submission after failure. Do not award marks or submit automatically.
- Keep recording UI idle after synchronous startup errors; cancel delayed restarts when stopping or pausing fullscreen.
- Reset speech confidence for each recording attempt.

Files: `Frontend/src/features/interview/services/speechRecognitionService.js`, `Frontend/src/features/interview/components/InterviewScreen.jsx`, `Backend/tests/interviewSpeech.test.js`, `tests/e2e/interview-fullscreen.spec.js`.

Verification: seven simulated speech-service tests and the frontend build passed. Browser regression covers network recovery with typed submission and existing fullscreen guards. The browser test simulates recognition failures; it does not establish availability of the user's actual speech provider or microphone.

For an ongoing outage, type the answer and submit it. For voice input, allow microphone access and retry using Chrome on a working connection. The deployed frontend needs the patch before its improved recovery messages appear. This patch does not provide offline audio transcription or a separate server transcription provider.

Reference: https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognitionErrorEvent/error
