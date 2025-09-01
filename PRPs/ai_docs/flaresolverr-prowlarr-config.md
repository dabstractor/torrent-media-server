# FlareSolverr-Prowlarr Configuration Guide

This guide provides step-by-step instructions for configuring Prowlarr to use FlareSolverr for bypassing CloudFlare protection on popular torrent indexers.

## Prerequisites

- FlareSolverr service running and healthy (port 8191)
- Prowlarr accessible via web interface (port 9696)
- Docker services started with either base or PIA VPN configuration

## Quick Setup Overview

1. **Access Prowlarr Web Interface**
   - Navigate to `http://localhost:9696` in your web browser
   - Complete initial setup wizard if first time

2. **Configure FlareSolverr Proxy**
   - Go to Settings → Indexer Proxies
   - Add new FlareSolverr proxy
   - Configure with service URL

3. **Apply Proxy to Indexers**
   - Configure specific indexers to use FlareSolverr
   - Test indexer functionality

## Detailed Configuration Steps

### Step 1: Access Prowlarr Settings

1. Open your web browser and navigate to `http://localhost:9696`
2. If this is your first time accessing Prowlarr, complete the setup wizard:
   - Set authentication method (recommended: Forms Authentication)
   - Configure API key (note this down for later use)
   - Complete initial configuration

3. Navigate to **Settings** (gear icon) in the left sidebar

### Step 2: Configure FlareSolverr Indexer Proxy

1. In Settings, click on **"Indexer Proxies"** tab
2. Click the **"+"** button to add a new proxy
3. Select **"FlareSolverr"** from the list of available proxies
4. Configure the FlareSolverr proxy settings:

   **Basic Settings:**
   - **Name:** `FlareSolverr`
   - **Tags:** Leave empty (will apply to all compatible indexers)
   - **Host:** `flaresolverr` (Docker service name)
   - **Port:** `8191`

   **Advanced Settings (if available):**
   - **Request Timeout:** `60` seconds
   - **Test Timeout:** `10` seconds

5. Click **"Test"** to verify connectivity to FlareSolverr service
   - Should show ✅ "Test was successful" message
   - If test fails, verify FlareSolverr service is running: `docker ps | grep flaresolverr`

6. Click **"Save"** to create the proxy configuration

### Step 3: Configure Indexers to Use FlareSolverr

#### For New Indexers:

1. Go to **"Indexers"** in the left sidebar
2. Click **"Add Indexer"** (+) button
3. Find popular indexers that typically require CloudFlare bypass:
   - **1337x**
   - **The Pirate Bay**
   - **RARBG** (if available)
   - **Torlock**
   - **LimeTorrents**

4. When configuring each indexer:
   - Fill in required fields (name, URL, categories, etc.)
   - In the **"Indexer Proxies"** dropdown, select **"FlareSolverr"**
   - Configure any additional settings as needed
   - Click **"Test"** to verify functionality
   - Click **"Save"** if test passes

#### For Existing Indexers:

1. In the Indexers list, find indexers that are failing with CloudFlare errors
2. Click the **pencil icon** (Edit) next to the indexer
3. In the indexer settings:
   - Locate the **"Indexer Proxies"** dropdown
   - Select **"FlareSolverr"** from the list
   - Click **"Test"** to verify functionality
   - Click **"Save"** to apply changes

### Step 4: Verify Configuration

#### Test Individual Indexers:

1. In the Indexers list, each FlareSolverr-enabled indexer should show:
   - Status: ✅ (green checkmark)
   - No CloudFlare-related error messages

2. Click the **"Test All"** button to verify all indexers
3. Any failing indexers will show specific error messages

#### Test Search Functionality:

1. Navigate to **"Search"** in the left sidebar
2. Enter a test search term (e.g., "Ubuntu")
3. Verify that results appear from FlareSolverr-enabled indexers
4. Previously blocked indexers should now return results

## VPN Compatibility Notes

### WARP VPN (Default)
✅ **Fully Compatible** - FlareSolverr works perfectly with the default Cloudflare WARP VPN configuration.

### PIA VPN 
⚠️ **Limited Compatibility** - FlareSolverr may experience browser startup issues with PIA VPN due to network restrictions that prevent Chromium from initializing properly.

**Recommended Solution for PIA Users:**
If you need to use PIA VPN and encounter FlareSolverr startup issues:

1. **Option 1: Use Base Configuration for FlareSolverr**
   - Run most services with PIA VPN
   - Run only FlareSolverr with WARP VPN on a separate Docker network
   - Configure Prowlarr to access FlareSolverr across network boundaries

