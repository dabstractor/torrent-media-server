# VPN Setup Guide

This project uses **Gluetun** as a unified VPN client with support for multiple providers through a modular setup system.

## Quick Start

### 🚀 WARP (Zero Configuration)

Cloudflare WARP provides a free, fast VPN with **no account required**.

```bash
# 1. Set provider in .env
echo "VPN_PROVIDER=warp" >> .env

# 2. Run setup script
./scripts/setup-vpn.sh

# 3. Copy generated variables to .env
# (Script will display WARP_* and WG_* variables)

# 4. Start containers
docker compose up -d
```

**That's it!** WARP registers automatically and requires zero user input.

---

### 🔐 PIA (Minimal Configuration)

Private Internet Access provides enhanced privacy and server selection.

```bash
# 1. Add credentials to .env
echo "VPN_PROVIDER=pia" >> .env
echo "PIA_USERNAME=p1234567" >> .env
echo "PIA_PASSWORD=your_password" >> .env
echo "PIA_REGION=us_atlanta" >> .env  # Optional, defaults to us_atlanta

# 2. Run setup script
./scripts/setup-vpn.sh

# 3. Copy generated variables to .env
# (Script will display PIA_* and WG_* variables)

# 4. Start containers
docker compose up -d
```

**First-time setup**: ~30 seconds (builds PIA config generator image)
**Subsequent runs**: Instant (uses cached config)

---

## Provider Switching

Switch between providers by changing `VPN_PROVIDER` in `.env`:

```bash
# Switch to WARP
./scripts/setup-vpn.sh  # With VPN_PROVIDER=warp

# Copy WARP_* variables to WG_* variables in .env
# Restart containers
docker compose up -d --force-recreate vpn
```

```bash
# Switch to PIA
./scripts/setup-vpn.sh  # With VPN_PROVIDER=pia

# Copy PIA_* variables to WG_* variables in .env
# Restart containers
docker compose up -d --force-recreate vpn
```

---

## How It Works

### Architecture

```
scripts/
├── setup-vpn.sh              # Main orchestrator
└── vpn-providers/
    ├── warp.sh               # WARP provider module
    ├── pia.sh                # PIA provider module
    └── README.md             # Provider development guide
```

### Setup Flow

1. **Detection**: Script reads `VPN_PROVIDER` from `.env`
2. **Validation**: Checks for required credentials (if needed)
3. **Generation**:
   - **WARP**: Runs `neilpang/wgcf-docker` to register account
   - **PIA**: Builds and runs `pia-wg-config` tool
4. **Extraction**: Parses wireguard config into env variables
5. **Output**: Displays variables to add to `.env`

### Zero Host Dependencies

All tools run in Docker containers:
- ✅ **WARP**: `neilpang/wgcf-docker` (pre-built image)
- ✅ **PIA**: Auto-builds `pia-wg-config:local` on first run
- ✅ No Go, Python, or other tools required on host

---

## Configuration Details

### Environment Variables

Each provider stores its config in both provider-specific and generic variables:

**WARP Example:**
```bash
# Provider-specific (for switching)
WARP_PRIVATE_KEY=xxx
WARP_PUBLIC_KEY=xxx
WARP_ENDPOINT_IP=162.159.192.1
WARP_ENDPOINT_PORT=2408
WARP_ADDRESSES=172.16.0.2/32

# Active config (used by Gluetun)
WG_PRIVATE_KEY=xxx  # ← Copy from WARP_PRIVATE_KEY
WG_PUBLIC_KEY=xxx   # ← Copy from WARP_PUBLIC_KEY
...
```

**PIA Example:**
```bash
# Provider-specific (for switching)
PIA_PRIVATE_KEY=xxx
PIA_PUBLIC_KEY=xxx
PIA_ENDPOINT_IP=151.241.125.124
PIA_ENDPOINT_PORT=1337
PIA_ADDRESSES=10.25.159.28

# Active config (used by Gluetun)
WG_PRIVATE_KEY=xxx  # ← Copy from PIA_PRIVATE_KEY
WG_PUBLIC_KEY=xxx   # ← Copy from PIA_PUBLIC_KEY
...
```

