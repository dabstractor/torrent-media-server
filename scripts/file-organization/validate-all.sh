#!/bin/bash
# validate-all.sh - Run all validation scripts

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "========================================"
echo "  File Organization Validation Suite"
echo "========================================"
echo

# Make scripts executable
chmod +x "$SCRIPT_DIR"/*.sh

TOTAL_VALIDATIONS=0
PASSED_VALIDATIONS=0

# Run each validation script
VALIDATIONS=(
    "validate-baseline.sh:Baseline Documentation"
    "validate-api-connectivity.sh:API Connectivity"
    "validate-path-visibility.sh:Path Visibility"
    "validate-download-workflow.sh:Download Workflow"
)

for validation in "${VALIDATIONS[@]}"; do
    script="${validation%%:*}"
    name="${validation##*:}"

    echo "=== Running $name Validation ==="
    ((TOTAL_VALIDATIONS++))

    if "$SCRIPT_DIR/$script"; then
        echo "✓ $name: PASSED"
        ((PASSED_VALIDATIONS++))
    else
        echo "✗ $name: FAILED"
    fi
    echo
done

echo "========================================"
echo "  Validation Summary"
echo "========================================"
echo "Passed: $PASSED_VALIDATIONS/$TOTAL_VALIDATIONS"

if [ $PASSED_VALIDATIONS -eq $TOTAL_VALIDATIONS ]; then
    echo "✓ ALL VALIDATIONS PASSED"
    echo "File organization is working correctly!"
    exit 0
else
    echo "✗ SOME VALIDATIONS FAILED"
    echo "File organization needs fixes."
    exit 1
fi