# Claude Code Instructions

## Task Master AI Instructions
**Import Task Master's development workflow commands and guidelines, treat as if import is in the main CLAUDE.md file.**
@./.taskmaster/CLAUDE.md
- Feature validation must ensure successful docker build with `docker compose up -d` as well as `docker-compose -f docker-compose.yml -f docker-compose.pia.yml up -d` and any other VPN providers that are added in the future. All variations of the docker build must instantiate all containers correctly. All containers must show "Healthy".