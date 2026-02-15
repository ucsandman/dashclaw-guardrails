# Startup-Growth Policy Pack

Balanced guardrails for fast-moving teams. More agent autonomy where it's safe, strict gates where it matters.

## What's Included

| Policy | Type | Description |
|--------|------|-------------|
| `customer_comms_require_approval` | Approval | Customer-facing emails, support replies, social posts gated |
| `internal_comms_allowed` | Allow | Slack, Discord, internal messages flow freely |
| `block_production_fs_delete` | Block | File deletion blocked, creation/editing allowed |
| `payments_require_approval` | Approval | All financial transactions need sign-off |
| `block_destructive_db` | Block | DROP, TRUNCATE, DELETE on databases blocked |
| `deploy_requires_approval` | Approval | Production deploys need human approval |

## Who This Is For

- Startups that want agents to move fast on internal work
- Teams that need customer-facing actions gated but don't want to slow down engineering
- Growth-stage companies balancing speed with accountability

## Design Philosophy

**Internal = trust.** Agents can message teammates, update internal docs, run read-only queries.

**External = verify.** Anything customer-facing, public, or financial gets a human in the loop.

**Destructive = block.** No deleting files, dropping tables, or nuking data. Period.

## Quick Start

```bash
guardrailgen validate policies/startup-growth/guardrails.yml
guardrailgen generate policies/startup-growth/guardrails.yml -o tests/startup-growth.test.js
npx jest tests/startup-growth.test.js
```

## Test Coverage

6 policies, 14 test cases.
