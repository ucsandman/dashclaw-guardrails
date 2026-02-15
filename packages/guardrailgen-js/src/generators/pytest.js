/**
 * Pytest test generator (stub for now - will implement after Jest is proven)
 */

export function generatePytestTests(policyDoc) {
  const { project, policies } = policyDoc;
  
  let output = `# Auto-generated guardrails tests for: ${project || 'unknown'}
# DO NOT EDIT - regenerate with: guardrailgen generate --lang py

import pytest
from evaluator import evaluate_policy

`;

  for (const policy of policies) {
    output += `# Policy: ${policy.id}\n`;
    output += `# TODO: implement pytest generator\n\n`;
  }
  
  return output;
}

export function generateRequirementsTxt() {
  return `pytest>=7.4.0
`;
}
