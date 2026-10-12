# Interview fullscreen enforcement

## Cause

InterviewScreen's fullscreen-exit handler explicitly set the pause flag to false, so exiting left the interview visible with only a red warning. FullscreenGate also offered Continue Anyway for unsupported browsers. Recording/skip/submit handlers did not all validate live fullscreen state, and entry, pause and parent components independently listened for fullscreen changes.

## Implementation

- `Frontend/src/features/interview/services/useInterviewFullscreen.js`: one manager tracks actual fullscreen elements and vendor events, deduplicates requests, reports rejection, confirms entry and cleans up listeners. Requests invoke the Fullscreen API directly during the user's click. No fullscreen request occurs on page load.
- `Frontend/src/features/interview/components/FullscreenGate.jsx`: pre-interview screen with Start Interview in Fullscreen, session readiness, permission guidance, retryable rejection and initialization retry. Removed unsupported-browser bypass and in-app exit button.
- `Frontend/src/features/interview/components/InterviewScreen.jsx`: integrates awaiting_fullscreen/ready/in_progress lifecycle. Exiting before completion blocks interaction and stops recording. Submit, skip and record handlers validate live document fullscreen state; submission checks again after waiting for speech capture. Parent interview state stays mounted and retains questions, drafts, answers, timers and session identity. A confirmed persisted completion shows the report and exits fullscreen.
- `Frontend/src/features/interview/components/FullscreenPause.jsx`: keeps existing pause-screen proctoring and security logging, delegates Return to Fullscreen to the manager, and shows rejection/retry messages. Removed its duplicate fullscreen listener and delayed callbacks.
- `tests/e2e/interview-fullscreen.spec.js`: updated entry labels and deterministic Fullscreen API mocks; adds delayed confirmation, rejected entry, exit/re-entry with retained draft/answers, completion exit and handler-level race tests.
- This report documents results and browser constraints.

Fullscreen, blur, focus and visibility events do not submit answers or generate evaluations. Re-entry does not initialize another session or request another question. An already-started answer request may finish while the pause screen is visible; its persisted response remains the authoritative state when the candidate returns.

## Verification

- 10 browser tests passed against the real React screen, with HTTP and Fullscreen API mocks.
- 21 backend interview progression/recovery, completion and speech tests passed (4 suites).
- Frontend production build passed.
- Frontend lint ran and remains unsuccessful because of repository lint debt: 405 errors and 25 warnings. The new manager and rewritten entry screen have no ESLint findings. Remaining pause-screen findings predate this change.

Browser test command, with a local frontend server:

`node node_modules/@playwright/test/cli.js test --config tests/playwright.interview.config.js`

The configuration uses installed Chrome. Set BASE_URL for a non-default port.

## Deployment and browser constraints

Deploy the frontend commit; this change does not require a new backend API. Keep the backend's validated interview completion logic deployed. Verify actual fullscreen, camera permissions and microphone recording in the deployed browser.

Esc and browser fullscreen controls remain available: ordinary websites cannot guarantee non-exitable fullscreen. This implementation immediately locks interview actions after exit and requires user-initiated re-entry. A stricter non-exitable environment requires an administrator-managed browser or kiosk setup.

Existing saved sessions and reports are not deleted or reset.
