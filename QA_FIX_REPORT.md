# QA Fix Report

## Fix 1 — QA-FIX-1: Aptitude slot state always returned "closed"

### Root cause
The slot-state function compared a Date instance (`now`) against raw ISO strings without converting them to dates first. Because the comparisons were coerced across mismatched types, they evaluated as invalid and fell through to `closed`.

### Files changed
- [Backend/src/features/aptitude/utils/slotUtils.js](Backend/src/features/aptitude/utils/slotUtils.js)
- [Backend/src/features/aptitude/utils/slotUtils.test.js](Backend/src/features/aptitude/utils/slotUtils.test.js)
- [tests/api/slot-state-regression.test.js](tests/api/slot-state-regression.test.js)

### Tests added
- scheduled before start time
- active during time window
- existing slot utility tests retained

### Before / after
Before:
- `cd Backend && npm test -- --runInBand` failed with 3 failing tests
- `cd QuickHireAI && npm run test:api` failed with 2 failing tests

After:
- `cd Backend && npm test -- --runInBand`
  - Result: 3 test suites passed, 16 tests passed, 0 failed
- `cd QuickHireAI && npm run test:api`
  - Result: 1 suite passed, 2 tests passed, 0 failed

### Remaining risk
The broader QA checklist still contains other unaudited modules, but the confirmed timing defect is fixed and covered.

---

## Fix 2 — QA-FIX-2: Secret leakage and missing production config handling

### Root cause
The repository contained secret-bearing environment data in a tracked file and package scripts, and startup logged the first characters of the Gemini key. The application also warned instead of stopping in production when required environment values were missing.

### Files changed
- [.gitignore](.gitignore)
- [Backend/.env.example](Backend/.env.example)
- [Backend/server.js](Backend/server.js)
- [Backend/scripts/create-env.js](Backend/scripts/create-env.js)
- [Backend/test-env.js](Backend/test-env.js)
- [Backend/src/config/env.js](Backend/src/config/env.js)
- [Backend/src/config/env.test.js](Backend/src/config/env.test.js)

### Tests added
- environment validation cases for:
  - all present
  - missing MONGODB_URI
  - missing JWT_SECRET
  - weak JWT_SECRET in production
  - development vs production behavior for GEMINI_API_KEY

### Before / after
Before:
- the repo had historical secret exposure through `.env` and generated env files
- startup only logged warnings and proceeded even with missing production settings

After:
- `cd Backend && npm test -- --runInBand`
  - Result: 3 test suites passed, 16 tests passed, 0 failed

### Manual follow-up required
- rotate any previously exposed MongoDB, Gemini, Cloudinary, SMTP, and OneCompiler credentials
- configure production environment variables in the actual deployment host
- install k6 if you want to run the load suite locally
