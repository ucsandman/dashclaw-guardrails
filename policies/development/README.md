# Development Policy Pack

Permissive guardrails for local development and testing. Stay out of the way, catch catastrophic mistakes.

## What's Included

| Policy | Type | Description |
|--------|------|-------------|
| `block_production_deploy` | Approval | Prod deploys still need a human |
| `external_email_requires_approval` | Approval | Prevent accidental external emails |
| `financial_always_gated` | Approval | Money moves always need approval |
| `block_production_db_destructive` | Block | No DROP or TRUNCATE, even in dev |

## What's NOT Blocked

- File read/write/delete (you're developing, iterate freely)
- Shell commands and code execution (the whole point of dev)
- Internal messages (Slack, Discord)
- Database reads, inserts, updates
- Staging/dev deployments

## Who This Is For

- Engineers building and testing AI agent integrations
- Local development environments
- CI/CD pipelines (pair with `enterprise-strict` for production)
- Anyone who wants a safety net without friction

## Design Philosophy

**Minimal gates, maximum velocity.** Only 4 policies, targeting the actions that are dangerous even during development:

1. You can't accidentally deploy to production
2. You can't accidentally email a client
3. You can't accidentally charge a credit card
4. You can't accidentally drop a database table

Everything else is fair game.

## Quick Start

```bash
guardrailgen validate policies/development/guardrails.yml
guardrailgen generate policies/development/guardrails.yml -o tests/development.test.js
npx jest tests/development.test.js
```

## Pairing With Other Packs

Use `development` locally, then layer on stricter packs per environment:

```
local:   development
staging: startup-growth
prod:    enterprise-strict
```

## Test Coverage

4 policies, 10 test cases.
