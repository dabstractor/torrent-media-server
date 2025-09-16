#!/bin/bash
# run-validation-with-keys.sh - Run validation with proper API keys

set -euo pipefail

# Export API keys
export SONARR_API_KEY=afde353290c6439497772562330d4eb0
export RADARR_API_KEY=1896856646174be29ab7cca907e77458

# Run validation
exec "$(dirname "$0")/validate-download-workflow.sh"