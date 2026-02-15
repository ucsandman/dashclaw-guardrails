# DashClaw Policy Simulator Implementation

**Feature:** Test policy changes against historical data before activating them.

**Endpoint:** `POST /api/guard/simulate`

---

## API Route Implementation

**File:** `app/api/guard/simulate/route.js`

```javascript
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { getOrgId, getOrgRole } from '../../../lib/org';
import { evaluateGuard } from '../../../lib/guard';
import { getSql } from '../../../lib/db.js';

/**
 * POST /api/guard/simulate - Test a policy against historical actions
 * 
 * Body: {
 *   policy: { name, policy_type, rules },
 *   date_range?: { start: "2026-02-01", end: "2026-02-14" },
 *   agent_id?: "my-agent",
 *   limit?: 100
 * }
 * 
 * Returns: {
 *   total_actions: 150,
 *   would_allow: 120,
 *   would_block: 20,
 *   would_warn: 8,
 *   would_require_approval: 2,
 *   impacted_agents: ["agent-1", "agent-2"],
 *   sample_blocks: [...],
 *   sample_warnings: [...]
 * }
 */
export async function POST(request) {
  try {
    const orgId = getOrgId(request);
    const role = getOrgRole(request);
    const sql = getSql();
    const body = await request.json();

    // Validate input
    if (!body.policy) {
      return NextResponse.json({ error: 'policy is required' }, { status: 400 });
    }

    const { policy, date_range, agent_id, limit = 100 } = body;

    // Build query to fetch historical actions
    const conditions = ['org_id = $1'];
    const params = [orgId];
    let idx = 2;

    if (agent_id) {
      conditions.push(`agent_id = $${idx++}`);
      params.push(agent_id);
    }

    if (date_range?.start) {
      conditions.push(`timestamp_start >= $${idx++}`);
      params.push(date_range.start);
    }

    if (date_range?.end) {
      conditions.push(`timestamp_start <= $${idx++}`);
      params.push(date_range.end);
    }

    const where = conditions.join(' AND ');
    const query = `
      SELECT 
        id, action_type, risk_score, agent_id, 
        systems_touched, reversible, declared_goal,
        timestamp_start
      FROM action_records
      WHERE ${where}
      ORDER BY timestamp_start DESC
      LIMIT $${idx}
    `;
    params.push(Math.min(limit, 1000)); // Cap at 1000 for safety

    const actions = await sql.query(query, params);

    // Simulate policy evaluation against each action
    const results = {
      total_actions: actions.length,
      would_allow: 0,
      would_block: 0,
      would_warn: 0,
      would_require_approval: 0,
      impacted_agents: new Set(),
      sample_blocks: [],
      sample_warnings: [],
    };

    // Create temporary policy object for evaluation
    const tempPolicy = {
      id: 'sim_temp',
      name: policy.name,
      policy_type: policy.policy_type,
      rules: typeof policy.rules === 'string' ? policy.rules : JSON.stringify(policy.rules),
      active: 1,
    };

    for (const action of actions) {
      const context = {
        action_type: action.action_type,
        risk_score: action.risk_score,
        agent_id: action.agent_id,
        systems_touched: action.systems_touched ? JSON.parse(action.systems_touched) : [],
        reversible: action.reversible,
        declared_goal: action.declared_goal,
      };

      // Simulate evaluation with this policy only
      const result = await evaluateGuard(orgId, context, sql, {
        includeSignals: false,
        // Pass single policy to evaluate
        _simulationPolicy: tempPolicy,
      });

      // Count results
      if (result.decision === 'allow') {
        results.would_allow++;
      } else if (result.decision === 'block') {
        results.would_block++;
        if (results.sample_blocks.length < 5) {
          results.sample_blocks.push({
            action_id: action.id,
            action_type: action.action_type,
            agent_id: action.agent_id,
            timestamp: action.timestamp_start,
            reason: result.reasons.join('; '),
          });
        }
        if (action.agent_id) results.impacted_agents.add(action.agent_id);
      } else if (result.decision === 'warn') {
        results.would_warn++;
        if (results.sample_warnings.length < 5) {
          results.sample_warnings.push({
            action_id: action.id,
            action_type: action.action_type,
            agent_id: action.agent_id,
            timestamp: action.timestamp_start,
            warnings: result.warnings,
          });
        }
      } else if (result.decision === 'require_approval') {
        results.would_require_approval++;
        if (results.sample_blocks.length < 5) {
          results.sample_blocks.push({
            action_id: action.id,
            action_type: action.action_type,
            agent_id: action.agent_id,
            timestamp: action.timestamp_start,
            reason: 'Would require approval: ' + result.reasons.join('; '),
          });
        }
        if (action.agent_id) results.impacted_agents.add(action.agent_id);
      }
    }

    results.impacted_agents = Array.from(results.impacted_agents);

    return NextResponse.json({
      ...results,
      policy_name: policy.name,
      date_range: date_range || { note: 'No date range specified - used latest actions' },
      limit_applied: params[params.length - 1],
    });
  } catch (err) {
    console.error('[GUARD/SIMULATE] Error:', err);
    return NextResponse.json({ error: 'Internal server error', details: err.message }, { status: 500 });
  }
}
```

---

## Library Update: `app/lib/guard.js`

**Add support for simulation mode:**

```javascript
// Add this parameter to evaluateGuard function signature
export async function evaluateGuard(orgId, context, sql, options = {}) {
  // If simulation mode, use only the provided policy
  let policies;
  if (options._simulationPolicy) {
    policies = [options._simulationPolicy];
  } else {
    policies = await sql`
      SELECT id, name, policy_type, rules
      FROM guard_policies
      WHERE org_id = ${orgId} AND active = 1
    `;
  }

  // ... rest of function stays the same
}
```

