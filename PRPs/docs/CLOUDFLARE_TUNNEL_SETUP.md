# Cloudflare Tunnel Setup for Jellyfin

This document explains how to set up remote access to your Jellyfin media server using Cloudflare Tunnels.

## Overview

Jellyfin can be accessed remotely in three ways, listed in order of simplicity:

1. **Quick Tunnels (Happy Path)** - Free, zero-config, temporary URLs
2. **Named Tunnels with Custom Domain** - Free static URLs, requires domain ownership
3. **Ngrok Tunnels** - Free static URLs, requires paid account for full functionality

## Quick Start (Recommended for New Users)

For immediate access without any setup:

```bash
docker compose up -d
```

The system will automatically create a temporary Cloudflare Quick Tunnel. The URL will be:
- Displayed in the cloudflared container logs
- Saved to `data/shared/tunnel-url.txt`

**Note**: Quick Tunnel URLs change on every restart.

## Permanent Access Options

### Option 1: Cloudflare Named Tunnels (Recommended)

For a free, permanent URL that never changes:

#### Prerequisites
- A free Cloudflare account (https://dash.cloudflare.com/sign-up)
- A domain name (can be free from providers like Freenom, or purchased)

#### Setup Process
1. **Add your domain to Cloudflare**:
   - Go to https://dash.cloudflare.com/
   - Click "Add a site"
   - Enter your domain name
   - Follow the setup process (you'll need to update nameservers at your domain registrar)

2. **Authenticate the tunnel**:
   ```bash
   docker run -it --rm -v $(pwd)/cloudflared:/etc/cloudflared cloudflare/cloudflared:latest tunnel login
   ```

3. **Create the tunnel**:
   ```bash
   docker run -it --rm -v $(pwd)/cloudflared:/etc/cloudflared cloudflare/cloudflared:latest tunnel create jellyfin-tunnel
   ```

4. **Configure the tunnel**:
   - Find your tunnel UUID: `ls cloudflared/*.json`
   - Add to `.env` file: `TUNNEL_TOKEN=your-tunnel-uuid`
   - Restart: `docker compose restart cloudflared`

5. **Set up DNS routing**:
   ```bash
   docker run -it --rm -v $(pwd)/cloudflared:/etc/cloudflared cloudflare/cloudflared:latest tunnel route dns jellyfin-tunnel jellyfin.yourdomain.com
   ```

**Result**: Permanent URL at `https://jellyfin.yourdomain.com`

### Option 2: Ngrok Tunnels (Advanced)

For users with a paid ngrok account:

#### Prerequisites
- Paid ngrok account (https://dashboard.ngrok.com/signup)
- ngrok auth token from dashboard

#### Setup Process
1. Get your ngrok auth token from https://dashboard.ngrok.com/get-started/your-authtoken

2. Add to `.env` file:
   ```
   NGROK_AUTHTOKEN=your_auth_token_here
   NGROK_DOMAIN=your-domain.ngrok-free.app  # Optional, for static domain
   ```

3. Restart services:
   ```bash
   docker compose restart ngrok
   ```

**Result**: Static URL at your configured domain (or temporary URL if no domain configured)

## Files Created

### Quick Tunnels (Default)
- No additional files required
- Temporary URL in `data/shared/tunnel-url.txt`

### Named Tunnels
- `cloudflared/cert.pem` - Authentication certificate
- `cloudflared/[UUID].json` - Tunnel credentials
- `data/shared/tunnel-url.txt` - Permanent tunnel URL

### Ngrok Tunnels
- No additional files required
- Static or temporary URL in `data/shared/tunnel-url.txt`

## Troubleshooting

### Quick Tunnels
- Check logs: `docker compose logs cloudflared`
- Restart: `docker compose restart cloudflared`

### Named Tunnels
- Verify domain is added to Cloudflare account
- Check `cloudflared` directory for certificate files
- Ensure TUNNEL_TOKEN is set in `.env`

### Ngrok Tunnels
- Verify NGROK_AUTHTOKEN is set in `.env`
- Check logs: `docker compose logs ngrok`
- Visit https://dashboard.ngrok.com/agents to stop conflicting sessions

## Security Notes

- All tunnels provide HTTPS encryption
- No port forwarding required
- Quick Tunnels are temporary and change on restart
- Named Tunnels require domain ownership but provide permanent URLs
- Ngrok Tunnels require paid accounts for full functionality

## When to Use Each Option

### Quick Tunnels
- ✅ Testing and evaluation
- ✅ Temporary access
- ✅ Zero setup required
- ❌ URLs change on restart

### Named Tunnels
- ✅ Permanent URLs
- ✅ Free (with domain ownership)
- ✅ No rate limits
- ❌ Requires domain ownership

### Ngrok Tunnels
- ✅ Static URLs (paid accounts)
- ✅ No domain required
- ❌ Rate limits on free accounts
- ❌ Paid accounts required for full functionality