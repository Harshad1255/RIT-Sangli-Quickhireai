# Speech recognition network recovery

The interview uses browser Web Speech recognition for speech-to-text. Its `network` error means the browser could not communicate with its speech recognition service. This happens independently of Gemini evaluation or Render API credentials. A screenshot cannot establish whether the underlying cause is connectivity, browser support, a proxy, or speech-service availability.

Changes:
- Retry a network failure once, after recognition ends, with a one-second delay.
- Preserve both final and interim captured text when recognition fails.
- Bound automatic restarts after repeated empty/early recognition endings; keep a manual retry path.
- Give each mounted interview its own recognition service and allow English (India) or English (US) selection.
- Keep the answer editable after capture, and submit the reviewed transcript through the existing evaluation endpoint.
- Show actionable network, microphone permission, capture, language and unsupported-service messages.
- Allow retry or typed submission after failure. Do not award marks or submit automatically.
- Keep recording UI idle after synchronous startup errors; cancel delayed restarts when stopping or pausing fullscreen.
- Reset speech confidence for each recording attempt.

Files: `Frontend/src/features/interview/services/speechRecognitionService.js`, `Frontend/src/features/interview/components/InterviewScreen.jsx`, `Backend/tests/interviewSpeech.test.js`, `tests/e2e/interview-fullscreen.spec.js`.

Verification: automated speech-service tests simulate transcript accumulation, language fallback, permission/network failures, bounded restarts, and service isolation. The frontend production build and existing browser regression cover network recovery with typed submission and fullscreen guards. Browser tests simulate recognition failures; they do not establish availability of the user's actual speech provider or microphone.

For an ongoing outage, type the answer and submit it. For voice input, allow microphone access and retry using Chrome on a working connection. The deployed frontend needs the patch before its improved recovery messages appear. This patch does not provide offline audio transcription or a separate server transcription provider.

Reference: https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognitionErrorEvent/error

## Manual microphone verification

1. In a supported browser (for example, current Chrome), start a new interview and choose English (India); allow microphone access when prompted.
2. Speak several sentences with a pause, confirm the live interim preview updates, then stop and verify the text remains editable and complete.
3. Edit the captured answer and submit once; verify the edited wording is the answer in the saved evaluation/report.
4. Deny microphone access (or disable/disconnect the microphone) and retry; verify an actionable error appears, the text box remains usable, and typed submission still works.
5. Leave the browser without SpeechRecognition support or simulate a network failure; verify recognition does not loop indefinitely and captured text is retained.
6. Refresh mid-question and verify the candidate can restore the active question and saved draft without submitting automatically.

Web Speech recognition depends on browser/provider availability and network connectivity; accuracy, accent handling, supported locales, and offline use are not guaranteed. No audio is sent to this application's backend by the speech-to-text flow.
