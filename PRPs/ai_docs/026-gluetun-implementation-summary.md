# PRP 026: Gluetun VPN Migration - Implementation Summary

## Session Context & Achievements

### ✅ Successfully Implemented:

1. **WARP Wireguard (Custom Provider)** - WORKING ✅
   - Tool: `wgcf` via Docker container
   - Config: `/config/gluetun/warp/wg0.conf`
   - IP: 104.28.235.170 (Cloudflare WARP)
   - Status: Fully functional with health checks passing

2. **PIA Wireguard (Custom Provider)** - WORKING ✅
   - Tool: `pia-wg-config` (Go tool)
   - Config: `/config/gluetun/pia/wg0.conf`
   - IP: 151.241.125.124 (PIA Atlanta server)
   - Status: Connected and healthy

### Critical Architecture:

**Both providers use CUSTOM Wireguard, NOT native providers**

```yaml
environment:
  - VPN_SERVICE_PROVIDER=custom  # ALWAYS custom for both
  - VPN_TYPE=wireguard           # ALWAYS wireguard
  - WIREGUARD_PRIVATE_KEY=${WG_PRIVATE_KEY}
  - WIREGUARD_PUBLIC_KEY=${WG_PUBLIC_KEY}
  - WIREGUARD_ENDPOINT_IP=${WG_ENDPOINT_IP}
  - WIREGUARD_ENDPOINT_PORT=${WG_ENDPOINT_PORT}
  - WIREGUARD_ADDRESSES=${WG_ADDRESSES}
```

## 🚨 CRITICAL PITFALLS - DO NOT REPEAT:

### ❌ PITFALL 1: Using PIA Native Provider
**WRONG APPROACH:**
```yaml
- VPN_SERVICE_PROVIDER=private internet access
- VPN_TYPE=openvpn
- OPENVPN_USER=xxx
- OPENVPN_PASSWORD=xxx
- SERVER_REGIONS=US Atlanta
```

**PROBLEM:**
- Gluetun's native PIA provider uses OpenVPN, not Wireguard
- TLS handshake failures occur
- Region format issues (needs "US Atlanta" not "us_atlanta")
- Poor performance compared to Wireguard

**LESSON:** PIA native provider does NOT support Wireguard natively.

### ❌ PITFALL 2: Hostname in WIREGUARD_ENDPOINT_IP
**WRONG:**
```bash
WARP_ENDPOINT_IP=engage.cloudflareclient.com  # FAILS
```

**CORRECT:**
```bash
WARP_ENDPOINT_IP=162.159.192.1  # IP address required
```

**PROBLEM:** Gluetun's custom provider requires IP addresses, not hostnames.
**SOLUTION:** Always resolve hostnames to IPs before setting endpoint.

### ❌ PITFALL 3: Region Variable Conflicts
**WRONG:**
```yaml
- SERVER_REGIONS=${PIA_REGION:-US Atlanta}  # Breaks WARP
```

**CORRECT:**
```yaml
- SERVER_REGIONS=${SERVER_REGIONS:-}  # Empty for custom providers
```

**PROBLEM:** SERVER_REGIONS is only for native providers. Custom providers don't use it.
**SOLUTION:** Leave SERVER_REGIONS empty when using custom providers.

## ✅ CORRECT IMPLEMENTATION PATTERN:

### Provider Switching Logic:

**.env file structure:**
```bash
# Provider selection
VPN_PROVIDER=pia  # or warp
VPN_SERVICE_PROVIDER=custom  # ALWAYS custom
VPN_TYPE=wireguard  # ALWAYS wireguard

# WARP configuration (stored)
WARP_PRIVATE_KEY=xxx
WARP_PUBLIC_KEY=xxx
WARP_ENDPOINT_IP=162.159.192.1
WARP_ENDPOINT_PORT=2408
WARP_ADDRESSES=172.16.0.2/32

# PIA configuration (stored)
PIA_PRIVATE_KEY=xxx
PIA_PUBLIC_KEY=xxx
PIA_ENDPOINT_IP=151.241.125.124
PIA_ENDPOINT_PORT=1337
PIA_ADDRESSES=10.25.159.28

# Active wireguard config (copy from WARP or PIA based on VPN_PROVIDER)
WG_PRIVATE_KEY=xxx  # Copy from PIA_* or WARP_*
WG_PUBLIC_KEY=xxx
WG_ENDPOINT_IP=xxx
WG_ENDPOINT_PORT=xxx
WG_ADDRESSES=xxx
```

