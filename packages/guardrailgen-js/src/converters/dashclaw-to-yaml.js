/**
 * Convert DashClaw policy format to guardrailgen YAML format
 */

/**
 * Convert a single DashClaw policy to our YAML structure
 * @param {Object} policy - DashClaw policy object
 * @returns {Object} Policy in our YAML format
 */
export function convertPolicy(policy) {
  const rules = typeof policy.rules === 'string' 
    ? JSON.parse(policy.rules) 
    : policy.rules;

  // Base policy structure
  const converted = {
    id: policy.id || policy.name.toLowerCase().replace(/\s+/g, '_'),
    description: policy.name,
    applies_to: extractAppliesTo(policy.policy_type, rules),
    rule: convertRule(policy.policy_type, rules),
  };

  // Add tests if they exist in the rules
  if (rules.tests && Array.isArray(rules.tests)) {
    converted.tests = rules.tests;
  } else {
    // Generate placeholder tests
    converted.tests = generatePlaceholderTests(policy.policy_type, rules);
  }

  return converted;
}

/**
 * Extract applies_to from DashClaw policy
 */
function extractAppliesTo(policyType, rules) {
  switch (policyType) {
    case 'require_approval':
    case 'block_action_type':
      return {
        tools: rules.action_types || ['*'],
      };
    
    case 'risk_threshold':
      return {
        tools: ['*'], // Applies to all tools, filtered by risk score
      };
    
    case 'rate_limit':
      return {
        tools: ['*'], // Applies to all actions from agent
      };
    
    default:
      return {
        tools: ['*'],
      };
  }
}

/**
 * Convert DashClaw rule to our format
 */
function convertRule(policyType, rules) {
  switch (policyType) {
    case 'require_approval':
      return {
        require: 'approval',
      };
    
    case 'block_action_type':
      return {
        block: true,
      };
    
    case 'risk_threshold':
      // Map to our format with metadata comment
      return {
        block: true,
        _dashclaw_type: 'risk_threshold',
        _threshold: rules.threshold || 80,
        _action: rules.action || 'block',
      };
    
    case 'rate_limit':
      return {
        block: true,
        _dashclaw_type: 'rate_limit',
        _max_actions: rules.max_actions || 50,
        _window_minutes: rules.window_minutes || 60,
      };
    
    case 'webhook_check':
      return {
        require: 'approval',
        _dashclaw_type: 'webhook_check',
        _url: rules.url,
        _timeout_ms: rules.timeout_ms || 5000,
        _on_timeout: rules.on_timeout || 'allow',
      };
    
    case 'behavioral_anomaly':
    case 'semantic_check':
      return {
        block: true,
        _dashclaw_type: policyType,
        _note: 'Advanced policy type - test generation limited',
      };
    
    default:
      return {
        block: true,
        _dashclaw_type: policyType,
      };
  }
}

/**
 * Generate placeholder tests for policies without embedded tests
 */
function generatePlaceholderTests(policyType, rules) {
  switch (policyType) {
    case 'require_approval':
      const actionTypes = rules.action_types || ['external_send'];
      return [
        {
          name: 'blocks_without_approval',
          input: {
            tool: actionTypes[0],
            args: {},
            approval: false,
          },
          expect: {
            allowed: false,
          },
        },
        {
          name: 'allows_with_approval',
          input: {
            tool: actionTypes[0],
            args: {},
            approval: true,
          },
          expect: {
            allowed: true,
          },
        },
      ];
    
    case 'block_action_type':
      const blockedTypes = rules.action_types || ['destructive'];
      return [
        {
          name: 'blocks_action_type',
          input: {
            tool: blockedTypes[0],
            args: {},
          },
          expect: {
            allowed: false,
          },
        },
      ];
    
    default:
      return [
        {
          name: 'placeholder_test',
          input: {
            tool: 'example_tool',
            args: {},
          },
          expect: {
            allowed: false,
          },
        },
      ];
  }
}

/**
 * Convert all DashClaw policies to YAML document structure
 * @param {Array} policies - Array of DashClaw policies
 * @param {string} projectName - Project name for YAML doc
 * @returns {Object} Complete YAML document structure
 */
export function convertPolicies(policies, projectName = 'dashclaw-policies') {
  return {
    version: 1,
    project: projectName,
    policies: policies
      .filter(p => p.active !== 0) // Only include active policies
      .map(convertPolicy),
  };
}
