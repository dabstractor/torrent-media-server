name: "PRP-011: Prevent Docker Process Namespace Leaks"
description: |
  A comprehensive plan to prevent the qBittorrent container from leaking processes onto the host, ensuring all traffic is routed through the VPN and the host's IP is never exposed.

---

## Goal

**Feature Goal**: To permanently prevent the qBittorrent container and its sub-processes from running outside their designated container namespaces. This will guarantee that all traffic is routed through the VPN container, completely eliminating the risk of the host's real IP address being leaked.

**Deliverable**: A robust and permanent solution implemented across the Docker and container configurations. This includes:
- Fortified entrypoint scripts that correctly manage process supervision.
- Proper signal handling in all custom scripts.
- Correctly configured container shutdown grace periods.
- Monitoring and cleanup scripts to maintain system integrity.

**Success Definition**: The qBittorrent container and all its child processes run exclusively within their own isolated namespaces. No `qbittorrent-nox` or related processes are ever observed running on the host system. The external IP address reported by any process related to the torrenting setup consistently matches the VPN's IP address, with zero leakage of the host's real IP, confirmed through continuous monitoring.

## Why

- **Prevent Service Provider Violations**: The primary driver is to prevent the user's real IP from being exposed, which has already resulted in a service provider notice for illegal downloading. Fixing this mitigates significant personal and legal risks.
- **Ensure Privacy and Security**: The core purpose of the VPN setup is to maintain user privacy. The IP leak completely undermines this foundational goal. This fix is critical to the system's integrity and the user's peace of mind.
- **Maintain System Stability**: The process namespace leak caused a "rogue" process that was difficult to terminate, leading to user frustration and system instability. The solution will ensure predictable, reliable, and manageable container behavior.

## What

### User-Visible Behavior
- The torrenting setup will be stable and reliable.
- The user will not receive any further notices from their service provider regarding IP leaks.

### Technical Requirements
- All processes originating from the `qbittorrent` container **must** run within the container's PID and network namespaces.
- The `qbittorrent` container **must** gracefully shut down upon receiving a `SIGTERM` or `SIGINT` signal.
- The custom entrypoint script for `qbittorrent` **must not** use `nohup` and must properly manage child processes to prevent them from becoming orphaned or escaping the container's supervision.
- `docker-compose.yml` **must** define a `stop_grace_period` for `qbittorrent` and all other services that share the VPN's network namespace to allow for a clean shutdown.
- The system **will** include scripts to proactively check for and clean up any potential namespace leaks.

### Success Criteria
- [x] No `qbittorrent-nox` or related processes are ever found running on the host OS.
- [x] The external IP, when checked from within the qBittorrent environment, is always the VPN IP.
- [x] `docker-compose down` and `./scripts/cleanup_namespace_leaks.sh` result in a clean shutdown with no orphaned processes.

## All Needed Context

### Context Completeness Check

_Before writing this PRP, validate: "If someone knew nothing about this codebase, would they have everything needed to implement this successfully?"_

### Documentation & References

```yaml
# MUST READ - Include these in your context window
- docfile: [DOCKER_NAMESPACE_LEAKS.md]
  why: "Provides a complete summary of the problem, root cause, and the implemented solutions. This is the primary context document."
  section: "All"

- file: [docker-compose.yml]
  why: "The `network_mode: service:vpn` is the core of the issue. The `stop_grace_period` is a key part of the solution."
  pattern: "Observe the network_mode and the new stop_grace_period."

- file: [scripts/cleanup_namespace_leaks.sh]
  why: "This script is part of the solution to ensure a clean shutdown of the Docker environment."
  pattern: "Understand the shutdown order and cleanup steps."

- file: [scripts/check_namespace_leaks.sh]
  why: "This script is used to validate the solution and monitor for any future leaks."
  pattern: "Understand how to check for leaks."

- url: "https://blog.phusion.nl/2015/01/20/docker-and-the-pid-1-zombie-reaping-problem/"
  why: "Explains the challenges of process supervision and signal handling inside Docker containers, which is relevant to the s6-overlay issues."
  critical: "Understanding why PID 1 is special and how it affects child processes is key to understanding the root cause."
```

### Current Codebase tree

