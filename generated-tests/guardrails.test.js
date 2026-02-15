// Auto-generated guardrails tests for: openclaw-demo
// DO NOT EDIT - regenerate with: guardrailgen generate --lang js

import { evaluatePolicy } from './src/evaluator.js';

describe('guardrails: external_send_requires_approval', () => {
  const policy = {
  "id": "external_send_requires_approval",
  "description": "Any external send must require approval",
  "applies_to": {
    "tools": [
      "message.send",
      "email.send"
    ]
  },
  "rule": {
    "require": "approval"
  },
  "tests": [
    {
      "name": "blocks_without_approval",
      "input": {
        "tool": "message.send",
        "args": {
          "target": "someone",
          "message": "hi"
        },
        "approval": false
      },
      "expect": {
        "allowed": false
      }
    },
    {
      "name": "allows_with_approval",
      "input": {
        "tool": "message.send",
        "args": {
          "target": "someone",
          "message": "hi"
        },
        "approval": true
      },
      "expect": {
        "allowed": true
      }
    },
    {
      "name": "allows_email_with_context_approval",
      "input": {
        "tool": "email.send",
        "args": {
          "to": "user@example.com",
          "subject": "test"
        },
        "context": {
          "approved": true
        }
      },
      "expect": {
        "allowed": true
      }
    }
  ]
};

  test('blocks_without_approval', () => {
    const input =     {
        "tool": "message.send",
        "args": {
            "target": "someone",
            "message": "hi"
        },
        "approval": false
    };
    const result = evaluatePolicy(policy, input);
    expect(result.allowed).toBe(false);
  });

  test('allows_with_approval', () => {
    const input =     {
        "tool": "message.send",
        "args": {
            "target": "someone",
            "message": "hi"
        },
        "approval": true
    };
    const result = evaluatePolicy(policy, input);
    expect(result.allowed).toBe(true);
  });

  test('allows_email_with_context_approval', () => {
    const input =     {
        "tool": "email.send",
        "args": {
            "to": "user@example.com",
            "subject": "test"
        },
        "context": {
            "approved": true
        }
    };
    const result = evaluatePolicy(policy, input);
    expect(result.allowed).toBe(true);
  });

});

describe('guardrails: destructive_fs_blocked', () => {
  const policy = {
  "id": "destructive_fs_blocked",
  "description": "Deleting files is blocked unless allowlisted",
  "applies_to": {
    "tools": [
      "fs.delete",
      "exec.rm"
    ]
  },
  "rule": {
    "block": true
  },
  "tests": [
    {
      "name": "blocks_delete",
      "input": {
        "tool": "fs.delete",
        "args": {
          "path": "/tmp/whatever"
        }
      },
      "expect": {
        "allowed": false
      }
    },
    {
      "name": "blocks_rm_command",
      "input": {
        "tool": "exec.rm",
        "args": {
          "path": "/important/data"
        }
      },
      "expect": {
        "allowed": false
      }
    }
  ]
};

  test('blocks_delete', () => {
    const input =     {
        "tool": "fs.delete",
        "args": {
            "path": "/tmp/whatever"
        }
    };
    const result = evaluatePolicy(policy, input);
    expect(result.allowed).toBe(false);
  });

  test('blocks_rm_command', () => {
    const input =     {
        "tool": "exec.rm",
        "args": {
            "path": "/important/data"
        }
    };
    const result = evaluatePolicy(policy, input);
    expect(result.allowed).toBe(false);
  });

});