---

## Usage Examples

### Test a New Policy Before Activating

```bash
curl -X POST https://dash.example.com/api/guard/simulate \
  -H "x-api-key: oc_live_xxx" \
  -H "Content-Type: application/json" \
  -d '{
    "policy": {
      "name": "Block high-risk actions",
      "policy_type": "risk_threshold",
      "rules": {
        "threshold": 70,
        "action": "block"
      }
    },
    "date_range": {
      "start": "2026-02-01",
      "end": "2026-02-14"
    }
  }'
```

**Response:**
```json
{
  "policy_name": "Block high-risk actions",
  "total_actions": 150,
  "would_allow": 130,
  "would_block": 15,
  "would_warn": 5,
  "would_require_approval": 0,
  "impacted_agents": ["agent-1", "agent-2"],
  "sample_blocks": [
    {
      "action_id": "ar_abc123",
      "action_type": "file.delete",
      "agent_id": "agent-1",
      "timestamp": "2026-02-10T14:30:00Z",
      "reason": "Block high-risk actions: Risk score 85 >= threshold 70"
    }
  ],
  "sample_warnings": [],
  "date_range": { "start": "2026-02-01", "end": "2026-02-14" },
  "limit_applied": 100
}
```

### Test Against Specific Agent

```bash
curl -X POST https://dash.example.com/api/guard/simulate \
  -H "x-api-key: oc_live_xxx" \
  -H "Content-Type: application/json" \
  -d '{
    "policy": {
      "name": "Require approval for external sends",
      "policy_type": "require_approval",
      "rules": {
        "action_types": ["email.send", "message.send"]
      }
    },
    "agent_id": "my-agent",
    "limit": 50
  }'
```

---

## UI Integration (Policies Page)

Add "Simulate" button next to each policy:

```javascript
// In /app/policies/page.js

const handleSimulate = async (policy) => {
  const response = await fetch('/api/guard/simulate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      policy: {
        name: policy.name,
        policy_type: policy.policy_type,
        rules: policy.rules,
      },
      date_range: {
        start: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(), // Last 14 days
        end: new Date().toISOString(),
      },
      limit: 100,
    }),
  });

  const result = await response.json();
  
  // Show modal with results
  setSimulationResult(result);
  setShowSimulationModal(true);
};
```

**Modal component:**
```javascript
function SimulationResultModal({ result, onClose }) {
  return (
    <div className="modal">
      <h2>Policy Simulation: {result.policy_name}</h2>
      
      <div className="stats-grid">
        <Stat label="Total Actions" value={result.total_actions} />
        <Stat label="Would Allow" value={result.would_allow} color="green" />
        <Stat label="Would Block" value={result.would_block} color="red" />
        <Stat label="Would Warn" value={result.would_warn} color="yellow" />
        <Stat label="Require Approval" value={result.would_require_approval} color="orange" />
      </div>

      {result.impacted_agents.length > 0 && (
        <div>
          <h3>Impacted Agents</h3>
          <ul>
            {result.impacted_agents.map(agent => <li key={agent}>{agent}</li>)}
          </ul>
        </div>
      )}

      {result.sample_blocks.length > 0 && (
        <div>
          <h3>Sample Blocked Actions</h3>
          {result.sample_blocks.map(block => (
            <div key={block.action_id} className="sample-block">
              <code>{block.action_type}</code> by {block.agent_id}
              <br />
              <small>{block.reason}</small>
            </div>
          ))}
        </div>
      )}

      <button onClick={onClose}>Close</button>
    </div>
  );
}
```

---

## Testing

```bash
# Create test file: app/api/guard/simulate/route.test.js

import { POST } from './route';
import { NextRequest } from 'next/server';

describe('POST /api/guard/simulate', () => {
  it('simulates policy against historical actions', async () => {
    const req = new NextRequest('http://localhost:3000/api/guard/simulate', {
      method: 'POST',
      headers: { 'x-org-id': 'org_test' },
      body: JSON.stringify({
        policy: {
          name: 'Test Policy',
          policy_type: 'risk_threshold',
          rules: { threshold: 80 }
        },
        limit: 10
      })
    });

    const response = await POST(req);
    const data = await response.json();

    expect(data.total_actions).toBeGreaterThanOrEqual(0);
    expect(data.would_allow).toBeDefined();
    expect(data.would_block).toBeDefined();
  });
});
```

---

## Middleware Update

Add `/api/guard/simulate` to protected routes:

```javascript
// In middleware.js - already covered by /api/guard/* pattern
// No changes needed
```

---

## Migration (None Required)

This feature doesn't require any database changes. It only reads from existing tables.

---

## Performance Considerations

1. **Limit cap:** Maximum 1000 actions to prevent timeouts
2. **Signal check disabled:** `includeSignals: false` to avoid expensive queries
3. **Sample limits:** Only store first 5 blocks/warnings to keep response size small
4. **Index usage:** Query uses existing indexes on `org_id`, `agent_id`, `timestamp_start`

---

## Security

- ✅ Requires authentication (protected by middleware)
- ✅ Org-scoped (only simulates against org's own actions)
- ✅ No data modification (read-only)
- ✅ Rate limited (via middleware)

---

## Next Steps

1. Create `/api/guard/simulate/route.js`
2. Update `app/lib/guard.js` to support `_simulationPolicy` option
3. Add "Simulate" button to policies UI
4. Add simulation result modal component
5. Test with production data
6. Document in API docs

**Estimated effort:** 2-3 hours
