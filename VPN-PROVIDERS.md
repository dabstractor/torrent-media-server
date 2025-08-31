# VPN Provider Options

This project supports multiple VPN providers to protect your torrent traffic. Choose the option that works best for you.

## 🌟 Default: Cloudflare WARP (Recommended)

**Perfect for most users** - No configuration needed!

### ✅ Advantages
- **Zero setup** - Works immediately without any credentials
- **Free** - No subscription required
- **Fast** - Cloudflare's global network
- **Privacy** - Hides your IP from torrent swarms
- **Reliable** - Cloudflare's 99.9%+ uptime

### 🚀 Quick Start
```bash
# Just run - no configuration needed!
docker-compose up -d
# or use the convenience script
./start-warp.sh
```

### 🌐 Verify it's working
```bash
# Check your host IP
curl -s ipinfo.io/ip

# Check container IP (should be different)
docker exec vpn curl -s ipinfo.io/ip
```

---

## 🔐 Private Internet Access (PIA)

**For users with PIA subscriptions** - Premium features and global server selection.

### ✅ Advantages
- **WireGuard protocol** - Modern, fast VPN technology
- **Global servers** - Choose your preferred location
- **Port forwarding** - Better torrent performance (location-dependent)
- **No logs policy** - Enhanced privacy
- **Kill switch** - Blocks traffic if VPN disconnects

### ⚙️ Setup Required
1. **Get PIA credentials** from your [PIA account](https://www.privateinternetaccess.com/account)
2. **Copy environment file**: `cp .env.example .env`
3. **Edit .env file** and uncomment/set:
   ```bash
   PIA_USER=your_pia_username
   PIA_PASS=your_pia_password
   PIA_REGION=us_atlanta  # or your preferred region
   ```

### 🚀 Start with PIA
```bash
# Method 1: Use the convenience script (recommended)
./start-pia.sh

# Method 2: Manual command
docker-compose -f docker-compose.yml -f docker-compose.pia.yml up -d
```

### 🌍 Available PIA Regions
Popular options include:
- `us_atlanta`, `us_chicago`, `us_denver`, `us_east`, `us_west`
- `ca_toronto`, `ca_montreal`, `ca_vancouver`
- `uk_london`, `uk_manchester`
- `de_frankfurt`, `de_berlin`
- `netherlands`, `switzerland`, `sweden`

[Full list of regions](https://github.com/thrnz/docker-wireguard-pia#server-list)

---

## 🔄 Switching Between Providers

### WARP → PIA
```bash
docker-compose down
./start-pia.sh
```

### PIA → WARP  
```bash
docker-compose down
./start-warp.sh
```

---

## 🛠️ Adding New VPN Providers

The architecture is designed for easy extension. To add a new provider:

1. **Create overlay file**: `docker-compose.newprovider.yml`
2. **Define VPN service** with provider-specific configuration
3. **Add convenience script**: `start-newprovider.sh`
4. **Update documentation**

### Example: NordVPN (future)
```yaml
# docker-compose.nordvpn.yml
services:
  vpn:
    image: nordvpn-container:latest
    environment:
      - NORDVPN_USER=${NORDVPN_USER}
      - NORDVPN_PASS=${NORDVPN_PASS}
```

---

## 🚨 Troubleshooting

### Check VPN Status
```bash
# View VPN logs
docker-compose logs vpn

# Check if traffic is routed through VPN
docker exec transmission curl -s ipinfo.io/ip
docker exec sonarr curl -s ipinfo.io/ip
```

### Common Issues

**WARP not connecting:**
- Usually resolves within 30-60 seconds
- Check logs: `docker logs vpn`

**PIA authentication failed:**
- Verify credentials in .env file
- Check PIA account is active
- Try different region

**Services can't reach internet:**
- Ensure VPN container is healthy: `docker-compose ps`
- Restart the stack: `docker-compose down && docker-compose up -d`

---

## 📊 Performance Comparison

| Provider | Setup Time | Speed | Global Locations | Port Forwarding | Cost |
|----------|------------|-------|------------------|------------------|------|
| **WARP** | 0 seconds | ⭐⭐⭐⭐⭐ | Global CDN | No | Free |
| **PIA** | 2 minutes | ⭐⭐⭐⭐ | 80+ countries | Yes* | ~$3/month |

*Port forwarding availability depends on server location

---

## 🔒 Security Features

Both providers offer:
- ✅ **IP masking** - Hide your real IP from torrent peers
- ✅ **Encrypted tunnels** - Protect traffic from ISP monitoring  
- ✅ **Kill switch** - Block traffic if VPN disconnects
- ✅ **DNS leak protection** - Prevent DNS queries outside VPN

Choose WARP for simplicity, PIA for advanced features and server choice.