# Policy Cookbook

Pre-built guardrail policy packs you can drop into any project. Each pack includes a `guardrails.yml` with inline test cases and a README explaining the design rationale.

## Available Packs

| Pack | Policies | Tests | Use Case |
|------|----------|-------|----------|
| [**smb-safe**](./smb-safe/) | 5 | 11 | Conservative defaults for small/mid-size businesses |
| [**startup-growth**](./startup-growth/) | 6 | 14 | Balanced autonomy for fast-moving teams |
| [**enterprise-strict**](./enterprise-strict/) | 7 | 22 | Maximum security for regulated industries |
| [**development**](./development/) | 4 | 10 | Permissive dev environment with safety nets |

**Total: 22 policies, 57 test cases.**

## Choosing a Pack

```
Risk tolerance:  Low ←————————————————→ High
                  |         |         |         |
           enterprise  smb-safe  startup   development
              -strict             -growth
```

## Environment Layering

Use different packs per environment for progressive security:

| Environment | Recommended Pack |
|-------------|-----------------|
| Local dev | `development` |
| Staging | `startup-growth` |
| Production (startup) | `smb-safe` |
| Production (enterprise) | `enterprise-strict` |

## Usage

Every pack works the same way:

```bash
# Pick a pack
PACK=smb-safe

# Validate
guardrailgen validate policies/$PACK/guardrails.yml

# Generate runnable tests
guardrailgen generate policies/$PACK/guardrails.yml -o tests/$PACK.test.js

# Run tests
npx jest tests/$PACK.test.js

# Generate compliance proof
guardrailgen report policies/$PACK/guardrails.yml -o reports/$PACK-proof.md
```

## Customization

These packs are starting points. Fork, modify, combine:

1. Copy the pack closest to your needs
2. Add or remove policies
3. Adjust `applies_to` tool patterns for your stack
4. Run `guardrailgen validate` to catch errors
5. Commit your custom `guardrails.yml` alongside your code

## Contributing

New pack ideas? Open an issue or PR. Each pack needs:

- `guardrails.yml` with version, project, description, policies, and inline tests
- `README.md` explaining who it's for, what's included, and design philosophy
- All tests must pass via `guardrailgen generate` + `npx jest`
