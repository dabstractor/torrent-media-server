# VPN Provider Modules

This directory contains modular provider scripts for automatic VPN configuration generation.

## Supported Providers

- **warp** - Cloudflare WARP (zero configuration required)
- **pia** - Private Internet Access (requires username/password)
- **custom** - Manual configuration (skip auto-setup)

## Adding a New Provider

To add support for a new VPN provider, create a new file: `{provider}.sh`

### Required Functions

Each provider module must implement these functions:

```bash
#!/bin/bash
# Example: NordVPN Provider Module

# Define required environment variables
REQUIRED_VARS=("NORDVPN_USERNAME" "NORDVPN_PASSWORD")

# Check if configuration already exists
provider_check() {
    # Return 0 if config exists, 1 if not
    if [ -f "${CONFIG_DIR}/wg0.conf" ]; then
        return 0
    fi
    return 1
}

# Generate configuration (Docker-based, no host dependencies)
provider_generate() {
    # Create config using Docker
    # Must create: ${CONFIG_DIR}/wg0.conf

    docker run --rm \
        -v "${PROJECT_ROOT}:/output" \
        nordvpn-config-generator:latest \
        --user "${NORDVPN_USERNAME}" \
        --pass "${NORDVPN_PASSWORD}" \
        --region "${NORDVPN_REGION:-us}"

    # Return 0 on success, 1 on failure
    return $?
}

# Extract environment variables from generated config
provider_extract() {
    # Parse config file and output env variables
    # Must output both {PROVIDER}_* and WG_* variables

    cat <<EOF
# NordVPN Configuration (Generated $(date))
NORDVPN_PRIVATE_KEY=${PRIVATE_KEY}
NORDVPN_PUBLIC_KEY=${PUBLIC_KEY}
...

# Active Wireguard Config
WG_PRIVATE_KEY=${PRIVATE_KEY}
WG_PUBLIC_KEY=${PUBLIC_KEY}
...
EOF
}
```

### Available Variables

Your provider module has access to:

- `PROJECT_ROOT` - Absolute path to project root
- `CONFIG_DIR` - Provider-specific config directory (`${PROJECT_ROOT}/config/gluetun/{provider}`)
- All variables from `.env` (automatically sourced)

### Guidelines

1. **No Host Dependencies**: Use Docker for all tools (wgcf, API clients, etc.)
2. **Idempotent**: Re-running should detect existing config and skip generation
3. **Error Handling**: Return proper exit codes (0=success, 1=failure)
4. **Documentation**: Output clear error messages for missing credentials
5. **Caching**: Store configs in `config/gluetun/{provider}/` for reuse

### Testing Your Provider

```bash
# Set provider in .env
echo "VPN_PROVIDER=myprovider" >> .env

# Run setup script
./scripts/setup-vpn.sh

# Verify output shows generated env variables
```

## Provider Examples

### Zero-Config Provider (WARP)
- No credentials required
- Automatic account registration
- Persistent account storage

### Credential-Based Provider (PIA)
- Requires username/password
- Optional region selection
- Builds Docker image on-demand

### API-Based Provider (Future)
- Fetch server list from API
- Select optimal server
- Generate wireguard config via API
