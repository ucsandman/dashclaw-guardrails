# Startup-Growth Policy Pack

Balanced guardrails for fast-moving teams. Protects customers and data without slowing down internal operations.

## Philosophy

**Protect what matters, don't block everything.** Startups need speed. These policies add approval gates for customer-facing actions and destructive operations, but let internal work flow freely.

## Policies Included

| Policy | Action | What It Does |
|---|---|---|
| `customer_facing_comms_require_approval` | Require Approval | Customer emails and SMS need sign-off |
| `destructive_ops_require_approval` | Require Approval | Deletions need sign-off (not blocked outright) |
| `internal_messaging_allowed` | Require Approval | Internal messages need approval (customize per team) |
| `secrets_must_be_redacted` | Block | Content with API keys/secrets is blocked |

## Key Differences from SMB-Safe

- Destructive operations require **approval** instead of being **blocked**
- Internal messaging is separated from customer-facing comms
- Secret/key detection is explicit (not just DLP scanning)
- Fewer blanket restrictions, more targeted gates

## When to Use

- Your team is moving fast and can't wait for approval on everything
- You have internal agent-to-agent communication that should flow freely
- You want to protect customers without blocking internal operations
- You're scaling from 1-2 agents to a small fleet

## Quick Start

```bash
guardrailgen generate \
  --lang js \
  --policy policies/startup-growth/policies.yml \
  --out ./tests

cd tests && npm install && npm test
```

## Customization

**Common adjustments:**
- Remove `internal_messaging_allowed` if you want all messages to flow without approval
- Add specific internal domains to an allowlist for `customer_facing_comms_require_approval`
- Adjust `secrets_must_be_redacted` patterns for your specific key formats

## Test Coverage

4 policies, 7 test cases.
