# Evaluation failure: measured evidence and fixes

## Verified runtime evidence (12 October 2026)

- Public Render `/healthcheck` returned HTTP 200.
- Public `/api/interviews/test` returned HTTP 200 with Access-Control-Allow-Origin matching `https://rit-sangli-quickhireai-frontend.vercel.app`.
- The deployed Vercel JavaScript bundle references `https://rit-sangli-quickhireai-2.onrender.com/api`, matching the probed backend.
- The local backend has GEMINI_API_KEY configured (the key was never printed). GET model metadata returned HTTP 200 for gemini-3.8-flash and confirmed generateContent support.
- Synthetic evaluation calls with that key returned HTTP 429 RESOURCE_EXHAUSTED. The final probe identified `generativelanguage.googleapis.com/generate_content_free_tier_requests` with reported limit 20. Other attempts hit the synthetic check's 30-second timeout. No successful live scored evaluation was observed.
- With the runtime's new 45-second budget, the final call returned the same 429 in approximately 380 ms. A longer timeout cannot repair exhausted quota.

The live quota failure is verified for the local backend key. Private Render logs and environment values were not accessible, so whether Render uses the same Google project/key remains unverified. No production interview data was created or modified by these probes.

## Failure path

The REST client previously classified most HTTP errors as UNKNOWN_ERROR; analyzeAnswer then discarded the cause and persisted unavailable scores. Final completion validation correctly refused those scores but returned only a generic unavailable error. This hid the actual provider problem. The existing connectivity script used an old SDK and a different default model from the application, so it could not verify the runtime request accurately.

A separate persistence defect affected legacy mock reports: timestamped interview IDs already occupied the unique candidate code. Retrying an upsert by the newer interview ID could attempt a second document and fail uniqueness validation. Reports now upsert through their existing candidate code, preserving one report and allowing valid evaluated results to update it.

## Changes

- `Backend/src/shared/services/geminiClient.js`: header-based credentials, specific HTTP/configuration/timeout/network/empty/blocked/token/JSON/score errors, sanitized provider metadata, thought-part filtering, bounded retries and correlated logs. Model remains gemini-3.8-flash; documented LOW thinking is set only for that model. No model was switched to bypass quota.
- `Backend/src/shared/services/evaluationDiagnostics.js`: allowlisted structured diagnostics with request/session IDs, answer counts, provider HTTP status, safe quota metadata, validation and persistence outcomes. No keys, auth headers, prompts, answer text or raw provider errors are logged.
- `Backend/src/features/interviews/services/evaluationUtils.js`: unavailable analysis retains a safe error code/message with null scores.
- `Backend/src/features/interviews/services/geminiService.js`: preserves provider causes, logs score/summary validation, removes answer-text debugging, uses a configurable 45-second answer evaluation budget and bounded recovery attempts. Invalid summary fields are rejected; optional summary fallback explicitly reports its unavailability and uses only feedback from real saved answer evaluations. It does not manufacture answer scores.
- `Backend/src/features/interviews/controllers/resultController.js`: diagnostics at receipt, session read, saves, score validation, report write and response; meaningful provider and persistence errors; failed persistence status; bounded recovery of saved unavailable answers; report-owner checks and stable legacy report upserts. Failed scoring never creates a completed zero report.
- `Backend/src/features/interviews/controllers/interviewController.js`, `Backend/src/features/interviews/routes/interviewRoutes.js`, and `Frontend/src/features/interview/components/InterviewScreen.jsx`: remove unnecessary evaluation payload/answer logging.
- `Backend/server.js`: startup logs configuration presence rather than claiming the model/key is READY without testing it.
- `Backend/scripts/check-gemini.js`: model-access and synthetic score-validation probes using the same REST client/model/configuration as runtime; prints only sanitized outcomes.
- `Backend/.env.example`: documents GEMINI_EVALUATION_TIMEOUT_MS=45000.
- `render.yaml`: includes the actual stable Vercel production origin in the blueprint. The existing deployed CORS configuration already passed the live check.
- Tests: new Gemini diagnostics matrix, quota/persistence error assertions, and updated report-retry assertions.

## Tests and limits

56 tests passed across Gemini diagnostics/client, interview evaluation, progression/recovery and completion validation (6 suites). Tests cover HTTP 400/401/403/404/429/5xx, missing credentials, malformed/empty/blocked/token-limited output, invalid scores, safe logs, thought filtering, missing answers, report failures, retries, duplicate claims and completed-session restoration. Frontend build and backend syntax checks passed. Frontend lint ran and remains blocked by existing repository debt (405 errors and 25 warnings before the final log-only cleanup).

Database persistence is tested with database-behavior mocks. A successful live AI evaluation and production report persistence could not be verified because live generation returned quota errors/timeouts and production credentials/logs were unavailable.

## Required production action

1. In Google AI Studio, open the project associated with the Render backend key and check its active quota for gemini-3.8-flash. Restore available quota (wait for the applicable reset, enable/link billing, or obtain a supported quota increase).
2. If using a different project with available quota, update **Render backend → Environment → GEMINI_API_KEY** with its key. Do not put the key in Vercel or paste it into chat. Changing keys within the same project does not create new quota.
3. Keep GEMINI_MODEL=gemini-3.8-flash unless a separate verified model configuration is intended. Optional GEMINI_EVALUATION_TIMEOUT_MS=45000 is the default.
4. Deploy the backend code. The Render blueprint should retain the stable frontend origin. Frontend requests already reached the intended service in the public bundle check.
5. Run `node scripts/check-gemini.js` from Backend (or the Render service shell). A successful check must show connectivity_evaluation ok=true and scoreValidated=true. Share only sanitized error codes if it fails.
6. Retry the saved interview. The existing lease, stored answers and stable report key prevent duplicate evaluations/reports. For more than two unavailable answers, recovery uses bounded batches so a retry does not exceed the frontend timeout.

Official references:

- https://ai.google.dev/gemini-api/docs/troubleshooting
- https://ai.google.dev/gemini-api/docs/api-errors
- https://ai.google.dev/api/generate-content
- https://ai.google.dev/gemini-api/docs/thinking
- https://ai.google.dev/gemini-api/docs/rate-limits (quota applies per project, not per key)