```bash
/home/dustin/projects/torrents/
├── DOCKER_NAMESPACE_LEAKS.md
├── docker-compose.yml
├── PRPs
│   ├── 010-plex-symlink-conversion.md
│   └── templates
│       └── prp_base.md
├── scripts
│   ├── check_namespace_leaks.sh
│   └── cleanup_namespace_leaks.sh
└── config
    └── qbittorrent
        ├── custom-entrypoint.sh
        └── ip_monitor.sh
```

### Desired Codebase tree with files to be added and responsibility of file

No new files. The PRP is about documenting and formalizing the already implemented changes.

### Known Gotchas of our codebase & Library Quirks

```
# CRITICAL: Linuxserver.io images with s6-overlay can leak processes when using `network_mode: service:<container>`.
# This happens because s6-overlay's process supervisor can get confused about the namespace and attach processes to the host.
# Using `nohup` in entrypoint scripts exacerbates this by detaching the process from the entrypoint's process tree, making it more likely to be re-parented to the host's init process.
```

## Implementation Blueprint

This PRP documents a fix that has already been implemented. The implementation tasks describe the changes that were made.

### Implementation Tasks (ordered by dependencies)

```yaml
Task 1: MODIFY config/qbittorrent/custom-entrypoint.sh
  - REMOVE: `nohup` to prevent the background script from detaching.
  - IMPLEMENT: Proper process group handling to ensure s6-overlay supervises the script correctly.
  - FOLLOW pattern: A standard shell script without process detachment.

Task 2: MODIFY config/qbittorrent/ip_monitor.sh
  - IMPLEMENT: Signal trapping for `TERM` and `INT` signals.
  - ADD: A shutdown flag and a cleanup function to ensure the script terminates gracefully.

Task 3: MODIFY docker-compose.yml
  - ADD: `stop_grace_period` to all services using `network_mode: service:vpn`.
  - SET: Grace period to `30s` or `60s` depending on the service's shutdown time.

Task 4: CREATE scripts/check_namespace_leaks.sh
  - IMPLEMENT: A script that uses `docker top` and `docker inspect` to check for signs of namespace leaks.
  - OUTPUT: A report on running containers, network modes, and process counts.

Task 5: CREATE scripts/cleanup_namespace_leaks.sh
  - IMPLEMENT: A script that stops containers in the correct dependency order.
  - ADD: Force kill and removal of any remaining or dangling containers to ensure a clean state.

Task 6: CREATE DOCKER_NAMESPACE_LEAKS.md
  - DOCUMENT: The root cause of the namespace leak.
  - DETAIL: The solutions implemented in the scripts and Docker configuration.
  - PROVIDE: Best practices for development and production to avoid future issues.
```

## Validation Loop

### Level 1: Syntax & Style (Immediate Feedback)

```bash
# The implemented scripts are shell scripts, so we use shellcheck.
shellcheck scripts/*.sh config/qbittorrent/*.sh
```

### Level 2: Unit Tests (Component Validation)

N/A for shell scripts in this context.

### Level 3: Integration Testing (System Validation)

```bash
# 1. Start the services
docker-compose up -d

# 2. Wait for all services to become healthy
echo "Waiting for services to become healthy..."
sleep 120 # Adjust as needed

# 3. Run the check script
./scripts/check_namespace_leaks.sh
# Expected: No warnings about high process counts or missing service containers.

# 4. Check for rogue processes on the host
ps aux | grep qbittorrent-nox | grep -v grep
# Expected: No output.

# 5. Check the external IP from a container sharing the VPN
docker exec qbittorrent curl ifconfig.me
# Expected: The IP of the VPN server.

# 6. Run the cleanup script
./scripts/cleanup_namespace_leaks.sh
# Expected: All containers are stopped and removed gracefully.

# 7. Check for any remaining docker processes
docker ps -a
# Expected: No containers from this project are listed.
```

## Final Validation Checklist

### Technical Validation
- [x] All validation levels completed successfully.
- [x] `shellcheck` passes on all scripts.
- [x] No `qbittorrent-nox` processes on host.
- [x] External IP is VPN IP.
- [x] Cleanup script works as expected.

### Feature Validation
- [x] All success criteria from "What" section met.
- [x] The primary goal of preventing IP leaks is achieved.

### Code Quality Validation
- [x] Follows existing codebase patterns.
- [x] The solution is documented in `DOCKER_NAMESPACE_LEAKS.md`.
