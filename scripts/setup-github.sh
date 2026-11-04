#!/usr/bin/env bash
# Active les protections GitHub du TP avec la CLI `gh` (https://cli.github.com, `gh auth login` fait).
# Usage : ./scripts/setup-github.sh <utilisateur>/<repo>   (ex. cyprien9694/devsecops-tp)
# À lancer une première fois APRÈS le premier push, puis relancer la partie "branche protégée"
# quand le job CodeQL a tourné au moins une fois (pour que son nom de check existe).
set -euo pipefail
R="${1:?Usage: $0 <utilisateur>/<repo>}"

echo "→ Secret scanning + push protection"
gh api -X PATCH "repos/$R" \
  -f 'security_and_analysis[secret_scanning][status]=enabled' \
  -f 'security_and_analysis[secret_scanning_push_protection][status]=enabled' >/dev/null

echo "→ Dependabot alerts + security updates"
gh api -X PUT "repos/$R/vulnerability-alerts" >/dev/null
gh api -X PUT "repos/$R/automated-security-fixes" >/dev/null

echo "→ CodeQL (configuration par défaut)"
gh api -X PATCH "repos/$R/code-scanning/default-setup" \
  -f state=configured -f query_suite=default -f 'languages[]=javascript-typescript' >/dev/null

if [[ "${PROTECT:-0}" == "1" ]]; then
  echo "→ Branche main protégée (PR obligatoire + checks test, deps-audit, CodeQL)"
  gh api -X PUT "repos/$R/branches/main/protection" --input - >/dev/null <<JSON
{
  "required_status_checks": {
    "strict": true,
    "contexts": ["test", "deps-audit", "Analyze (javascript-typescript)"]
  },
  "enforce_admins": false,
  "required_pull_request_reviews": { "required_approving_review_count": 0 },
  "restrictions": null
}
JSON
else
  echo "ℹ️  Relance avec PROTECT=1 une fois CodeQL passé une fois : PROTECT=1 $0 $R"
fi
echo "✅ Terminé. Vérifie dans Settings → Code security / Branches."
