# Coding execution repair

## Deployment blocker

The local configuration enables Judge0 at http://localhost:2358 with no API key and no OneCompiler key. The user confirmed no provider keys are available. Render's blueprint selects OneCompiler. A Render Node service does not automatically provide a Judge0 compiler service. Compilation cannot be validated live until a reachable sandbox provider is configured.

For the existing Render deployment set:

CODE_EXECUTION_ENABLED=true
CODE_EXECUTION_PROVIDER=onecompiler
CODE_EXECUTION_FALLBACK_PROVIDER=onecompiler
ONECOMPILER_API_URL=https://api.onecompiler.org/v1/run
ONECOMPILER_API_KEY=<your real provider key>
ONECOMPILER_REQUEST_TIMEOUT_MS=60000
CODE_EVALUATION_TIMEOUT_MS=90000

Obtain a key through https://onecompiler.org/apis/code-execution and enter it only in Render Environment. Redeploy after configuration. Alternatively use a separately hosted Judge0 service with its reachable URL, and JUDGE0_API_KEY only when that service requires authentication. localhost on Render is not the developer's machine. Self hosted Judge0 uses X-Auth-Token; RapidAPI uses its marketplace headers. No local compiler fallback was added.

## Code defects repaired

- API-level OneCompiler errors/quota failures were incorrectly reported as candidate runtime errors. Success API status alone does not describe program success. Malformed responses are infrastructure errors.
- OneCompiler's request timeout was tied to the runtime limit (usually only 7 seconds including compilation and network); transport timeout is now separate. The documented direct endpoint is used.
- Java file names follow the public class for OneCompiler; Judge0 adapts class identifiers to its required Main.java while preserving stored source code, strings and comments.
- Judge0 queued/processing jobs poll within a deadline, retain token, compile diagnostics, exit code, and real metrics. C++ requests specify C++17.
- Unknown metrics are null, not invented zeroes. Unsupported language validation and advertised language IDs are consistent.
- Entire evaluation has a deadline. Test results retain verdict and executed state. A provider failure after some tests produces a null final score, no acceptance, and no candidate/statistics update.
- Coding submissions persist evaluation state and service reason. Both coding submission routes exclude infrastructure failures from contest/progress scoring. History retains failures for retry/audit.
- Workspace guards repeated requests, preserves code on request failures, and displays unavailable scores/metrics as N/A.

## Validation boundaries

Automated adapter tests mock HTTP responses; route tests mock database saves; existing judge tests use fixture programs through a mocked provider. These do not prove live sandbox compilation or Mongo writes. The user has no provider key, so actual-interface runs for Hello World, multiple cases, compiler error, Java, Python, runtime exception, loop, wrong output, quota outage, partial score, repeated clicks, and refreshed history remain blocked pending provider setup. No success was simulated as a live provider result.

Sources: https://onecompiler.org/apis/code-execution ; https://ce.judge0.com/ ; https://github.com/judge0/judge0/blob/master/db/languages/active.rb

Final automated results: 131 tests across 19 backend suites passed; frontend production build passed (existing bundle-size warning); git diff --check passed.

Changed files: Backend/src/shared/services/codeExecution/{orchestrator.js,languageMap.js,providers/judge0Provider.js,providers/oneCompilerProvider.js,providers/javaSource.js}; Backend/src/features/coding/{controllers/codingController.js,controllers/codingProblemController.js,models/CodingSubmission.js}; Frontend/src/features/student/components/CodingWorkspace.jsx; Frontend/src/shared/services/codingExecutionMessages.js; Backend/tests/{api/codingExecutionRoutes.test.js,unit/codeExecutionProviderErrors.test.js,unit/codeProviderAdapters.test.js}; Backend/.env.example; render.yaml; CODING_EXECUTION_SETUP.md; this report.
