# Interview progression and evaluation repair

## Confirmed application causes

- Fullscreen resume overwrote the current React question with a debounced browser snapshot. Removed that restoration; remount initialization reads the database session.
- Company interviews used the shared interview code as their session key. The screen now uses the candidate code, and initialization resolves company configuration through that code. MongoDB's session `_id` identifies the session; the unique candidate/mock code locates it.
- Submission locking was an in-process Map only. A MongoDB atomic lease now claims each session across workers. Claims increment the version; optimistic concurrency prevents an expired worker from overwriting newer saves. Calls have bounded provider timeouts; abandoned claims expire after five minutes.
- Client question metadata could affect progression. Submissions now require a persisted question ID and use server question text, order and follow-up flags.
- An evaluated answer saved before a failed final evaluation could be rejected on retry. Recovery reuses its answer and analysis, resumes finalization, and returns saved results on repeated completed requests.
- Final summaries and follow-ups used up to three 60-second provider requests, exceeding the screen's 115-second timeout. They now use single requests bounded at 20 and 15 seconds respectively. Summary provider failure retains computed scores and returns fallback feedback; answer provider failure retains null scores for manual review.
- Prepared questions could repeat later follow-ups. Delivery validates against all asked questions. Follow-up prompts include history, and duplicate follow-ups are rejected. Individual generation retries duplicates twice before a distinct fallback; coding fallbacks preserve the third-question rule.
- The screen sent another completion request with browser-owned scores. Removed it. Legacy final-evaluation and submit-all endpoints now read persisted evaluations; `/end` uses persisted answers and scores.
- Mock reports had timestamp-based keys and suppressed save failures. They now upsert by a stable mock session code. Final evaluation is saved before report persistence, allowing report retries without repeating AI evaluation. Facial confidence is converted from 0–100 to the schema's 0–10 range.

## Lifecycle and trigger audit

Company creation supplies skills and duration; candidate validation resolves the invitation and candidate code. Start creates or resumes a database session with five main questions, matching the existing application rule. React initialization shares in-flight starts; the database unique index also resolves races. Background preparation persists later main questions without delivering or advancing them.

The screen's Submit and Skip handlers share a synchronous in-flight guard and call `/evaluate-answer`, which delegates to the same controller as `/process-answer`. The controller claims the database lease, validates the active ID, saves the answer before evaluation, saves analysis, then either issues one follow-up, delivers the next main question, or finalizes after five main answers. Only this path advances the question order. `getNextQuestion` restores the already-issued question instead of generating from browser-supplied counts.

Finalization persists a stable evaluation job ID and running/completed status, reuses existing evaluation data, stores the company or mock report, and marks the session completed with a cached response. The results screen restores saved question/answer history and final evaluation on refresh. Company result reads and PDF generation use persisted reports. Company management/result routes retain their existing JWT middleware; start/answer routes retain their existing code-based access model.

The authenticated legacy submit-results endpoint and the un-routed resultController end helper remain outside the screen's normal interview flow. They are not invoked by the repaired completion path.

## Provider and deployment limits

No live Gemini key, quota, production MongoDB connection, or Render logs were used in verification. Provider access errors remain distinguishable from candidate scores; unavailable answers are not fabricated as successful evaluations. The default model is listed in Google's current model documentation: https://ai.google.dev/gemini-api/docs/models. The example environment now matches the runtime default; an explicit production GEMINI_MODEL override must be checked separately.

The persistence claim is tested with a database-behavior mock; production MongoDB contention and process-kill scenarios still need a deployment smoke test. A process crash during an external AI call can require a new call after lease expiry; persisted successful evaluations are reused.

## Verification

Run `npm run check:syntax` in Backend, the interview flow/latency/evaluation/speech and Gemini client regression suites, and `npm run build` in Frontend. Regression coverage includes duplicate submissions, another worker's lease, interrupted evaluation, report-save retries, forged IDs/metadata, refresh restoration, five-question completion, provider failures and unique coding fallbacks.

Deploy both backend and frontend changes together. In a fresh mock and company session, submit answers, pause/resume fullscreen, refresh mid-interview, retry after a connection interruption, and confirm one persisted final report with the original answer history.
