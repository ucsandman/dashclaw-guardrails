# dashclaw-guardrails

OpenClaw-first guardrails as code, with test generation and proof artifacts.

## Goal
Turn a simple policy file into:
- runnable tests (JS Jest, Python Pytest)
- diffable proof artifacts (JSON + Markdown)

## Status
Scaffolded MVP repo skeleton (policy schema, example policy file, JS and Python package stubs).

## Next steps
- Implement policy evaluator (deterministic)
- Implement generators for Jest and Pytest
- Add GitHub Actions workflow to run tests and upload proof artifacts
