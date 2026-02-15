# dashclaw-guardrails

OpenClaw-first **guardrails-as-code** with test generation and compliance-ready proof artifacts.

## Why This Exists

Every team running AI agents in production faces the same fear: **"What if it does something bad?"**

Most guardrails guidance is scattered and conceptual. This tool makes guardrails **executable, testable, and provable**.

## What It Does

Turn a simple policy YAML into:
- ✅ **Runnable tests** (Jest for JS, Pytest for Python)
- ✅ **Proof artifacts** (JSON + Markdown reports for compliance)
- ✅ **CI integration** (GitHub Actions workflow included)

## Quick Start

### 1. Install

```bash
cd packages/guardrailgen-js
npm install
```

### 2. Define Your Policies

Create `guardrails.yml`:

```yaml
version: 1
project: my-agent
policies:
  - id: external_send_requires_approval
    description: Any external send must require approval
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
          args:
            target: someone
            message: hi
          approval: false
        expect:
          allowed: false
```

### 3. Generate Tests

**Option A: From local YAML file**
```bash
node bin/guardrailgen.js generate \
  --lang js \
  --policy guardrails.yml \
  --out ./tests
```

**Option B: From live DashClaw instance**
```bash
node bin/guardrailgen.js generate \
  --lang js \
  --dashclaw-url https://dash.example.com \
  --api-key oc_live_xxxxx \
  --out ./tests
```

This will:
1. Connect to your DashClaw instance
2. Fetch all active policies via API
3. Convert them to guardrailgen format
4. Generate runnable tests
5. Save a copy of the converted policies as `dashclaw-policies.yml`

### 4. Run Tests

```bash
cd tests
npm install
npm test
```

### 5. Generate Proof Report

**From local YAML:**
```bash
node bin/guardrailgen.js report \
  --policy guardrails.yml \
  --out PROOF.md
```

**From DashClaw:**
```bash
node bin/guardrailgen.js report \
  --dashclaw-url https://dash.example.com \
  --api-key oc_live_xxxxx \
  --out PROOF.md
```

## Example Output

**Test Results:**
```
PASS ./guardrails.test.js
  guardrails: external_send_requires_approval
    ✓ blocks_without_approval
    ✓ allows_with_approval
  
Test Suites: 1 passed
Tests: 2 passed
```

**Proof Report:** See [generated-tests/PROOF.md](generated-tests/PROOF.md)

## CI Integration

Copy [.github/workflows/guardrails-ci.yml](.github/workflows/guardrails-ci.yml) to your repo.

On every PR:
1. Tests auto-run
2. Proof report generated
3. Results posted as PR comment

## Policy Rules

### Block
```yaml
rule:
  block: true
  allowlist: []  # optional
```

### Require Approval
```yaml
rule:
  require: approval
```

## Policy Cookbook

Pre-built policy packs for common use cases. See [policies/README.md](policies/README.md).

| Pack | Best For |
|---|---|
| [smb-safe](policies/smb-safe/) | Small businesses, first-time deployment |
| [startup-growth](policies/startup-growth/) | Fast-moving teams, balanced security |
| [enterprise-strict](policies/enterprise-strict/) | Regulated industries, compliance-driven |
| [development](policies/development/) | Local dev, staging, prototyping |

## Roadmap

- [x] Jest generator + evaluator
- [x] Proof reports (MD + JSON)
- [x] GitHub Actions template
- [x] DashClaw integration (fetch policies via API)
- [x] Policy Cookbook (4 pre-built packs)
- [ ] Pytest generator
- [ ] Advanced rules (rate limits, data boundaries)
- [ ] DashClaw policy simulation (what-if analysis)

## Status

**MVP COMPLETE** ✅ Ready for production use.

See [docs/MVP.md](docs/MVP.md) for architecture details.
