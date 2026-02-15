# Enterprise-Strict Policy Pack

Maximum-security guardrails for regulated industries. Every external action gated, every mutation blocked, every access auditable.

## What's Included

| Policy | Type | Description |
|--------|------|-------------|
| `all_external_comms_require_approval` | Approval | Every outbound message, email, webhook, SMS |
| `block_all_fs_mutations` | Block | No file writes, deletes, moves, or renames |
| `block_all_code_execution` | Block | No shell commands or code evaluation |
| `block_all_db_mutations` | Block | Database is read-only (no inserts, updates, drops) |
| `financial_actions_require_approval` | Approval | Payments, billing, invoices, refunds |
| `infra_changes_require_approval` | Approval | Deploys, DNS, certs, infrastructure changes |
| `data_access_requires_approval` | Approval | Data exports, PII queries, report downloads |

## Who This Is For

- Regulated industries (healthcare, finance, government)
- SOC2, HIPAA, ISO 27001, GDPR compliance environments
- Organizations where AI agents must operate read-only by default
- Teams that need full audit trails for every agent action

## Design Philosophy

**Default deny.** If it's not explicitly allowed, it's blocked or requires approval.

**Read-only by default.** Agents can query and analyze, but cannot mutate state without human sign-off.

**Audit everything.** Every approval decision creates a compliance artifact when paired with `guardrailgen report`.

## Quick Start

```bash
guardrailgen validate policies/enterprise-strict/guardrails.yml
guardrailgen generate policies/enterprise-strict/guardrails.yml -o tests/enterprise-strict.test.js
npx jest tests/enterprise-strict.test.js
guardrailgen report policies/enterprise-strict/guardrails.yml -o reports/enterprise-compliance.md
```

## Compliance Mapping

This pack covers controls relevant to:

- **SOC2 Type II:** CC6.1 (logical access), CC6.3 (data flow restrictions), CC8.1 (change management)
- **ISO 27001:** A.9 (access control), A.12 (operations security), A.14 (system development)
- **HIPAA:** §164.312(a) (access control), §164.312(b) (audit controls)
- **GDPR:** Article 25 (data protection by design), Article 32 (security of processing)

For full compliance mapping, see the upcoming Governance Compliance Kit.

## Test Coverage

7 policies, 22 test cases.
