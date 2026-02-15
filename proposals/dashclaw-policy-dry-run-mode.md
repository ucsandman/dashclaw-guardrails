# DashClaw Policy Dry-Run Mode Implementation

**Feature:** Test policies in production without blocking actions (shadow mode).

**Modes:** `enforce` (default), `dry-run`, `disabled`

---

## Database Migration

**File:** `scripts/migrate-policy-dry-run.mjs`

```javascript
import 'dotenv/config';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);

async function migrate() {
  console.log('Starting policy dry-run migration...');

  // Step 1: Add mode column to guard_policies
  await sql`
    ALTER TABLE guard_policies 
    ADD COLUMN IF NOT EXISTS mode TEXT DEFAULT 'enforce'
  `.catch((err) => {
    if (!err.message.includes('already exists')) throw err;
  });
  console.log('✓ Added mode column to guard_policies');

  // Step 2: Add policy_mode column to guard_decisions
  await sql`
    ALTER TABLE guard_decisions 
    ADD COLUMN IF NOT EXISTS policy_mode TEXT
  `.catch((err) => {
    if (!err.message.includes('already exists')) throw err;
  });
  console.log('✓ Added policy_mode column to guard_decisions');

  // Step 3: Add index for dry-run queries
  await sql`
    CREATE INDEX IF NOT EXISTS idx_guard_decisions_policy_mode 
    ON guard_decisions(org_id, policy_mode, created_at)
  `.catch((err) => {
    if (!err.message.includes('already exists')) throw err;
  });
  console.log('✓ Created index on guard_decisions.policy_mode');

  console.log('✅ Migration complete');
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
```

**Run migration:**
```bash
node scripts/_run-with-env.mjs scripts/migrate-policy-dry-run.mjs
```

---

## Schema Update

**File:** `schema/schema.js`

```javascript
// Update guard_policies table
export const guardPolicies = pgTable('guard_policies', {
  // ... existing columns ...
  mode: text('mode').default('enforce'), // 'enforce', 'dry-run', 'disabled'
  // ... existing columns ...
});

// Update guard_decisions table
export const guardDecisions = pgTable('guard_decisions', {
  // ... existing columns ...
  policyMode: text('policy_mode'), // Records which mode the policy was in during evaluation
  // ... existing columns ...
});
```

---

## Validation Update

**File:** `app/lib/validate.js`

```javascript
export function validatePolicy(input) {
  // ... existing validation ...

  // Validate mode
  const validModes = ['enforce', 'dry-run', 'disabled'];
  if (data.mode && !validModes.includes(data.mode)) {
    errors.push(`mode must be one of: ${validModes.join(', ')}`);
  }

  // ... rest of validation ...
}
```

---

## Core Evaluator Update

**File:** `app/lib/guard.js`

