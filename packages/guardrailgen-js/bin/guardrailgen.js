#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';

function usage() {
  console.log(`guardrailgen

Commands:
  validate <guardrails.yml>

Planned:
  generate --lang js|py --out <dir>
  report --results <json> --out <md>
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

  usage();
  process.exit(1);
} catch (e) {
  console.error(String(e?.message || e));
  process.exit(1);
}
