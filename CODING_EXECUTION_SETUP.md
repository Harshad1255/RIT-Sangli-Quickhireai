# Code Execution Setup

The QuickHire AI platform uses a unified code execution orchestration service. It is designed to evaluate untrusted code submissions safely via remote containerized environments. It is strictly forbidden to run user code directly on the Node backend.

## Provider Architecture

We support two providers:
1. **Judge0** (Primary/Recommended): Should be self-hosted via `docker-compose` for performance, cost, and reliability during contests.
2. **OneCompiler** (Fallback): Used if Judge0 is unavailable.

## Configuration (.env)

```env
# Enable code execution globally
CODE_EXECUTION_ENABLED=true

# Source code limits
CODE_MAX_SOURCE_LENGTH=50000

# Primary and Fallback Providers
CODE_EXECUTION_PROVIDER=judge0
CODE_EXECUTION_FALLBACK_PROVIDER=onecompiler

# Judge0 Settings (Use your self-hosted URL in production)
JUDGE0_API_URL=http://localhost:2358
# JUDGE0_API_KEY=your_key_if_configured

# OneCompiler Settings
ONECOMPILER_API_URL=https://api.onecompiler.com/v1/run
ONECOMPILER_API_KEY=your_onecompiler_api_key
```

## Self-Hosting Judge0

A production-ready Judge0 configuration is available in `infra/judge0/`.

To start:
```bash
cd infra/judge0
docker-compose -f docker-compose.judge0.yml up -d
```

Ensure the server has Docker installed and privileged mode allowed for cgroups manipulation. Do not expose Judge0's API directly to the public internet; only the backend should communicate with it.