```javascript
export async function evaluateGuard(orgId, context, sql, options = {}) {
  // If simulation mode, use only the provided policy
  let policies;
  if (options._simulationPolicy) {
    policies = [options._simulationPolicy];
  } else {
    // Fetch only enforce + dry-run policies (skip disabled)
    policies = await sql`
      SELECT id, name, policy_type, rules, mode
      FROM guard_policies
      WHERE org_id = ${orgId} 
        AND active = 1
        AND mode IN ('enforce', 'dry-run')
    `;
  }

  const reasons = [];
  const warnings = [];
  const matchedPolicies = [];
  let highestDecision = 'allow';
  let effectiveMode = 'enforce'; // Track most restrictive mode

  for (const policy of policies) {
    let rules;
    try {
      rules = JSON.parse(policy.rules);
    } catch {
      continue; // skip malformed
    }

    const result = await evaluatePolicy(policy, rules, context, sql, orgId);
    if (result) {
      // Check policy mode
      const policyMode = policy.mode || 'enforce';
      
      if (policyMode === 'dry-run') {
        // Log as warning instead of blocking
        warnings.push(`[DRY-RUN] ${policy.name}: ${result.reason}`);
        matchedPolicies.push(policy.id);
        effectiveMode = 'dry-run';
        // Don't escalate decision in dry-run mode
      } else {
        // Normal enforce mode
        applyResult(result, policy, reasons, warnings, matchedPolicies);
        if (DECISION_SEVERITY[result.action] > DECISION_SEVERITY[highestDecision]) {
          highestDecision = result.action;
        }
      }
    }
  }

  // ... rest of function (webhook policies, signal check, logging) ...

  // Override decision if ALL matching policies are dry-run
  const allDryRun = matchedPolicies.length > 0 && effectiveMode === 'dry-run';
  const finalDecision = allDryRun ? 'allow' : highestDecision;

  // Log decision with policy mode
  const decisionId = `gd_${randomUUID().replace(/-/g, '').slice(0, 24)}`;
  const dlpFindings = [];
  const safeContextForLog = redactAny(context, dlpFindings);
  
  sql`
    INSERT INTO guard_decisions (
      id, org_id, agent_id, decision, reason, matched_policies, 
      context, risk_score, action_type, policy_mode, created_at
    )
    VALUES (
      ${decisionId},
      ${orgId},
      ${context.agent_id || null},
      ${finalDecision},
      ${reasons.join('; ') || null},
      ${JSON.stringify(matchedPolicies)},
      ${JSON.stringify(safeContextForLog)},
      ${context.risk_score != null ? context.risk_score : null},
      ${context.action_type || null},
      ${effectiveMode},
      ${evaluated_at}
    )
  `.catch(() => {});

  return {
    decision: finalDecision,
    reasons,
    warnings,
    matched_policies: matchedPolicies,
    risk_score: context.risk_score != null ? context.risk_score : null,
    evaluated_at,
    effective_mode: effectiveMode, // Return mode for debugging
  };
}
```

---

## API Update: Policy CRUD

**File:** `app/api/policies/route.js`

**POST - Allow mode field:**
```javascript
export async function POST(request) {
  // ... existing code ...

  const { valid, data, errors } = validatePolicy(body);
  if (!valid) {
    return NextResponse.json({ error: 'Validation failed', details: errors }, { status: 400 });
  }

  const mode = data.mode || 'enforce'; // Default to enforce

  await sql`
    INSERT INTO guard_policies (id, org_id, name, policy_type, rules, active, mode, created_by, created_at, updated_at)
    VALUES (${id}, ${orgId}, ${data.name}, ${data.policy_type}, ${data.rules}, ${active}, ${mode}, ${body.created_by || null}, ${now}, ${now})
  `;

  // ... rest of function ...
}
```

**PATCH - Allow mode updates:**
```javascript
export async function PATCH(request) {
  // ... existing code ...

  if (body.mode != null) {
    const validModes = ['enforce', 'dry-run', 'disabled'];
    if (!validModes.includes(body.mode)) {
      return NextResponse.json({ error: 'Invalid mode' }, { status: 400 });
    }
    sets.push(`mode = $${idx++}`);
    params.push(body.mode);
  }

  // ... rest of function ...
}
```

---

## UI Update: Policies Page

**File:** `app/policies/page.js`

**Add mode toggle:**
```javascript
function PolicyCard({ policy, onUpdate }) {
  const [mode, setMode] = useState(policy.mode || 'enforce');

  const handleModeChange = async (newMode) => {
    const response = await fetch('/api/policies', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: policy.id, mode: newMode }),
    });

    if (response.ok) {
      setMode(newMode);
      onUpdate();
    }
  };

  return (
    <Card>
      <CardHeader>
        <h3>{policy.name}</h3>
        <Badge variant={policy.active ? 'success' : 'secondary'}>
          {policy.active ? 'Active' : 'Inactive'}
        </Badge>
        <Badge variant={getModeVariant(mode)}>
          {mode.toUpperCase()}
        </Badge>
      </CardHeader>

      <CardContent>
        <p>{policy.description || 'No description'}</p>

        <div className="mode-selector">
          <label>Mode:</label>
          <select value={mode} onChange={(e) => handleModeChange(e.target.value)}>
            <option value="enforce">Enforce (Block/Warn)</option>
            <option value="dry-run">Dry-Run (Observe Only)</option>
            <option value="disabled">Disabled</option>
          </select>
        </div>
      </CardContent>
    </Card>
  );
}

function getModeVariant(mode) {
  switch (mode) {
    case 'enforce': return 'danger';
    case 'dry-run': return 'warning';
    case 'disabled': return 'secondary';
    default: return 'secondary';
  }
}
```