### Configuration Scripts:

1. **WARP Setup:** `/scripts/wgcf/generate-warp-config.sh`
   - Uses Docker: `neilpang/wgcf-docker`
   - Generates wgcf-profile.conf
   - Extracts wireguard parameters
   - Resolves hostname to IP

2. **PIA Setup:** `/scripts/pia-wg/generate-pia-config.sh`
   - Uses: `pia-wg-config` (Go tool)
   - Requires: `go install github.com/kylegrantlucas/pia-wg-config@latest`
   - Command: `pia-wg-config -r us_atlanta USERNAME PASSWORD`
   - Generates standard wireguard config

### Provider Switching Workflow:

**To switch from PIA to WARP:**
```bash
# 1. Update .env provider
VPN_PROVIDER=warp
VPN_SERVICE_PROVIDER=custom
VPN_TYPE=wireguard

# 2. Copy WARP values to WG_* variables
WG_PRIVATE_KEY=${WARP_PRIVATE_KEY}
WG_PUBLIC_KEY=${WARP_PUBLIC_KEY}
WG_ENDPOINT_IP=${WARP_ENDPOINT_IP}
WG_ENDPOINT_PORT=${WARP_ENDPOINT_PORT}
WG_ADDRESSES=${WARP_ADDRESSES}

# 3. Recreate container
docker compose up -d vpn --force-recreate
```

**To switch from WARP to PIA:**
```bash
# 1. Update .env provider
VPN_PROVIDER=pia
VPN_SERVICE_PROVIDER=custom
VPN_TYPE=wireguard

# 2. Copy PIA values to WG_* variables
WG_PRIVATE_KEY=${PIA_PRIVATE_KEY}
WG_PUBLIC_KEY=${PIA_PUBLIC_KEY}
WG_ENDPOINT_IP=${PIA_ENDPOINT_IP}
WG_ENDPOINT_PORT=${PIA_ENDPOINT_PORT}
WG_ADDRESSES=${PIA_ADDRESSES}

# 3. Recreate container
docker compose up -d vpn --force-recreate
```

## 🔒 DO NOT OVERWRITE:

### Protected Configurations:
- ✅ `/config/gluetun/warp/wg0.conf` - WARP wireguard config (working)
- ✅ `/config/gluetun/pia/wg0.conf` - PIA wireguard config (working)
- ✅ `wgcf-account.toml` - WARP account registration (persistent)
- ✅ `wgcf-profile.conf` - WARP profile (generated)

### Active .env Values (Current Session):
```bash
# Working WARP config
WARP_PRIVATE_KEY=aDa8gJo2vveWouizusTSGLZjAZzLRW7aZDCSu4yICmg=
WARP_PUBLIC_KEY=bmXOC+F1FxEMF9dyiK2H5/1SUtzH0JuVo51h2wPfgyo=
WARP_ENDPOINT_IP=162.159.192.1
WARP_ENDPOINT_PORT=2408
WARP_ADDRESSES=172.16.0.2/32

# Working PIA config
PIA_PRIVATE_KEY=MI7bvJR8H66e2yvEyLbeKK8y0gpPs174nbppZw/qyUM=
PIA_PUBLIC_KEY=1Yhp8ySnDZ1NIJrRiJfPGJckW3NNvmYd/sHsRxOBQTE=
PIA_ENDPOINT_IP=151.241.125.124
PIA_ENDPOINT_PORT=1337
PIA_ADDRESSES=10.25.159.28
```

## 📋 Remaining Validation Tasks:

