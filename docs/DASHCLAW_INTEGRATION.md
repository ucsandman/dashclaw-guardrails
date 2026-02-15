# DashClaw Integration Guide

This guide explains how to use `guardrailgen` with DashClaw to test your policies offline and generate compliance reports.

## Overview

DashClaw provides production-grade runtime policy enforcement. `guardrailgen` complements this by adding:

1. **Offline policy testing** - Test policies before deploying to production
2. **Compliance reports** - Generate proof artifacts for auditors
3. **CI integration** - Run policy regression tests on every PR

## Prerequisites

- A running DashClaw instance (local or hosted)
- A DashClaw API key with read access to policies
- Node.js 18+ installed

## Quick Start

### 1. Generate Tests from DashClaw

```bash
cd packages/guardrailgen-js

node bin/guardrailgen.js generate \
  --lang js \
  --dashclaw-url https://your-dashclaw.com \
  --api-key oc_live_your_key_here \
  --out ./tests
```

**What this does:**
- Connects to your DashClaw instance
- Fetches all active policies via `GET /api/policies`
- Converts DashClaw policy format → guardrailgen YAML format
- Generates Jest tests for each policy
- Saves converted policies to `tests/dashclaw-policies.yml`

### 2. Run the Tests

```bash
cd tests
npm install
npm test
```

### 3. Generate Proof Report

```bash
cd packages/guardrailgen-js

node bin/guardrailgen.js report \
  --dashclaw-url https://your-dashclaw.com \
  --api-key oc_live_your_key_here \
  --out PROOF.md
```

## Policy Type Support

DashClaw supports 7 policy types. Here's how they map to guardrailgen tests:

| DashClaw Type | Test Support | Notes |
|---|---|---|
| `require_approval` | ✅ Full | Generates approval/no-approval test cases |
| `block_action_type` | ✅ Full | Generates block tests |
| `risk_threshold` | ⚠️ Partial | Mapped to block rule with metadata |
| `rate_limit` | ⚠️ Partial | Mapped to block rule with metadata |
| `webhook_check` | ⚠️ Partial | Mapped to approval rule with metadata |
| `behavioral_anomaly` | ⚠️ Limited | Placeholder tests only |
| `semantic_check` | ⚠️ Limited | Placeholder tests only |

**Full support** means the policy can be fully tested offline with deterministic pass/fail.

**Partial support** means the policy is converted with metadata comments, but tests may be simplified.

**Limited support** means placeholder tests are generated; these policies require runtime context (embeddings, LLM calls) that can't be replicated offline.

## Policy Conversion Details

### Example: `require_approval`

**DashClaw format:**
```json
{
  "id": "gp_abc123",
  "name": "External sends require approval",
  "policy_type": "require_approval",
  "rules": {
    "action_types": ["message.send", "email.send"]
  },
  "active": 1
}
```

**Converted to:**
```yaml
version: 1
project: your-dashclaw-com
policies:
  - id: gp_abc123
    description: External sends require approval
    applies_to:
      tools:
        - message.send
        - email.send
    rule:
      require: approval
    tests:
      - name: blocks_without_approval
        input:
          tool: message.send
          args: {}
          approval: false
        expect:
          allowed: false
      - name: allows_with_approval
        input:
          tool: message.send
          args: {}
          approval: true
        expect:
          allowed: true
```

### Custom Test Cases

DashClaw policies can include embedded test cases in the `rules.tests` field:

```json
{
  "policy_type": "require_approval",
  "rules": {
    "action_types": ["email.send"],
    "tests": [
      {
        "name": "custom_test_case",
        "input": {
          "tool": "email.send",
          "args": { "to": "customer@example.com" },
          "approval": false
        },
        "expect": {
          "allowed": false
        }
      }
    ]
  }
}
```

If `rules.tests` exists, those test cases will be used instead of auto-generated ones.

## CI Integration

### GitHub Actions Workflow

Create `.github/workflows/guardrails-ci.yml`:

