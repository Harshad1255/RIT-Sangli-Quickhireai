# QuickHire AI QA Report

## Executive summary

This assessment was executed against the codebase in the current workspace and validated with fresh command output. The most significant confirmed defect is an application logic bug in the aptitude slot-state evaluator: before a slot starts, the code returns `closed` instead of `scheduled`, and during the active window it also returns `closed`. The root cause is in [Backend/src/features/aptitude/utils/slotUtils.js](Backend/src/features/aptitude/utils/slotUtils.js), where `resolveSlotState` compares `Date` objects against raw string values (`slot.startTime`, `slot.endTime`) without normalizing them first. The available evidence is captured by the failing Jest regression in [tests/api/slot-state-regression.test.js](tests/api/slot-state-regression.test.js).

Additional risk areas were identified via source review and dependency scans. The frontend includes placeholder company routes in [Frontend/src/App.jsx](Frontend/src/App.jsx#L127-L140), and the backend/frontend dependency audits report high-risk advisories in `mongoose`, `nodemailer`, `js-yaml`, `minimatch`, and `nanoid`. The environment is currently incomplete for full end-to-end validation because the project has no `.env` values loaded for `MONGODB_URI`, `JWT_SECRET`, and `GEMINI_API_KEY`, so live API/auth/AI flows remain partly blocked by setup rather than cleanly passing.

### Verified command evidence

- `cd Backend && npm test -- --runInBand` -> failed: 1 suite failed, 3 tests failed, 8 passed.
- `cd QuickHireAI && npm run test:api` -> failed: 1 suite failed, 2 tests failed.
- `cd QuickHireAI && npm run test:e2e` -> passed: 1 test passed in a unauthenticated route check, but this does not validate the protected-company flow due no session being established.
- `cd QuickHireAI && npm run test:load` -> failed because `k6` is not installed in the environment.
- `npm audit --json` on Backend and Frontend -> both package sets report multiple high-severity advisories.

## Coverage matrix by module

| Module | Coverage status | Evidence | Notes |
| --- | --- | --- | --- |
| Auth & accounts | Blocked by missing env and test DB | Source review only | No real JWT/OTP flows executed in this workspace |
| Authorization / IDOR | Blocked by missing env and live auth state | Source review only | Requires seeded company/student/admin users |
| Company interview flow | Partial | Source review of routes and existing test scaffold | Not fully proven without seeded Mongo data |
| Candidate/student interview flow | Partial | No live DB session available | Needs valid interview codes and role-authenticated sessions |
| AI / Gemini | Blocked | No valid API key / no mocked live request harness | Must be tested with stubbed provider results |
| Proctoring & security | Partial | Source review of assessment wrappers not executed live | Requires browser automation with webcam/mic permissions |
| Aptitude module | Confirmed defect | [Backend/src/features/aptitude/utils/slotUtils.js](Backend/src/features/aptitude/utils/slotUtils.js); [tests/api/slot-state-regression.test.js](tests/api/slot-state-regression.test.js) | Failing regression duplicates existing issue |
| Coding module | Partial | Existing utility tests only | Execution orchestrator tests exist but no real provider/integration env |
| Scholastic module | Blocked | No DB/auth/test data | Source review only |
| Input validation & security | Partial | Dep audit + review of route patterns | No live payload injection test run |
| Frontend / UX | Partial | [Frontend/src/App.jsx](Frontend/src/App.jsx#L127-L140) | Layout risk remains in source; unauthenticated E2E did not reach it |
| Data integrity & reliability | Blocked | No Mongo test DB and no restart test | Requires seeded / production-like environment |
| Performance / load | Blocked | `k6` missing | Script added in [tests/load/quickhire-load.js](tests/load/quickhire-load.js) |
| Deployment / config | Partial | Source review of startup env checks in [Backend/server.js](Backend/server.js) | Missing env vars are logged, but app still starts and warns instead of failing fast |

## Full test-case table

| ID | Area | Steps | Expected | Actual | Status | Severity | Evidence |
| --- | --- | --- | --- | --- | --- | --- | --- |
| AUTH-01 | Auth | Register valid company | Created user / success 201 | Not executed | Blocked | — | Missing env/test DB |
| AUTH-02 | Auth | Register duplicate email | 409 or duplicate error | Not executed | Blocked | — | Missing env/test DB |
| AUTH-03 | Auth | Login valid student/company | JWT returned | Not executed | Blocked | — | Missing env/test DB |
| AUTH-04 | Auth | JWT tampering | 401 | Not executed | Blocked | — | No live auth harness |
| AUTH-05 | Auth | Refresh token reuse | 401 or invalidated | Not executed | Blocked | — | No live auth harness |
| SEC-01 | Security | NoSQL injection payload in auth body | 400 / sanitized rejection | Not executed | Blocked | — | Requires live API with DB |
| SEC-02 | Security | XSS payload in candidate name or feedback | Escaped / rejected | Not executed | Blocked | — | Requires live app and browser verification |
| APT-01 | Aptitude | Compare slot before start time | `scheduled` | Received `closed` | Fail | Critical | [tests/api/slot-state-regression.test.js](tests/api/slot-state-regression.test.js) |
| APT-02 | Aptitude | Active window check | `active` | Received `closed` | Fail | Critical | [tests/api/slot-state-regression.test.js](tests/api/slot-state-regression.test.js) |
| UX-01 | Frontend | Visit company settings route | Functional page / no placeholder | Route exists as bare placeholder in source | Partial | Medium | [Frontend/src/App.jsx](Frontend/src/App.jsx#L127-L140) |
| UX-02 | Frontend | Visit company team route | Functional page / no placeholder | Route exists as bare placeholder in source | Partial | Medium | [Frontend/src/App.jsx](Frontend/src/App.jsx#L127-L140) |
| LDR-01 | Load | Execute `k6` smoke test | Endpoint success under load | Command failed because `k6` absent | Blocked | High | `npm run test:load` |
| DEP-01 | Dependencies | Run `npm audit` | No critical or high advisories | High/critical findings present | Fail | High | Backend and Frontend audit output |

## Pass/fail counts

- Backend baseline suite: 1 failed, 1 passed; 3 tests failed, 8 tests passed.
- Root API regression suite: 1 failed suite, 2 failed tests.
- E2E route check: 1 test passed in the current unauthenticated environment.
- Load suite: Blocked by missing `k6` tool; command exits 1.

## Defects sorted by severity

### Critical

1. Slot state regression in aptitude timing logic
   - Reproduction: run `cd QuickHireAI && npm run test:api` or inspect the function in [Backend/src/features/aptitude/utils/slotUtils.js](Backend/src/features/aptitude/utils/slotUtils.js).
   - Expected: before start time => `scheduled`; during active window => `active`.
   - Actual: both cases return `closed`.
   - Evidence: failing Jest output from `npm run test:api`.
   - Suspected root cause: the function compares `now` to string timestamps without converting them to `Date` objects before evaluating, and it likely never handles `slot.status` or raw string values correctly.
   - Suggested fix: normalize `slot.startTime` and `slot.endTime` to `Date` objects with `new Date(...)` and assess `now < start`, `now >= start && now < end` before returning.

### High

2. Dependency advisories expose known vulnerabilities in production packages
   - Reproduction: run `cd Backend && npm audit --json` and `cd Frontend && npm audit --json`.
   - Expected: no critical/high advisories should remain unresolved.
   - Actual: both package sets report multiple high-severity advisories, including `mongoose` (NoSQL sanitization), `nodemailer`, `minimatch`, `js-yaml`, and `nanoid`.
   - Evidence: audit output from both package roots.
   - Suspected root cause: package versions are behind patched upstream releases.
   - Suggested fix: update to patched versions and re-run `npm audit` until no known high/critical advisories remain.

3. Load testing path is not ready for execution
   - Reproduction: run `cd QuickHireAI && npm run test:load`.
   - Expected: k6 script executes and returns latency/error metrics.
   - Actual: command fails with `'k6' is not recognized...`.
   - Evidence: command output from `npm run test:load`.
   - Suspected root cause: the performance harness is defined but the tool is not installed in the environment.
   - Suggested fix: install `k6` or switch to an alternative tool and document the exact runner command in the repo.

### Medium

4. Placeholder routes remain in company dashboard navigation
   - Reproduction: view [Frontend/src/App.jsx](Frontend/src/App.jsx#L127-L140) and inspect the routes for `settings` and `team`.
   - Expected: real pages or a proper 404/redirect to a production route.
   - Actual: both routes currently render bare `<div>Settings Page</div>` and `<div>Team Management Page</div>` placeholders.
   - Evidence: source review confirms placeholder route implementations.
   - Suspected root cause: router scaffolding was left unfinished during initial dashboard construction.
   - Suggested fix: replace with final components or a governed redirect/404 flow before production release.

### Low

5. Incomplete release readiness due missing service configuration
   - Reproduction: launch the backend without setting `MONGODB_URI`, `JWT_SECRET`, and `GEMINI_API_KEY`.
   - Expected: the app should fail fast with a clear startup error.
   - Actual: [Backend/server.js](Backend/server.js) logs missing values but continues startup, allowing the service to run in a partially configured state.
   - Evidence: server logs and source review.
   - Suspected root cause: environment validation is warning-only rather than fail-fast.
   - Suggested fix: enforce required environment variables in the startup path and reject startup when critical values are absent.

## Top 10 risks (security first)

1. NoSQL injection risk through Mongoose sanitization issues and unsafe query patterns.
2. IDOR / privilege escalation risk in company-student and company-company separation logic.
3. Slot time logic corruption affecting aptitude scheduling and candidate access.
4. Placeholder company dashboard routes exposing incomplete UX / navigation gaps.
5. Missing fail-fast env validation for secrets and DB connectivity.
6. Unverified AI safety / prompt-injection handling for Gemini evaluation.
7. Unvalidated security-event ingestion for webcam / mic / tab-switch proctoring.
8. Code execution sandbox risk in arbitrary execution environment.
9. File upload and download path traversal / content-type spoofing risk.
10. Unpatched transitive dependency advisories across backend and frontend.

## Release recommendation

### NO-GO

This project should not be released as-is. The primary blocker is the confirmed aptitude timing defect, which directly affects interview scheduling and can misclassify valid slots as closed. The second blocker is the risk profile from dependency advisories and insufficiently validated auth/authorization flows. The environment is also not yet ready for a release because the required API credentials and startup configuration are missing, and the load/performance harness cannot be executed without `k6`.

A release may be reconsidered after:

1. Fixing the slot-state logic in [Backend/src/features/aptitude/utils/slotUtils.js](Backend/src/features/aptitude/utils/slotUtils.js).
2. Upgrading vulnerable dependencies from the `npm audit` output.
3. Completing a seeded database auth flow and IDOR validation.
4. Replacing placeholder dashboard routes in [Frontend/src/App.jsx](Frontend/src/App.jsx#L127-L140).
5. Running the actual live API and E2E suites with valid env values and seeded data.

## Repository artifacts added during QA

- [tests/api/slot-state-regression.test.js](tests/api/slot-state-regression.test.js)
- [tests/e2e/company-dashboard.spec.js](tests/e2e/company-dashboard.spec.js)
- [tests/load/quickhire-load.js](tests/load/quickhire-load.js)
- [tests/playwright.config.js](tests/playwright.config.js)
- [tests/jest.config.js](tests/jest.config.js)
- [package.json](package.json)
