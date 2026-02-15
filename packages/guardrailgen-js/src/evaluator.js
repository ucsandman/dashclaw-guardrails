/**
 * Policy evaluator - deterministic logic for guardrails
 */

/**
 * Evaluate a single policy against an input action
 * @param {object} policy - Policy object from guardrails.yml
 * @param {object} input - Action input { tool, args, approval?, context? }
 * @returns {{ allowed: boolean, reason?: string, policy_id: string }}
 */
export function evaluatePolicy(policy, input) {
  const { id, applies_to, rule } = policy;
  
  // Check if policy applies to this tool
  const toolMatches = applies_to.tools?.some(pattern => {
    // Support glob-like patterns (simple implementation)
    if (pattern.includes('*')) {
      const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
      return regex.test(input.tool);
    }
    return pattern === input.tool;
  });
  
  if (!toolMatches) {
    return { allowed: true, policy_id: id, reason: 'policy does not apply' };
  }
  
  // Evaluate rule
  if (rule.block === true) {
    // Check allowlist if present
    if (rule.allowlist && Array.isArray(rule.allowlist)) {
      // For now, check if tool is in allowlist
      // More sophisticated allowlist logic can check args, context, etc.
      if (rule.allowlist.includes(input.tool)) {
        return { allowed: true, policy_id: id, reason: 'allowlisted' };
      }
    }
    return { allowed: false, policy_id: id, reason: 'blocked by policy' };
  }
  
  if (rule.require === 'approval') {
    const hasApproval = input.approval === true || input.context?.approved === true;
    if (!hasApproval) {
      return { allowed: false, policy_id: id, reason: 'approval required' };
    }
    return { allowed: true, policy_id: id, reason: 'approved' };
  }
  
  // Default allow if no blocking rule matched
  return { allowed: true, policy_id: id };
}

/**
 * Evaluate all policies against an input action
 * Returns the first blocking result, or allowed if all pass
 */
export function evaluatePolicies(policies, input) {
  for (const policy of policies) {
    const result = evaluatePolicy(policy, input);
    if (!result.allowed) {
      return result;
    }
  }
  return { allowed: true, reason: 'all policies passed' };
}
