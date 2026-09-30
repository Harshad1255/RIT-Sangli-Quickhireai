# Coding execution setup

Coding execution is provider-only. The backend never executes submitted source with Node VM, child processes, shell commands, or a local compiler.

The current local provider is OneCompiler. Judge0 remains supported as an alternate provider by changing `CODE_EXECUTION_PROVIDER`.

Configure these variables in `Backend/.env`:

```env
CODE_EXECUTION_ENABLED=true
CODE_EXECUTION_PROVIDER=onecompiler
ONECOMPILER_API_URL=https://api.onecompiler.com/v1/run
ONECOMPILER_API_KEY=your_onecompiler_key
JUDGE0_BASE_URL=https://ce.judge0.com
JUDGE0_API_URL=https://ce.judge0.com
# Optional for a self-hosted/public deployment that does not require auth.
JUDGE0_API_KEY=your_provider_key
JUDGE0_HOST=your_provider_host
JUDGE0_POLL_INTERVAL_MS=800
JUDGE0_POLL_TIMEOUT_MS=15000
CODE_MAX_SOURCE_LENGTH=50000
```

For Judge0, set `CODE_EXECUTION_PROVIDER=judge0` and configure its URL/key variables. Keep all provider credentials on the backend; do not add them to Vite variables or frontend code.

The centralized language mapping is:

| Frontend language | Judge0 language ID |
| --- | ---: |
| `cpp`, `c++` | 54 |
| `java` | 62 |
| `javascript`, `js` | 63 |
| `python`, `py` | 71 |

These IDs correspond to the standard Judge0 CE language catalog. Confirm the IDs against the selected provider's `/languages` endpoint when using a different Judge0-compatible deployment.

## Function inputs

JavaScript and Python use a generated server-side driver for function-based solutions. The entry function defaults to `solve`; a problem can set `entryFunction`, and a single top-level function with another name is detected for existing problems. Test input is a sequence of JSON values separated by whitespace, so `[2,7,11,15] 9` calls the function with an array and a number. The return value is emitted as JSON and compared with `expectedOutput`.

C++ and Java do not use a function driver. Their solutions continue to receive the test case as stdin and must write the expected result to stdout themselves.

When the provider is missing or unavailable, the API returns `Execution Service Error`; it never marks the submission as wrong and never falls back to local execution.
