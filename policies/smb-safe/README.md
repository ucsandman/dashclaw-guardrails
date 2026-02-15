# SMB-Safe Policy Pack

Conservative guardrails for small and mid-size businesses. Strong defaults, minimal configuration.

## What's Included

| Policy | Type | Description |
|--------|------|-------------|
| `external_comms_require_approval` | Approval | All outbound messages/emails need human sign-off |
| `block_destructive_fs` | Block | File deletion and removal operations blocked |
| `block_arbitrary_code_exec` | Block | Shell/code execution blocked by default |
| `financial_actions_require_approval` | Approval | Payments, billing, invoices need approval |
| `data_export_requires_approval` | Approval | Data exports need human sign-off |

## Who This Is For

- Teams deploying AI agents for the first time
- Businesses handling customer data or financial transactions
- Anyone who wants safe defaults without writing policies from scratch

## Quick Start

```bash
# Validate the policy file
guardrailgen validate policies/smb-safe/guardrails.yml

# Generate tests
guardrailgen generate policies/smb-safe/guardrails.yml -o tests/smb-safe.test.js

# Run tests
npx jest tests/smb-safe.test.js

# Generate compliance proof
guardrailgen report policies/smb-safe/guardrails.yml -o reports/smb-safe-proof.md
```

## Customization

This pack is intentionally strict. To loosen specific policies:

1. Copy `guardrails.yml` to your project
2. Remove policies you don't need
3. Add `allowlist` entries for trusted tools
4. Re-run `guardrailgen validate` to confirm your changes are valid

## Test Coverage

5 policies, 11 test cases. All deterministic, no external dependencies.
