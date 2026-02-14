import sys
import yaml


def usage() -> None:
    print(
        """guardrailgen\n\nCommands:\n  validate <guardrails.yml>\n\nPlanned:\n  generate --lang js|py --out <dir>\n  report --results <json> --out <md>\n"""
    )


def load_policy(path: str) -> dict:
    with open(path, "r", encoding="utf-8") as f:
        return yaml.safe_load(f)


def validate_policy(pol: dict) -> None:
    if not pol or pol.get("version") != 1:
        raise ValueError("policy.version must be 1")
    policies = pol.get("policies")
    if not isinstance(policies, list):
        raise ValueError("policy.policies must be a list")
    for p in policies:
        if not p.get("id"):
            raise ValueError("policy missing id")
        if not p.get("rule"):
            raise ValueError(f"policy {p.get('id')} missing rule")
        applies = p.get("applies_to") or {}
        tools = applies.get("tools")
        if not isinstance(tools, list) or not tools:
            raise ValueError(f"policy {p.get('id')} applies_to.tools required")


def main() -> None:
    args = sys.argv[1:]
    if not args or "--help" in args or "-h" in args:
        usage()
        return

    cmd = args[0]
    if cmd == "validate":
        if len(args) < 2:
            raise SystemExit("validate requires guardrails.yml path")
        pol = load_policy(args[1])
        validate_policy(pol)
        print("OK validate")
        return

    usage()
    raise SystemExit(1)


if __name__ == "__main__":
    main()
