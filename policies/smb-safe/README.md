# SMB-Safe Policy Pack

Conservative guardrails for small businesses running AI agents in production.

## Philosophy

**When in doubt, block it.** SMBs can't afford a rogue agent sending bad emails to customers or deleting important files. These policies prioritize safety over speed.

## Policies Included

| Policy | Action | What It Does |
|---|---|---|
| `external_comms_require_approval` | Require Approval | All outbound messages/emails need human sign-off |
| `destructive_operations_blocked` | Block | File deletion, DB drops, and destructive commands are blocked |
| `exec_commands_allowlist` | Block (with allowlist) | Only safe shell commands are permitted |
| `web_fetch_domain_allowlist` | Block | Web requests limited to approved domains |

## When to Use

- You're deploying agents for the first time
- Agents interact with customers (email, messaging)
- You handle sensitive data (financial, medical, personal)
- You want maximum safety with manual approval gates

## Quick Start

### Standalone (guardrailgen CLI)
```bash
guardrailgen generate \
  --lang js \
  --policy policies/smb-safe/policies.yml \
  --out ./tests

cd tests && npm install && npm test
```

### DashClaw Import
Create each policy via the DashClaw API or dashboard UI. Map `require: approval` to `require_approval` policy type and `block: true` to `block_action_type`.

## Customization

**Common adjustments:**
- Add your domains to `web_fetch_domain_allowlist` by updating the allowlist
- Add safe commands to `exec_commands_allowlist`
- For internal-only messages (agent-to-agent), consider removing from `external_comms_require_approval`

## Test Coverage

4 policies, 7 test cases. All tests verify both block and allow scenarios.
