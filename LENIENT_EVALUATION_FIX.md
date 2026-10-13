# Lenient interview evaluation and provisional reports

## Cause

Gemini failures produced `unavailable` answers with null scores. Completion required every saved answer to be `evaluated` or `skipped`, so one quota failure prevented a persisted final report. Previous logs show HTTP 429 / RESOURCE_EXHAUSTED, not an invalid key. Editing an API key cannot by itself guarantee quota availability.

## Behavior

- AI scoring uses flexible ranges for excellent, good, partial, weak, minimal and irrelevant answers, and accepts imperfect speech transcription. Blank answers remain zero.
- Each failed AI evaluation receives deterministic provisional assessment. Evidence includes question/rubric terms, related concept groups, minor spelling variants and relevant HR experience. Length alone adds no marks. Fallback credit is capped at 6.5/10 and does not verify correctness; confidence and failure cause are stored.
- Answers persist before evaluation. Provisional answers now permit normal completion; pending or missing answers still cannot trigger premature completion.
- Backend computes question marks, total marks, attempted count and percentage from saved answers. Question maximum marks default to 10. Unequal maxima are preserved. Follow-up questions contribute their configured marks like other issued questions.
- Reports persist in the interview session and company/mock report records. Report status is provisional whenever any fallback answer exists. UI, PDF and restored sessions identify provisional results.
- Company owners can POST `/api/interviews/retry-evaluation/:interviewCode` or use Retry AI evaluation in Candidate Reports. Each request retries at most two provisional answers. Repeat if more remain. Successfully evaluated answers replace provisional scores; a continuing AI outage preserves existing scores. Ownership checks and the session lease prevent unauthorized or overlapping changes. A repeated request repairs a failed company report write without adding answers or marks.
- Mock reports remain available, but their records currently have no authenticated owner; company-only retry does not permit claiming a mock session.

## Files

Backend:
- `src/features/interviews/services/fallbackEvaluation.js` — evidence assessment, marks and totals.
- `src/features/interviews/services/geminiService.js` — flexible rubric, bounded attempts, provisional fallback and summary.
- `src/features/interviews/services/sessionCompletion.js` — permit completed provisional reports.
- `src/features/interviews/controllers/resultController.js` — completion, report persistence and PDF labels.
- `src/features/interviews/controllers/retryEvaluationController.js` — owner-authorized replacement.
- `src/features/interviews/controllers/interviewController.js` — preserve totals when saving results.
- `src/features/interviews/models/Interview.js` — persist status, provenance and marks.
- `src/features/interviews/routes/interviewRoutes.js` — authenticated company retry route.

Frontend:
- `src/features/interview/services/interviewLifecycle.js` — restore provisional reports.
- `src/features/interview/components/FinalEvaluation.jsx` — student status, provenance and marks.
- `src/features/company/components/CandidateReports.jsx` — status, marks and retry action.
- `src/features/company/components/ViewReport.jsx` — company report status and percentage.

Tests: fallbackEvaluation, retryEvaluation, interviewEvaluation, interviewFlow, interviewLatency and browser interview-fullscreen tests. Existing sessionCompletion and Gemini diagnostics checks are also run.

## Limits

Fallback assessment is intentionally provisional and may miss valid paraphrases or credit a mentioned concept despite an incorrect explanation. Review it before recruitment decisions. Runtime database or network persistence failures still require retry. This patch cannot restore Gemini quota or validate a live deployed database without deployment and an authorized test session.

## Verification

Targeted backend evaluation, persistence, completion, provider diagnostics and retry tests passed. The regression that attempts to submit fabricated browser scores also passed. All 11 Chrome interview tests passed, including a provisional report restored after refresh. Frontend production build and backend syntax checks passed. Browser/API tests use simulated provider responses and database models; a live deployed MongoDB/Gemini interview was not run.