### Current Status:
- ✅ Level 1: Environment setup and wgcf config
- ✅ Level 2: Gluetun with PIA Wireguard
- ✅ Level 3: Gluetun with WARP Wireguard
- ✅ Level 4: Full stack docker compose up -d (COMPLETE - health check fixed)
- ✅ Level 5: Torrent client network isolation validation (VERIFIED - Transmission uses VPN IP)
- ⏳ Level 6: Provider switching (PIA ↔ WARP)
- ⏳ Level 7: CLAUDE.md requirements (all containers healthy)

### Resolved Issues:

1. **VPN Health Check Command (FIXED ✅)**
   - **Problem:** Health check using `wget --spider` sends HEAD request, gluetun returns 400
   - **Root Cause:** Gluetun health endpoint at 127.0.0.1:9999 doesn't support HEAD requests
   - **Solution:** Changed to `wget -q -O /dev/null http://127.0.0.1:9999` (GET request)
   - **Status:** VPN now shows healthy, Transmission successfully connects

2. **Network Isolation Validation (VERIFIED ✅)**
   - **Transmission IP:** 151.241.125.124 (matches VPN IP exactly)
   - **Host IP:** 71.81.198.132 (different from VPN - correct!)
   - **Result:** `network_mode: "container:vpn"` working perfectly
   - **Validation:** Manual IP check confirms no IP leaks

3. **Provider Switching Test**
   - Verify clean switching between PIA and WARP
   - Test: `docker compose down && docker compose up -d` for each provider
   - Ensure no IP leaks during transition

## 🎯 Next Agent Action Plan:

### Immediate Tasks:

1. **Fix Health Check Timing**
   ```bash
   # Option A: Reduce start_period
   healthcheck:
     start_period: 60s  # from 90s

   # Option B: Wait for full start_period before dependent services
   docker compose up -d vpn
   sleep 90
   docker compose up -d
   ```

2. **Complete Full Stack Validation**
   ```bash
   docker compose down
   docker compose up -d
   # Wait 90+ seconds
   docker compose ps  # All should show "healthy"
   ```

3. **Run Network Isolation Tests**
   ```bash
   ./scripts/validate-vpn.sh
   # Should show:
   # - Host IP: xxx.xxx.xxx.xxx
   # - VPN IP: 151.241.125.124 (PIA) or 104.28.235.170 (WARP)
   # - Torrent client IP: matches VPN IP
   ```

4. **Test Provider Switching**
   ```bash
   # Test PIA -> WARP
   # Update .env: VPN_PROVIDER=warp and WG_* to WARP values
   docker compose down
   docker compose up -d
   # Verify WARP IP

   # Test WARP -> PIA
   # Update .env: VPN_PROVIDER=pia and WG_* to PIA values
   docker compose down
   docker compose up -d
   # Verify PIA IP
   ```

### Files Modified This Session:
- `docker-compose.yml` - VPN service migrated to gluetun
- `.env` - PIA and WARP wireguard configs added
- `.env.example` - Updated with gluetun instructions
- `scripts/wgcf/generate-warp-config.sh` - Created (WARP config generator)
- `scripts/pia-wg/generate-pia-config.sh` - Created (PIA config generator)
- `scripts/validate-vpn.sh` - Created (IP leak validator)
- Legacy: `scripts/vpn/` → `scripts/vpn-legacy/` (archived)
- Legacy: `dockerfiles/vpn/` → `dockerfiles/vpn-legacy/` (archived)

### Key Learnings for Next Session:

1. **ALWAYS use custom wireguard for both PIA and WARP**
2. **NEVER use native PIA provider (OpenVPN fails)**
3. **ALWAYS use IP addresses for endpoints, not hostnames**
4. **Keep SERVER_REGIONS empty for custom providers**
5. **Both providers are fully configured and working - DO NOT regenerate configs**
6. **Focus on validation and testing, not re-implementation**

## Success Criteria (from PRP):
- [ ] docker compose up -d works (both providers)
- [ ] All containers show "Healthy"
- [ ] Transmission/qBittorrent shows different IP from host
- [ ] IP matches VPN provider (PIA or WARP)
- [ ] Provider switching works cleanly
- [ ] No IP leaks detected
