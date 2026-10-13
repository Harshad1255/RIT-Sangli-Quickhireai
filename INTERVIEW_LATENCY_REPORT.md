# Interview latency optimization

## Causes

- The start endpoint deleted the existing MongoDB session on each initialization. Refresh/remount therefore regenerated questions and reset answers.
- Every answer request waited for evaluation and then generated its next question. Question generation was serialized behind evaluation instead of prepared while the candidate answered.
- Two routes used getInterviewSession without await, so missing-session checks and question responses inspected a Promise.
- Answer retries were not idempotent, and answer data was saved only after evaluation and question generation.
- Gemini HTTP timers stopped at headers rather than protecting body parsing, failed requests could retain timers, and long retries exceeded useful UI wait times.
- The frontend retried timed-out mutations through a shared interceptor, parsed stored session JSON on every render, repeatedly wrote large stored state during speech updates, and did not guard stale responses.
- App startup found a truncated interviewController.js inherited from an earlier edit. Restored its completion handler and added a route-loading test.

## Changes

Backend controllers now reuse sessions, coalesce initialization requests, persist pending answers before evaluation, replay completed requests by question ID, reject overlapping submissions, and recover pending work on retry. questionPreparation.js generates the remaining main questions in one bounded background Gemini call and persists validated question IDs. The initial question is returned independently. Main questions use prepared data; follow-ups remain answer dependent. This preserves the existing workflow: evaluation still determines whether the next question is a follow-up. It does not introduce navigation while grading is pending.

InterviewSession retains prepared questions, final evaluation and last response. The routes await database sessions and log request IDs and API durations. Gemini uses the configured model, bounded operation-specific timeouts, small transient retries, no permanent-error retry, and body-parsing timeouts. No model quality setting was reduced. The first-question generation has at most two duplicate checks. Existing emergency question-bank fallback behavior remains unchanged; no hardcoded question cache was introduced.

Frontend initialization shares in-flight starts, ignores stale responses and restores server progress/final results without resetting monitoring data. Mutations disable automatic timeout retry, guard repeated clicks, retain drafts and expose a safe retry control. Stored state parsing is memoized, storage writes are debounced, and speech recognition initializes on first use with unchanged final/interim accumulation and bounded stop handling. Timing logs cover speech initialization, initialization-to-visible, submit-to-visible, session queries, evaluation, background generation and API responses.

## Measurements and verification

Controlled comparison against the pre-change controller (HEAD source), using the same mocked providers and database:

| Measurement | Before | After |
| --- | --- | --- |
| Main-question transition with 300 ms evaluation and 200 ms question-generation fixtures | 528.94 ms | 334.93 ms |
| Question-generation calls on session refresh | 1 | 0 |
| Main-question generation calls for five questions, excluding follow-ups/retries | 5 | 2 (first + remaining batch) |

The first-question request measured 285.22 ms in that controlled run. These are fixture measurements, not production latency guarantees. Earlier runs with much smaller 20/30 ms delays were dominated by test/logging overhead and did not show an improvement. Real browser rendering, cached-click targets and live Gemini latency remain unmeasured.

The real backend started at localhost:5001 and connected to local MongoDB quickhireai; Vite started at localhost:5173. Browser access to localhost:5173 was denied, so no alternative browser automation was attempted. Full UI, microphone, desktop/mobile, actual grading, refreshed reports and rendered PDF checks remain outstanding. Mongo connection was observed; submission writes in the automated flow use a database mock. Tests cover session reuse, concurrent starts, duplicate/replayed answers, pending recovery, five-question completion/refresh, permanent Gemini failure, response-body timeout, and route loading, in addition to existing interview/coding/aptitude regressions.

## Files

- Backend/src/features/interviews/controllers/{interviewController.js,questionController.js,resultController.js}
- Backend/src/features/interviews/services/{geminiService.js,questionPreparation.js}
- Backend/src/features/interviews/models/InterviewSession.js
- Backend/src/features/interviews/routes/interviewRoutes.js
- Backend/src/shared/services/geminiClient.js
- Frontend/src/features/interview/components/InterviewScreen.jsx
- Frontend/src/features/interview/services/speechRecognitionService.js
- Backend/tests/{interviewFlow.test.js,interviewSpeech.test.js,interviewLatency.test.js,unit/geminiClientLatency.test.js}

## Limits and deployment

No deployment was performed. Cold starts and external Gemini latency still vary. Initialization/submission coalescing uses process-local locks; persistent replay prevents sequential duplicates, but simultaneous requests across multiple backend instances need a shared lease before horizontal scaling. Prepared questions survive restarts, but interrupted background generation resumes on session initialization. The configured Gemini model stays unchanged; Google's model reference confirms gemini-3.8-flash: https://ai.google.dev/gemini-api/docs/models/gemini-3.8-flash . API keys remain on the backend.

The UI remains gated by evaluation for answer-dependent follow-ups. Guaranteed instant navigation during grading would require a durable asynchronous evaluation/job workflow and a decision about preserving those follow-ups; it was not silently introduced.

Final verification: 139 tests across 21 backend suites passed; frontend production build passed with the existing bundle-size warning. Syntax checks include the restored completion controller and routes. The redundant session lookup in evaluate-answer was removed after the timing run; the controller now returns 404 for a missing session instead of fabricating a session.