### Config Storage

Generated configs are cached for reuse:

```
config/
└── gluetun/
    ├── warp/
    │   └── wg0.conf       # WARP wireguard config
    └── pia/
        └── wg0.conf       # PIA wireguard config
```

**Note**: Re-running setup script with existing config skips generation.

---

## Troubleshooting

### Setup script shows "ERROR: Missing required environment variables"

**For PIA:**
```bash
# Ensure these are set in .env:
PIA_USERNAME=p1234567
PIA_PASSWORD=your_password
```

**For WARP:** No credentials required!

### Setup script shows "ERROR: Provider 'xyz' not supported"

**Available providers:**
```bash
ls scripts/vpn-providers/*.sh | xargs -n1 basename | sed 's/.sh$//'
```

Expected output: `pia`, `warp`

### Docker build fails for PIA

**First-time setup** builds a Go image (~30-60 seconds):
```bash
Building PIA config generator image...
```

If build fails:
1. Check Docker daemon is running
2. Verify internet connectivity
3. Check Go package availability: `github.com/kylegrantlucas/pia-wg-config`

### Containers fail to start with VPN errors

**Verify configuration**:
```bash
# Check WG_* variables are set in .env
grep "^WG_" .env

# Should show:
WG_PRIVATE_KEY=xxx
WG_PUBLIC_KEY=xxx
WG_ENDPOINT_IP=xxx
WG_ENDPOINT_PORT=xxx
WG_ADDRESSES=xxx
```

**Check VPN health**:
```bash
docker compose logs vpn | tail -20
```

Look for:
- ✅ `INFO [ip getter] Public IP address is xxx.xxx.xxx.xxx`
- ✅ `INFO [healthcheck] healthy!`
- ❌ TLS handshake errors → Wrong provider config
- ❌ Authentication failed → Check credentials

---

## Advanced Usage

### Custom Provider

Set `VPN_PROVIDER=custom` to manually configure wireguard:

```bash
VPN_PROVIDER=custom
WG_PRIVATE_KEY=your_private_key
WG_PUBLIC_KEY=peer_public_key
WG_ENDPOINT_IP=vpn.example.com
WG_ENDPOINT_PORT=51820
WG_ADDRESSES=10.0.0.2/32
```

Setup script skips auto-configuration for `custom` provider.

### Adding New Providers

See: `scripts/vpn-providers/README.md`

Three simple functions:
1. `provider_check()` - Detect existing config
2. `provider_generate()` - Generate via Docker
3. `provider_extract()` - Parse config to env vars

Example providers to add:
- NordVPN (wireguard support)
- Mullvad (wireguard native)
- ProtonVPN (wireguard available)

---

## Security Notes

- ✅ **Credentials stay local**: Never sent to third parties
- ✅ **WARP account persistence**: `wgcf-account.toml` saved for reuse
- ✅ **Wireguard configs cached**: Regeneration not required
- ✅ **No host exposure**: All tools run in isolated Docker containers
- ⚠️ **Never commit `.env`**: Contains private keys and credentials

---

## FAQ

**Q: Do I need a VPN account?**
A: No! WARP is free and requires zero configuration.

**Q: Can I switch providers without losing configs?**
A: Yes! Both configs are stored separately (WARP_* and PIA_*). Just update WG_* variables.

**Q: Does PIA support wireguard natively in Gluetun?**
A: Gluetun's native PIA provider uses OpenVPN. We use custom wireguard for better performance.

**Q: What happens if I run setup-vpn.sh twice?**
A: It detects existing config and skips generation. Safe to re-run.

**Q: Can I use multiple VPN providers simultaneously?**
A: No - only one provider is active (determined by WG_* variables). But you can store configs for multiple providers and switch between them.

---

## Next Steps

After VPN setup:
1. Verify IP leak protection: `./scripts/validate-vpn.sh`
2. Check container health: `docker compose ps`
3. Test torrent client: Access qBittorrent/Transmission web UI
4. Verify different IP: Compare host IP vs torrent client IP
