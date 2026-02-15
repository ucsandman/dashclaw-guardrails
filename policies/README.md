# Policy Cookbook

Pre-built guardrail policy packs for common use cases. Pick the pack that matches your risk tolerance, customize as needed, and generate tests.

## Packs

| Pack | Policies | Tests | Best For |
|---|---|---|---|
| [smb-safe](./smb-safe/) | 4 | 7 | Small businesses, first-time agent deployment |
| [startup-growth](./startup-growth/) | 4 | 7 | Fast-moving teams, balanced security |
| [enterprise-strict](./enterprise-strict/) | 5 | 11 | Regulated industries, compliance-driven orgs |
| [development](./development/) | 2 | 4 | Local dev, staging, prototyping |

## Usage

### Generate Tests from Any Pack

```bash
cd packages/guardrailgen-js

# Pick your pack
node bin/guardrailgen.js generate \
  --lang js \
  --policy ../../policies/enterprise-strict/policies.yml \
  --out ./enterprise-tests

cd enterprise-tests
npm install
npm test
```

### Generate Proof Report

```bash
node bin/guardrailgen.js report \
  --policy ../../policies/smb-safe/policies.yml \
  --out SMB-PROOF.md
```

## Choosing a Pack

**Start here:**
- First time deploying agents? → **smb-safe**
- Growing team, need speed? → **startup-growth**
- Auditors are asking questions? → **enterprise-strict**
- Just experimenting? → **development**

**Then customize.** Each pack is a starting point. Add, remove, or modify policies to fit your specific needs.

## Creating Your Own Pack

1. Copy any pack directory as a template
2. Edit `policies.yml` to match your requirements
3. Add test cases for each policy
4. Run `guardrailgen generate` to verify tests pass
5. Generate a proof report for documentation

## Contributing

We welcome community policy packs! See [CONTRIBUTING.md](../CONTRIBUTING.md) for guidelines.
