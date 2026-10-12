# Fullscreen reveals an old interview report

## Root cause and reproduction path

The fullscreen handler does not call evaluation. `startInterviewCore` resumes an existing database session by interviewCode, including completed sessions. Custom mock codes were reused for new attempts. InterviewScreen initialization accepted `status === completed` plus any truthy finalEvaluation, setting completion before fullscreen entry. `handleFullscreenEntered` then removed the fullscreen gate and exposed the already-selected report branch. Initialization also did not clear the completion flag and final report when the session key changed.

This is a confirmed code path, not a claim to have inspected production MongoDB. The regression fixture reproduces a completed session with an old zero report and no completed answers; the fixed application refuses to display it.

## Changes

- MockInterviewPage and interviewLifecycle.js: every new mock attempt gets a UUID session code, even when its custom label matches an earlier attempt. The session route retains that code for refresh/resume.
- InterviewScreen.jsx: replaces the independent completion/loading/processing flags with a lifecycle state, resets initialization and report ownership, validates the returned session code and ID, and only renders completed reports for the current session. Submit/skip are the only evaluation triggers. Recovery deduplicates answers and displays the server's persisted answer evaluations.
- FullscreenGate.jsx: coalesces vendor/fullscreen notifications and the request fallback into a single callback, removing delayed callbacks that could fire after unmount. Fullscreen monitoring, visibility/focus logging and security counters remain enabled.
- sessionCompletion.js, questionController.js, resultController.js, interviewController.js and interviewRoutes.js: validate completed question history, unique question/answer IDs, settled answer evaluations, report scores and persisted status. Invalid legacy completed sessions are exposed as failed without modifying or deleting their stored reports. Final, bulk-result and end endpoints refuse incomplete reports.
- Failed answer evaluations retain saved answers and a failed evaluation status. Finalization cannot publish an empty or null-score report. A retry recovers unavailable analyses, validates the report and persists it before the session becomes completed. The existing database lease and optimistic concurrency still control submission races.
- Tests and fixtures: completion validation and provider-recovery regressions; six browser tests using the real React screen and mocked HTTP/media/fullscreen boundaries.

The lifecycle is initializing → ready → in_progress → submitting/evaluating → completed, with failed state on recoverable errors. Fullscreen events update fullscreen state; they do not submit answers, evaluate or navigate to a report. Entering fullscreen before initialization finishes leaves the loading screen visible until the actual first question is ready.

## Verification

- Six Playwright browser tests passed: fullscreen entry/repeated events with no evaluation requests, refresh/remount restoration, five explicit submissions before report display, failed evaluation, stale empty report rejection, and distinct mock attempt codes for repeated labels.
- 41 backend tests passed across interview flow, latency/recovery, completion criteria, evaluation, speech and Gemini client suites.
- Syntax check passed for 128 backend files.
- Frontend production build passed.
- Frontend lint command ran and failed on repository-wide existing findings. ESLint rule counts for the modified frontend components exactly match their Git baseline; the new lifecycle helper and modified mock page have no findings. This task does not repair unrelated lint debt.

Browser tests simulate fullscreen events and mock API results; backend tests use database behavior mocks. Production MongoDB contention, real device fullscreen/media permissions and live Gemini credentials remain deployment smoke tests.

## Deployment

Deploy backend and frontend together. Start a new mock attempt rather than revisiting the URL of a completed attempt. Test fullscreen entry, repeated entry/exit, refresh while answering, five answers and evaluation failure/retry. Old reports remain stored. Legacy invalid sessions show an error rather than a zero-score report; a new mock attempt uses a separate code.

Run the browser suite with a local frontend server and:

`node node_modules/@playwright/test/cli.js test --config tests/playwright.interview.config.js`

The focused configuration uses installed Chrome; BASE_URL selects the server (default http://localhost:5173).
