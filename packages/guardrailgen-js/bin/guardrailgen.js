#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';
import { generateJestTests, generatePackageJson, generateJestConfig } from '../src/generators/jest.js';
import { generatePytestTests, generateRequirementsTxt } from '../src/generators/pytest.js';
import { generateMarkdownReport, generateJsonReport } from '../src/report.js';

function usage() {
  console.log(`guardrailgen

Commands:
  validate <guardrails.yml>
  generate --lang js|py --policy <guardrails.yml> --out <dir>
  report --policy <guardrails.yml> [--out <path>] [--format md|json]
`);
}

function loadPolicy(file) {
  const txt = fs.readFileSync(file, 'utf8');
  const obj = yaml.load(txt);
  return obj;
}

function validatePolicy(pol) {
  if (!pol || pol.version !== 1) throw new Error('policy.version must be 1');
  if (!Array.isArray(pol.policies)) throw new Error('policy.policies must be an array');
  for (const p of pol.policies) {
    if (!p.id) throw new Error('policy missing id');
    if (!p.rule) throw new Error(`policy ${p.id} missing rule`);
    if (!p.applies_to || !Array.isArray(p.applies_to.tools)) throw new Error(`policy ${p.id} applies_to.tools required`);
  }
}

function parseArgs(args) {
  const parsed = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith('--')) {
      const key = args[i].slice(2);
      const value = args[i + 1];
      parsed[key] = value;
      i++;
    }
  }
  return parsed;
}

const args = process.argv.slice(2);
if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
  usage();
  process.exit(0);
}

const cmd = args[0];
try {
  if (cmd === 'validate') {
    const file = args[1];
    if (!file) throw new Error('validate requires guardrails.yml path');
    const pol = loadPolicy(file);
    validatePolicy(pol);
    console.log('OK validate');
    process.exit(0);
  }

  if (cmd === 'generate') {
    const opts = parseArgs(args.slice(1));
    if (!opts.policy) throw new Error('--policy <guardrails.yml> required');
    if (!opts.out) throw new Error('--out <dir> required');
    if (!opts.lang) throw new Error('--lang js|py required');
    
    const pol = loadPolicy(opts.policy);
    validatePolicy(pol);
    
    const outDir = opts.out;
    fs.mkdirSync(outDir, { recursive: true });
    
    if (opts.lang === 'js') {
      // Generate Jest tests
      const testCode = generateJestTests(pol);
      fs.writeFileSync(path.join(outDir, 'guardrails.test.js'), testCode);
      
      // Copy evaluator
      const evaluatorSrc = fs.readFileSync(new URL('../src/evaluator.js', import.meta.url), 'utf8');
      fs.mkdirSync(path.join(outDir, 'src'), { recursive: true });
      fs.writeFileSync(path.join(outDir, 'src/evaluator.js'), evaluatorSrc);
      
      // Generate package.json
      const pkgJson = generatePackageJson(pol.project || 'guardrails');
      fs.writeFileSync(path.join(outDir, 'package.json'), pkgJson);
      
      // Generate jest.config.js
      const jestConfig = generateJestConfig();
      fs.writeFileSync(path.join(outDir, 'jest.config.js'), jestConfig);
      
      console.log(`✓ Generated Jest tests in ${outDir}`);
      console.log(`  Run: cd ${outDir} && npm install && npm test`);
    } else if (opts.lang === 'py') {
      // Generate Pytest tests (stub)
      const testCode = generatePytestTests(pol);
      fs.writeFileSync(path.join(outDir, 'test_guardrails.py'), testCode);
      
      const reqsTxt = generateRequirementsTxt();
      fs.writeFileSync(path.join(outDir, 'requirements.txt'), reqsTxt);
      
      console.log(`✓ Generated Pytest tests in ${outDir} (stub - not yet implemented)`);
    } else {
      throw new Error(`Unsupported language: ${opts.lang}`);
    }
    
    process.exit(0);
  }

  if (cmd === 'report') {
    const opts = parseArgs(args.slice(1));
    if (!opts.policy) throw new Error('--policy <guardrails.yml> required');
    
    const pol = loadPolicy(opts.policy);
    validatePolicy(pol);
    
    const format = opts.format || 'md';
    let content;
    
    if (format === 'md') {
      content = generateMarkdownReport(pol);
    } else if (format === 'json') {
      content = generateJsonReport(pol);
    } else {
      throw new Error(`Unsupported format: ${format}`);
    }
    
    if (opts.out) {
      fs.writeFileSync(opts.out, content);
      console.log(`✓ Generated ${format.toUpperCase()} report: ${opts.out}`);
    } else {
      console.log(content);
    }
    
    process.exit(0);
  }

  usage();
  process.exit(1);
} catch (e) {
  console.error(String(e?.message || e));
  process.exit(1);
}