```yaml
name: DashClaw Policy Tests

on:
  pull_request:
  push:
    branches: [main]
  schedule:
    - cron: '0 0 * * *' # Daily

jobs:
  test-policies:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      
      - name: Install guardrailgen
        run: |
          cd packages/guardrailgen-js
          npm install
      
      - name: Fetch policies from DashClaw
        run: |
          cd packages/guardrailgen-js
          node bin/guardrailgen.js generate \
            --lang js \
            --dashclaw-url ${{ secrets.DASHCLAW_URL }} \
            --api-key ${{ secrets.DASHCLAW_API_KEY }} \
            --out ../../ci-tests
      
      - name: Run policy tests
        run: |
          cd ci-tests
          npm install
          npm test
      
      - name: Generate proof report
        if: always()
        run: |
          cd packages/guardrailgen-js
          node bin/guardrailgen.js report \
            --dashclaw-url ${{ secrets.DASHCLAW_URL }} \
            --api-key ${{ secrets.DASHCLAW_API_KEY }} \
            --out ../../ci-tests/PROOF.md
      
      - name: Upload proof artifact
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: policy-proof
          path: ci-tests/PROOF.md
```

**Required secrets:**
- `DASHCLAW_URL` - Your DashClaw instance URL
- `DASHCLAW_API_KEY` - API key with read access to policies

## Use Cases

### 1. Pre-Deployment Testing

Before deploying a new policy to DashClaw production:

1. Create the policy in DashClaw (set `active: 0`)
2. Run `guardrailgen generate` to fetch it
3. Review generated tests
4. Add custom test cases if needed
5. Run tests locally
6. If tests pass, activate the policy in DashClaw

### 2. Compliance Audits

Generate a proof report for compliance review:

```bash
guardrailgen report \
  --dashclaw-url https://prod.dashclaw.com \
  --api-key $READONLY_KEY \
  --out compliance-report-2026-02.md
```

### 3. Policy Regression Testing

Run daily CI checks to ensure policies still behave as expected:

```yaml
schedule:
  - cron: '0 0 * * *' # Every day at midnight
```

### 4. Multi-Environment Validation

Compare policies across environments:

```bash
# Staging
guardrailgen generate --dashclaw-url https://staging.dash.com --out staging-tests

# Production
guardrailgen generate --dashclaw-url https://prod.dash.com --out prod-tests

# Diff the YAML files
diff staging-tests/dashclaw-policies.yml prod-tests/dashclaw-policies.yml
```

## Limitations

1. **No write operations** - `guardrailgen` is read-only; it cannot create/update policies in DashClaw
2. **No guard decision history** - Proof reports don't include recent guard decision stats (yet)
3. **Simplified rule mapping** - Some advanced DashClaw policy types are mapped to simpler formats
4. **No runtime context** - Tests are deterministic; behavioral_anomaly and semantic_check policies can't be fully tested offline

## Roadmap

- [ ] Fetch guard decision history for proof reports
- [ ] Policy simulation (replay historical actions against new policies)
- [ ] Support for writing policies back to DashClaw
- [ ] Advanced test generation for rate_limit policies
- [ ] Policy diff tool (compare two DashClaw instances)

## Troubleshooting

### "Failed to connect to DashClaw: 401"
- Check your API key is correct
- Ensure the key has read access to policies
- Verify the API key hasn't been revoked

### "Invalid response from DashClaw API: missing policies array"
- Check your DashClaw URL is correct
- Ensure you're using a compatible DashClaw version
- Try accessing `/api/policies` directly in a browser

### "No active policies found"
- All policies in DashClaw are set to `active: 0`
- Only active policies are converted and tested
- Check DashClaw dashboard to activate policies

## Support

For issues with:
- **DashClaw runtime enforcement** → [DashClaw repo](https://github.com/ucsandman/DashClaw)
- **Test generation/proof reports** → [guardrails repo](https://github.com/ucsandman/dashclaw-guardrails)