---

## New Analytics Endpoint: Dry-Run Impact

**File:** `app/api/guard/dry-run-impact/route.js`

```javascript
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { getOrgId } from '../../../lib/org';
import { getSql } from '../../../lib/db.js';

/**
 * GET /api/guard/dry-run-impact - Analyze dry-run policy impact
 * 
 * Query: ?policy_id=gp_xxx&days=7
 * 
 * Returns: {
 *   policy_name: "Test Policy",
 *   mode: "dry-run",
 *   days_active: 7,
 *   total_evaluations: 150,
 *   would_have_blocked: 25,
 *   would_have_warned: 10,
 *   impacted_agents: ["agent-1"],
 *   recommendation: "Safe to enforce - low false positive rate"
 * }
 */
export async function GET(request) {
  try {
    const orgId = getOrgId(request);
    const sql = getSql();
    const { searchParams } = request.nextUrl;

    const policyId = searchParams.get('policy_id');
    const days = parseInt(searchParams.get('days') || '7', 10);

    if (!policyId) {
      return NextResponse.json({ error: 'policy_id required' }, { status: 400 });
    }

    // Fetch policy
    const policies = await sql`SELECT * FROM guard_policies WHERE id = ${policyId} AND org_id = ${orgId}`;
    if (policies.length === 0) {
      return NextResponse.json({ error: 'Policy not found' }, { status: 404 });
    }
    const policy = policies[0];

    // Fetch dry-run decisions for this policy
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
    
    const decisions = await sql`
      SELECT decision, agent_id, matched_policies, reason, warnings
      FROM guard_decisions
      WHERE org_id = ${orgId}
        AND policy_mode = 'dry-run'
        AND created_at >= ${since}
        AND matched_policies::text LIKE ${`%${policyId}%`}
    `;

    const stats = {
      total_evaluations: decisions.length,
      would_have_blocked: 0,
      would_have_warned: 0,
      would_have_required_approval: 0,
      impacted_agents: new Set(),
    };

    decisions.forEach(d => {
      // Parse warnings to determine what would have happened
      const warnings = d.warnings ? JSON.parse(d.warnings) : [];
      const dryRunWarning = warnings.find(w => w.includes('[DRY-RUN]'));
      
      if (dryRunWarning) {
        if (dryRunWarning.includes('block')) stats.would_have_blocked++;
        else if (dryRunWarning.includes('approval')) stats.would_have_required_approval++;
        else stats.would_have_warned++;
        
        if (d.agent_id) stats.impacted_agents.add(d.agent_id);
      }
    });

    // Generate recommendation
    const blockRate = stats.total_evaluations > 0 
      ? stats.would_have_blocked / stats.total_evaluations 
      : 0;
    
    let recommendation;
    if (stats.total_evaluations < 10) {
      recommendation = 'Not enough data - continue dry-run mode';
    } else if (blockRate < 0.05) {
      recommendation = 'Safe to enforce - very low block rate (<5%)';
    } else if (blockRate < 0.20) {
      recommendation = 'Moderate impact - review blocked actions before enforcing';
    } else {
      recommendation = 'High impact - policy may be too strict, review thoroughly';
    }

    return NextResponse.json({
      policy_name: policy.name,
      mode: policy.mode,
      days_active: days,
      ...stats,
      impacted_agents: Array.from(stats.impacted_agents),
      block_rate: blockRate,
      recommendation,
    });
  } catch (err) {
    console.error('[GUARD/DRY-RUN-IMPACT] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

---

## Usage Examples

### Create Policy in Dry-Run Mode

```bash
curl -X POST https://dash.example.com/api/policies \
  -H "x-api-key: oc_live_xxx" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Block high-risk actions (testing)",
    "policy_type": "risk_threshold",
    "rules": {
      "threshold": 70,
      "action": "block"
    },
    "mode": "dry-run",
    "active": 1
  }'
