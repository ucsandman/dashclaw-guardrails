# Development Policy Pack

Minimal guardrails for local development. Agents can move fast, but production access is blocked.

## Philosophy

**Trust the developer, protect production.** During development, agents need freedom to experiment. The only hard rule: never touch production systems.

## Policies Included

| Policy | Action | What It Does |
|---|---|---|
| `warn_on_destructive_ops` | Require Approval | Destructive ops need approval (safety net, not a wall) |
| `block_production_access` | Block | Production DB queries and API calls are blocked |

## Key Differences from Other Packs

- **Only 2 policies.** Minimal friction for development workflow.
- **No messaging restrictions.** Send test messages freely.
- **No exec restrictions.** Run any command locally.
- **Production access is the only hard block.** Everything else is a warning or approval.

## When to Use

- Local development and testing
- Staging environments
- Agent prototyping and experimentation
- Hackathons and proof-of-concepts

## Quick Start

```bash
guardrailgen generate \
  --lang js \
  --policy policies/development/policies.yml \
  --out ./tests

cd tests && npm install && npm test
```

## Important

**Never deploy this pack to production.** It is intentionally permissive. Use `smb-safe`, `startup-growth`, or `enterprise-strict` for production environments.

## Test Coverage

2 policies, 4 test cases.
