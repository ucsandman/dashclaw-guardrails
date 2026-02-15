/**
 * Jest test generator
 */

/**
 * Generate Jest test suite from a policy document
 * @param {object} policyDoc - Full policy document from guardrails.yml
 * @returns {string} Jest test code
 */
export function generateJestTests(policyDoc) {
  const { project, policies } = policyDoc;
  
  let output = `// Auto-generated guardrails tests for: ${project || 'unknown'}
// DO NOT EDIT - regenerate with: guardrailgen generate --lang js

import { evaluatePolicy } from './src/evaluator.js';

`;

  for (const policy of policies) {
    output += generatePolicyTestSuite(policy);
  }
  
  return output;
}

function generatePolicyTestSuite(policy) {
  const { id, description, tests } = policy;
  
  let suite = `describe('guardrails: ${id}', () => {
  const policy = ${JSON.stringify(policy, null, 2)};

`;

  if (!tests || tests.length === 0) {
    suite += `  test.skip('no tests defined', () => {});\n`;
  } else {
    for (const testCase of tests) {
      suite += generateTestCase(testCase);
    }
  }
  
  suite += `});\n\n`;
  return suite;
}

function generateTestCase(testCase) {
  const { name, input, expect: expected } = testCase;
  
  let test = `  test('${name}', () => {
    const input = ${JSON.stringify(input, null, 4).replace(/^/gm, '    ')};
    const result = evaluatePolicy(policy, input);
    expect(result.allowed).toBe(${expected.allowed});
`;

  if (expected.reason) {
    test += `    expect(result.reason).toMatch(/${expected.reason}/i);\n`;
  }
  
  test += `  });\n\n`;
  return test;
}

/**
 * Generate package.json with Jest config
 */
export function generatePackageJson(projectName) {
  return JSON.stringify({
    name: `${projectName}-guardrails-tests`,
    version: '1.0.0',
    type: 'module',
    scripts: {
      test: 'node --experimental-vm-modules node_modules/jest/bin/jest.js'
    },
    devDependencies: {
      jest: '^29.7.0'
    }
  }, null, 2);
}

/**
 * Generate Jest config
 */
export function generateJestConfig() {
  return `export default {
  testEnvironment: 'node',
  transform: {},
  testMatch: ['**/*.test.js'],
  collectCoverageFrom: ['src/**/*.js'],
};
`;
}