```

### Switch Policy from Dry-Run to Enforce

```bash
curl -X PATCH https://dash.example.com/api/policies \
  -H "x-api-key: oc_live_xxx" \
  -H "Content-Type": application/json" \
  -d '{
    "id": "gp_abc123",
    "mode": "enforce"
  }'
```

### Check Dry-Run Impact

```bash
curl "https://dash.example.com/api/guard/dry-run-impact?policy_id=gp_abc123&days=7" \
  -H "x-api-key: oc_live_xxx"
```

**Response:**
```json
{
  "policy_name": "Block high-risk actions (testing)",
  "mode": "dry-run",
  "days_active": 7,
  "total_evaluations": 45,
  "would_have_blocked": 3,
  "would_have_warned": 0,
  "would_have_required_approval": 0,
  "impacted_agents": ["agent-1"],
  "block_rate": 0.067,
  "recommendation": "Moderate impact - review blocked actions before enforcing"
}
```

---

## Workflow: Safe Policy Rollout

1. **Create policy in dry-run mode** (observe, don't block)
2. **Monitor for 3-7 days** via `/api/guard/dry-run-impact`
3. **Review impact** (block rate, impacted agents, sample blocks)
4. **Adjust policy** if needed (change threshold, add exceptions)
5. **Switch to enforce mode** when confident
6. **Monitor guard decisions** for unexpected blocks

---

## SDK Update

**File:** `sdk/dashclaw.js`

```javascript
/**
 * Update a policy's mode
 * @param {string} policyId
 * @param {'enforce'|'dry-run'|'disabled'} mode
 */
async updatePolicyMode(policyId, mode) {
  return this._fetch('/api/policies', {
    method: 'PATCH',
    body: JSON.stringify({ id: policyId, mode }),
  });
}

/**
 * Get dry-run impact analysis
 * @param {string} policyId
 * @param {number} days
 */
async getDryRunImpact(policyId, days = 7) {
  return this._fetch(`/api/guard/dry-run-impact?policy_id=${policyId}&days=${days}`);
}
```

---

## Testing

```javascript
// File: __tests__/unit/lib/guard-dry-run.test.js

import { evaluateGuard } from '@/lib/guard';

describe('Policy dry-run mode', () => {
  it('does not block in dry-run mode', async () => {
    const mockSql = createMockSql([
      { id: 'gp_1', policy_type: 'block_action_type', rules: '{"action_types":["file.delete"]}', mode: 'dry-run' }
    ]);

    const result = await evaluateGuard('org_test', {
      action_type: 'file.delete',
      agent_id: 'agent-1',
    }, mockSql);

    expect(result.decision).toBe('allow');
    expect(result.warnings).toContain('[DRY-RUN]');
    expect(result.effective_mode).toBe('dry-run');
  });

  it('blocks in enforce mode', async () => {
    const mockSql = createMockSql([
      { id: 'gp_1', policy_type: 'block_action_type', rules: '{"action_types":["file.delete"]}', mode: 'enforce' }
    ]);

    const result = await evaluateGuard('org_test', {
      action_type: 'file.delete',
      agent_id: 'agent-1',
    }, mockSql);

    expect(result.decision).toBe('block');
    expect(result.effective_mode).toBe('enforce');
  });
});
```

---

## Migration Checklist

- [ ] Run migration script (`migrate-policy-dry-run.mjs`)
- [ ] Update schema.js
- [ ] Update validation.js
- [ ] Update guard.js evaluator
- [ ] Update API routes (POST/PATCH policies)
- [ ] Create dry-run-impact endpoint
- [ ] Update policies UI (mode selector)
- [ ] Update SDK methods
- [ ] Add tests
- [ ] Update docs

**Estimated effort:** 1-2 hours

---

## Benefits

1. **Zero-risk testing** - Observe policy behavior without blocking production
2. **Data-driven decisions** - See actual impact before enforcing
3. **Gradual rollout** - Test → dry-run → enforce progression
4. **A/B testing** - Compare different policy configurations
5. **False positive detection** - Identify overly strict rules early

---

## Future Enhancements

- **Auto-promote**: Automatically switch dry-run → enforce after N days with <X% block rate
- **Scheduled mode changes**: "Dry-run for 7 days, then auto-enforce"
- **Comparison mode**: Run two policy versions side-by-side (A/B test)
