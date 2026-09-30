# Migration Notes: Code Execution Unification

## Why this was done
Previously, the `QuickHireAI` backend had two entirely separate code execution engines:
1. `features/coding/services/judgeService.js` (used for standard coding problems)
2. `features/scholastic/services/CodeExecutionService.js` (used for mock tests and aptitude coding)

The scholastic implementation used insecure local execution fallbacks (`vm` modules, shelling out to local python processes) which failed in many environments and posed a severe security risk. It also contained a "fake" grading logic where it would mark a C++ solution as Accepted just because it was longer than 30 characters.

## What changed
1. Both services have been completely deleted.
2. A new, unified code execution engine has been created at `src/shared/services/codeExecution/`.
3. The unified engine strictly uses external sandboxes (Judge0 as primary, OneCompiler as fallback) and never executes code on the local Node application server.
4. The scholastic coding controller was updated to remove the "fake" hardcoded test cases fallback. It now correctly returns a 422 if an admin forgets to add test cases to a problem.
5. `docker-compose.judge0.yml` was added to `infra/judge0` to encourage self-hosting Judge0 for reliable production use.

## How to use
Any new module that requires running untrusted user code should import `executeCode` or `runTestCases` from `src/shared/services/codeExecution` and pass it the source code, language, and test cases.
