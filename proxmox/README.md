# Off-Peak on Proxmox

This guide walks you through installing **Off-Peak** in a [Proxmox VE](https://www.proxmox.com/) environment using a lightweight **LXC container** with Docker inside it.

---

## Prerequisites

- Proxmox VE 7+ running
- Internet access from the Proxmox host
- A **Tibber** developer application with OAuth credentials  
  → Register at <https://developer.tibber.com>
- (Optional) A domain name pointed at your Proxmox host for HTTPS (e.g. via Nginx Proxy Manager or Traefik)

---

## Step 1 — Create an LXC Container in Proxmox

1. In the Proxmox web UI, click **Create CT**.
2. Choose a **Debian 12** or **Ubuntu 22.04** template.
3. Recommended specs:

   | Setting | Value |
   |---------|-------|
   | RAM | 512 MB (256 MB minimum) |
   | Disk | 8 GB |
   | CPU | 1 core |
   | Network | DHCP or static IP |

4. Enable **"Nesting"** under the container's *Options → Features* — this is **required** for Docker inside LXC.
5. Start the container and open a shell (`pct enter <ID>` or the Proxmox console).

> **Tip:** You can also run Off-Peak directly on a Proxmox **VM** (e.g. Ubuntu Server) — the steps below are identical.

---

## Step 2 — One-Line Install

Inside the LXC container (as root), run:

```bash
bash <(curl -fsSL https://raw.githubusercontent.com/joakimarver/off-peak/main/proxmox/install.sh)
```

The script will:
1. Install Docker and Docker Compose automatically
2. Create `/opt/off-peak/` with all required files
3. Ask for your Tibber OAuth credentials interactively
4. Pull the Off-Peak Docker image and start the service

Off-Peak will be available at **http://\<container-ip\>:3000** when done.

---

## Step 3 — Manual Setup (alternative)

If you prefer to set things up manually:

```bash
# 1. Install Docker
curl -fsSL https://get.docker.com | sh
systemctl enable --now docker

# 2. Create app directory
mkdir -p /opt/off-peak/secrets
cd /opt/off-peak

# 3. Create docker-compose.yml
cat > docker-compose.yml <<'EOF'
version: '3.8'
services:
  offpeak:
    image: ghcr.io/joakimarver/off-peak:latest
    restart: unless-stopped
    volumes:
      - ./secrets:/secrets:ro
    ports:
      - "3000:8080"
    env_file:
      - ./docker.env
    healthcheck:
      test: ["CMD-SHELL", "wget --spider -q http://localhost:8080/healthz || exit 1"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 10s
EOF

# 4. Create docker.env with your credentials
cat > docker.env <<'EOF'
OAUTH_CLIENT_ID=YOUR_CLIENT_ID
OAUTH_CLIENT_SECRET=YOUR_CLIENT_SECRET
OAUTH_CALLBACK=https://off-peak.basement.se/auth/callback
FIREBASE_PROJECT=
FIREBASE_KEY=
FIREBASE_DB=
EOF
chmod 600 docker.env

# 5. Start
docker compose up -d
```

---

## Step 4 — Expose Externally (Reverse Proxy)

To access Off-Peak from the internet at `https://off-peak.basement.se`, configure a reverse proxy on your network.

### Option A — Nginx Proxy Manager (recommended for Proxmox)

1. Install [Nginx Proxy Manager](https://nginxproxymanager.com/) as another LXC container.
2. Add a **Proxy Host**:
   - Domain: `off-peak.basement.se`
   - Forward Hostname: `<off-peak-container-ip>`
   - Forward Port: `3000`
   - Enable **SSL** (Let's Encrypt)
3. Update your Tibber app's callback URL to `https://off-peak.basement.se/auth/callback`.

### Option B — Traefik

Add these labels to the `offpeak` service in `docker-compose.yml`:

```yaml
labels:
  - "traefik.enable=true"
  - "traefik.http.routers.offpeak.rule=Host(`off-peak.basement.se`)"
  - "traefik.http.routers.offpeak.entrypoints=websecure"
  - "traefik.http.routers.offpeak.tls.certresolver=letsencrypt"
  - "traefik.http.services.offpeak.loadbalancer.server.port=8080"
```

---

## Step 5 — (Optional) Firebase Snapshots

To enable the snapshot sharing feature, you need a **Firebase Firestore** project:

1. Create a project at <https://console.firebase.google.com>
2. Generate a service account key (JSON file)
3. Copy the JSON file to `/opt/off-peak/secrets/key.json`
4. Update `docker.env`:

```env
FIREBASE_PROJECT=your-firebase-project-id
FIREBASE_KEY=/secrets/key.json
FIREBASE_DB=snaps_prod
```

5. Restart: `docker compose restart`

---

## Updating Off-Peak

```bash
cd /opt/off-peak
docker compose pull
docker compose up -d
```

## Viewing Logs

```bash
cd /opt/off-peak
docker compose logs -f
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Container won't start | Check `docker compose logs offpeak` |
| Login fails | Verify `OAUTH_CLIENT_ID`, `OAUTH_CLIENT_SECRET`, and `OAUTH_CALLBACK` in `docker.env` |
| Callback URL mismatch | The callback URL in `docker.env` must match exactly what you registered in the Tibber developer portal |
| Docker daemon not starting in LXC | Ensure **Nesting** is enabled in Proxmox container features |
| Port 3000 not reachable | Check Proxmox firewall rules; allow TCP 3000 on the LXC container |