2. **Option 2: External FlareSolverr Instance**
   - Run FlareSolverr as a standalone service outside Docker Compose
   - Configure Prowlarr to connect to external FlareSolverr instance

**Current Implementation:**
The current configuration works reliably with WARP VPN (default). PIA users should use the default `docker compose up -d` command rather than the PIA override.

## Troubleshooting

### Common Issues and Solutions

#### FlareSolverr Proxy Test Fails

**Error:** "Unable to connect to FlareSolverr"

**Solutions:**
1. Verify FlareSolverr service is running:
   ```bash
   docker ps | grep flaresolverr
   curl -f http://localhost:8191/
   ```
2. Check Docker network connectivity:
   ```bash
   docker exec prowlarr curl -f http://flaresolverr:8191/
   ```
3. Verify Docker Compose configuration includes FlareSolverr service

#### Indexer Test Fails with FlareSolverr

**Error:** "Indexer test failed" with timeout or connection errors

**Solutions:**
1. Increase timeout values in FlareSolverr proxy settings
2. Verify the indexer URL is correct and accessible
3. Check FlareSolverr logs for specific errors:
   ```bash
   docker logs flaresolverr --tail 50
   ```

#### Search Results Missing from Specific Indexers

**Possible Causes:**
1. Indexer not properly configured with FlareSolverr proxy
2. CloudFlare challenge too complex for FlareSolverr
3. Rate limiting or temporary blocks

**Solutions:**
1. Re-test individual indexers in Settings → Indexers
2. Verify proxy assignment in indexer configuration
3. Check indexer-specific logs in Prowlarr System → Logs

#### Performance Issues

**Symptoms:** Slow search results, timeouts

**Solutions:**
1. Monitor FlareSolverr resource usage:
   ```bash
   docker stats flaresolverr --no-stream
   ```
2. Consider increasing Docker memory allocation for FlareSolverr
3. Limit concurrent requests in Prowlarr indexer settings

## Best Practices

### Security Considerations

1. **API Key Management:**
   - Keep Prowlarr API key secure and don't share publicly
   - Rotate API keys periodically

2. **Network Security:**
   - FlareSolverr service is only accessible within Docker network
   - External port 8191 is for debugging/testing only

### Performance Optimization

1. **Resource Monitoring:**
   - FlareSolverr spawns browser instances for each request
   - Monitor memory usage, especially with multiple concurrent searches
   - Recommended: minimum 2GB RAM, prefer 4GB+ for stability

2. **Request Management:**
   - Configure appropriate timeout values
   - Balance between success rate and performance
   - Consider rate limiting for heavily used indexers

3. **Selective Usage:**
   - Only apply FlareSolverr to indexers that actually need CloudFlare bypass
   - Regular indexers without protection perform better without proxy

### Maintenance

1. **Regular Testing:**
   - Test indexers weekly to identify issues early
   - Monitor Prowlarr logs for FlareSolverr-related errors

2. **Updates:**
   - Keep FlareSolverr service updated to latest version
   - Review Prowlarr release notes for FlareSolverr compatibility changes

3. **Backup:**
   - Export Prowlarr configuration including indexer and proxy settings
   - Store configuration backups securely

## Environment Variables Reference

The following environment variables are configured in `.env` for FlareSolverr integration:

```env
# FlareSolverr Service URL (Docker internal hostname)
FLARESOLVERR_URL=http://flaresolverr:8191

# Related Prowlarr Configuration
PROWLARR_URL=http://prowlarr:9696
PROWLARR_API_KEY=<your_api_key_here>
```

## Service Health Checks

Verify services are healthy:

```bash
# Check all service status
docker ps --format "table {{.Names}}\t{{.Status}}"

# Test FlareSolverr endpoint
curl -f http://localhost:8191/

# Test Prowlarr API
curl -f http://localhost:9696/

# Test FlareSolverr API functionality
curl -X POST http://localhost:8191/v1 \
  -H "Content-Type: application/json" \
  -d '{"cmd": "request.get", "url": "https://httpbin.org/headers", "maxTimeout": 60000}'
```

## Support Resources

- **FlareSolverr Documentation:** https://github.com/FlareSolverr/FlareSolverr
- **Prowlarr Wiki:** https://wiki.servarr.com/prowlarr
- **Trash Guides FlareSolverr Setup:** https://trash-guides.info/Prowlarr/prowlarr-setup-flaresolverr/

---

**Note:** This configuration enables access to previously blocked indexers but should be used responsibly and in compliance with local laws and website terms of service.