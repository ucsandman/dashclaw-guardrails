# Enterprise-Strict Policy Pack

Maximum security guardrails for compliance-driven organizations.

## Philosophy

**Default deny. Approve explicitly.** Every external action, every destructive operation, every data export needs human approval or is outright blocked. Designed for teams that answer to auditors.

## Policies Included

| Policy | Action | What It Does |
|---|---|---|
| `all_external_comms_require_approval` | Require Approval | Every outbound communication needs sign-off |
| `all_destructive_operations_blocked` | Block | All destructive operations blocked (no exceptions) |
| `all_exec_commands_blocked` | Block | Shell execution completely disabled |
| `secrets_and_pii_blocked` | Block | Content with secrets/PII is blocked |
| `data_export_requires_approval` | Require Approval | All data exports need sign-off |

## Key Differences from Other Packs

- **No allowlists.** Everything is blocked or requires approval.
- **File writes are blocked** (not just deletes). Agents can read but not modify.
- **Shell execution is completely disabled.** No exceptions.
- **Data exports require approval.** Prevents unauthorized data exfiltration.
- **Outbound webhooks require approval.** Even API calls to partner systems.

## When to Use

- You operate in a regulated industry (healthcare, finance, government)
- You need to pass SOC2, ISO27001, or GDPR audits
- Your agents handle PII, financial data, or trade secrets
- Zero tolerance for unauthorized external actions
- Compliance team needs provable guardrails

## Quick Start

```bash
guardrailgen generate \
  --lang js \
  --policy policies/enterprise-strict/policies.yml \
  --out ./tests

cd tests && npm install && npm test
```

## Compliance Mapping

This pack covers controls relevant to:
- **SOC2 CC6.1** — Logical access security (exec blocked, approval gates)
- **SOC2 CC6.6** — External system interfaces (external comms require approval)
- **SOC2 CC7.2** — System monitoring (all actions logged via DashClaw)
- **ISO 27001 A.9** — Access control (default-deny posture)
- **GDPR Art. 25** — Data protection by design (PII blocking, export controls)

(Full compliance mapping available in the Governance Compliance Kit, coming soon.)

## Customization

**Caution:** Relaxing these policies may affect compliance posture. Document any changes and get approval from your compliance officer.

- To allow specific shell commands, switch `all_exec_commands_blocked` to an allowlist pattern
- To allow internal messaging, create a separate policy for internal-only tools
- Data export approval can be scoped to specific tables/formats if needed

## Test Coverage

5 policies, 11 test cases. Covers block, approval, and edge case scenarios.
