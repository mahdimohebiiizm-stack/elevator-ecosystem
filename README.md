<a id="top"></a>
<div align="center">

<a href="https://web-portal-ivory-nine.vercel.app/" target="_blank" rel="noopener noreferrer">
  <img src="apps/web-portal/public/images/elevator-hero-luxury.jpg" alt="Asanro Elevator Enterprise Ecosystem - Live Demo" width="100%" style="border-radius: 16px; box-shadow: 0 20px 40px rgba(0,0,0,0.4);" />
</a>

<br/>
<br/>

<h2>🌐 <a href="https://web-portal-ivory-nine.vercel.app/">VIEW LIVE PRODUCTION PORTAL</a></h2>

---

# Asanro Elevator Enterprise Ecosystem

### *Commercial-Grade, Event-Driven Monorepo Architecture*

<br/>

[![PRODUCTION DEPLOYMENT](https://img.shields.io/badge/PRODUCTION_DEPLOYMENT-VERCEL_LIVE-000000?style=for-the-badge&logo=vercel&logoColor=white)](https://web-portal-ivory-nine.vercel.app/)
[![Next.js 14](https://img.shields.io/badge/Next.js_14-App_Router-000000?style=for-the-badge&logo=next.js&logoColor=white)](https://nextjs.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.110+-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![Flutter 3](https://img.shields.io/badge/Flutter_3-Cross--Platform-02569B?style=for-the-badge&logo=flutter&logoColor=white)](https://flutter.dev/)
[![PostgreSQL 16](https://img.shields.io/badge/PostgreSQL_16-Dual_Engine-336791?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Redis 7](https://img.shields.io/badge/Redis_7-Cache_&_Lock-DC382D?style=for-the-badge&logo=redis&logoColor=white)](https://redis.io/)
[![Docker Compose](https://img.shields.io/badge/Docker-Compose_v3.8-2496ED?style=for-the-badge&logo=docker&logoColor=white)](https://www.docker.com/)

<br/>
<br/>

**🇺🇸 [Read Documentation in English](#english-documentation) &nbsp; | &nbsp; 🇮🇷 [مطالعه مستندات معماری به زبان فارسی](#persian-documentation)**

<br/>

</div>

---

<a id="english-documentation"></a>

# 🇬🇧 English Documentation

<div align="right">
  <i>Language: <b>English</b> | <a href="#persian-documentation">🇮🇷 مطالعه مستندات به زبان فارسی</a></i>
</div>

---

## 1. Executive Summary & Ecosystem Overview

> ### 📌 Executive Summary
> **Asanro Etminan Amir Kerman** is a licensed elevator engineering and manufacturing enterprise in Kerman province, specializing in high-speed traction, gearless, machine-room-less (MRL), and hydraulic elevator installations, national safety certification, and 24/7 periodic maintenance contracts.
>
> This monorepo consolidates the entire technical operations of the firm into a single, cohesive, high-performance monorepo:
> 
> * **Customer Web Portal (`apps/web-portal`)**: Next.js 14 App Router Progressive Web App (PWA) with zero-CLS fluid hero slider, public parts storefront, interactive consultation workflows, and client/admin management dashboard.
> * **Technician & Manager App (`apps/mobile-app`)**: Cross-platform Flutter mobile application used on-site by field technicians for routine elevator inspections, parachute load-testing, task tracking, and building manager check-ins.
> * **Operational ERP Core API (`services/core-api`)**: FastAPI backend managing the engineering master data—buildings, elevator specifications, technical inspections, contracts, financial accounting, and emergency dispatch.
> * **Storefront & Bot Service (`services/bot-service`)**: High-throughput FastAPI backend powering customer interactions across Telegram and Bale messengers, online shopping carts, payment gateway webhooks, and the Outbox Data Sync engine.
> * **Shared Protocols & Data Sync (`shared/` & `services/bot-service/services/core_sync_service.py`)**: Real-time cross-database synchronization ensuring contract requests approved in the web portal are harmonized 1:1 with the Core Elevator App database.

<br/>

```mermaid
flowchart LR
    subgraph Clients["Presentation Layer (Omnichannel Clients)"]
        WP["Next.js 14 Web Portal<br/>(Port :3000 / Vercel Edge)"]
        MA["Flutter Mobile App<br/>(Technicians & Managers)"]
        TB["Telegram / Bale Bots<br/>(Customer Automation)"]
    end

    subgraph Gateway["Internal Network Gateway"]
        DOCKER["Docker Bridge Network<br/>(elevator_network)"]
    end

    subgraph Backends["Application Backend Tier"]
        BOT["Bot & Storefront API<br/>FastAPI (:8000)"]
        CORE["Core ERP API<br/>FastAPI (:8001)"]
        SYNC["Core Sync Worker<br/>(Transactional Outbox)"]
    end

    subgraph Persistence["Storage & Caching Tier"]
        PG[("PostgreSQL 16 Engine<br/>Dual DB (elevator_db & shopbot_db)")]
        RD[("Redis 7 In-Memory<br/>Cache & Redlock Mutex")]
    end

    WP -->|HTTP / REST| DOCKER
    TB -->|Webhooks| DOCKER
    MA -->|HTTP / REST| DOCKER

    DOCKER --> BOT
    DOCKER --> CORE
    BOT -->|Rate Limiting / Redlock| RD
    BOT -->|AsyncPG Engine| PG
    CORE -->|SQLAlchemy / psycopg2| PG
    BOT -.->|Cross-DB Event Sync| SYNC
    SYNC -->|1:1 Harmonization| CORE
```

---

## 2. Technology Stack Matrix

| Domain | Technology | Implementation Details & Architectural Purpose |
| :--- | :--- | :--- |
| **Customer Web Portal** | Next.js 14 (App Router), React 18, TypeScript | Tailwind CSS, Lucide Icons, Vazirmatn Typography, Zustand, Axios, Standalone Output |
| **Field Mobile Application** | Flutter 3.x, Dart 3.x | BLoC / Provider Pattern, Dio Client, Hive / SQLite (Offline Cache), Camera & Geolocation |
| **Core Operational API** | Python 3.12, FastAPI, Uvicorn | SQLAlchemy 2.0 ORM, Alembic Migrations, psycopg2-binary, Pydantic v2, python-jose (JWT) |
| **Bot Service & Storefront** | Python 3.12, FastAPI, Asyncpg | Async SQLAlchemy, Redis-py, Redlock Mutex, python-telegram-bot, aiohttp Webhooks |
| **Data Persistence** | PostgreSQL 16 Alpine | Dual Logical Databases (`elevator_db` & `shopbot_db`), Automated Bash Initializer |
| **Caching & Message Broker** | Redis 7 Alpine | Distributed Locking (Redlock), Token Bucket Rate Limiting, Session State Management |
| **Containerization & CI/CD** | Docker & Docker Compose v3.8 | Multi-Stage Builds, Non-root `appgroup/nonroot` security, Automated Healthchecks |

---

## 3. Monorepo Directory Architecture

```
Elevator_Ecosystem/
├── apps/
│   ├── web-portal/                  # Next.js 14 Customer Storefront, Contracts & Admin ERP
│   │   ├── src/
│   │   │   ├── app/                 # Next.js App Router Pages (Admin, Dashboard, Products)
│   │   │   ├── components/          # Atomic UI Kit, Section Slides, Header, Footer
│   │   │   ├── lib/                 # Central Axios Client, Authentication & API DTOs
│   │   │   └── store/               # Zustand Global State (Auth, Cart, Navigation)
│   │   ├── public/                  # Static Assets, Compressed Hero Images, Logos
│   │   ├── Dockerfile               # Multi-stage Standalone Node 20-alpine Dockerfile
│   │   ├── .dockerignore            # Excludes node_modules, .next, local logs
│   │   └── next.config.mjs          # Standalone Output & Dynamic Internal API Rewrite
│   └── mobile-app/                  # Flutter Cross-Platform Mobile App (Android/iOS)
│       ├── lib/                     # Feature-driven Architecture (Technician Workflows)
│       └── pubspec.yaml             # Dart & Flutter Dependencies
├── services/
│   ├── core-api/                    # Operational Elevator & Inspection API (FastAPI)
│   │   ├── alembic/                 # Database Migrations for elevator_db
│   │   ├── core/                    # Security, JWT, Database Session & Settings
│   │   ├── modules/                 # Building, Elevator, Contract, Report & Analytics
│   │   ├── main.py                  # FastAPI Entrypoint with CORS & /health Probe
│   │   ├── requirements.txt         # Production Python Dependencies
│   │   ├── Dockerfile               # Multi-stage Hardened Python 3.12-slim Dockerfile
│   │   └── .dockerignore            # Excludes venv, pycache, local uploads
│   └── bot-service/                 # Storefront, Messenger Bots & Outbox Engine (FastAPI)
│       ├── alembic/                 # Database Migrations for shopbot_db
│       ├── api/                     # REST Endpoints (Products, Orders, Contracts, Users)
│       ├── core/                    # Config, Redlock Distributed Locks, Pydantic Settings
│       ├── services/                # Business Logic & core_sync_service.py (Cross-DB Sync)
│       ├── workers/                 # Outbox Processor & Background Jobs
│       ├── main.py                  # Storefront API Entrypoint with /health Probe
│       ├── requirements.txt         # Production Dependencies (asyncpg, redis, etc.)
│       ├── Dockerfile               # Multi-stage Hardened Python 3.12-slim Dockerfile
│       └── .dockerignore            # Excludes venv, pycache, local media
├── infra/
│   ├── docker/
│   │   └── init-multi-postgres.sh   # Bash Init Script for Dual-Database Initialization
│   └── scripts/                     # Operational & Deployment Automation Scripts
├── shared/
│   ├── protos/                      # Protocol Buffers Definitions (gRPC contracts)
│   └── docs/                        # Architectural Specifications & Schemas
├── storage/
│   └── uploads/                     # Centralized Persistent Media Storage
├── docker-compose.yml               # Master Production-Ready Docker Compose Orchestration
├── .env.example                     # Centralized Monorepo Environment Template
├── .env.docker                      # Docker-Ready Production Configuration
└── README.md                        # Enterprise Documentation & Operator Guide
```

---

## 4. Port Mappings & Service Endpoints

| Service | Container Name | Host Port | Internal Port | Protocol | Local & Live Access Points |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Web Portal (Next.js)** | `elevator_web_portal` | `3000` | `3000` | HTTP | [http://localhost:3000](http://localhost:3000) <br/> **🚀 Live Demo:** [https://web-portal-ivory-nine.vercel.app/](https://web-portal-ivory-nine.vercel.app/) |
| **Bot Service & Storefront** | `elevator_bot_service` | `8000` | `8000` | HTTP | [http://localhost:8000/api/v1/docs](http://localhost:8000/api/v1/docs) |
| **Core Operational API** | `elevator_core_api` | `8001` | `8000` | HTTP | [http://localhost:8001/docs](http://localhost:8001/docs) |
| **PostgreSQL Database** | `elevator_postgres` | `5432` | `5432` | TCP | `localhost:5432` (`elevator_db`, `shopbot_db`) |
| **Redis In-Memory** | `elevator_redis` | `6379` | `6379` | TCP | `localhost:6379` |

---

## 5. Local Development Quick Start

The entire ecosystem can be bootstrapped locally in seconds using Docker Compose or executed natively for focused feature development.

### Quick Start with Docker Compose
```powershell
# 1. Clone the repository and navigate to root
git clone <repository_url> Elevator_Ecosystem
cd Elevator_Ecosystem

# 2. Copy the Docker environment template
Copy-Item .env.docker .env   # On Windows PowerShell
# OR: cp .env.docker .env    # On Linux / macOS

# 3. Build and launch all services in detached mode
docker compose up --build -d

# 4. Verify running containers and health status
docker compose ps
```

### Native Development Commands (Without Docker)

```powershell
# 1. Start Database & Cache in background
docker compose up -d postgres redis

# 2. Start Core API (Elevator ERP)
cd services/core-api
python -m venv venv
.\venv\Scripts\Activate.ps1            # Windows (source venv/bin/activate on Linux)
pip install -r requirements.txt
alembic upgrade head
uvicorn main:app --reload --port 8001

# 3. Start Bot Service & Storefront Backend
cd services/bot-service
python -m venv venv
.\venv\Scripts\Activate.ps1            # Windows (source venv/bin/activate on Linux)
pip install -r requirements.txt
alembic upgrade head
uvicorn main:app --reload --port 8000

# 4. Start Web Portal (Next.js 14)
cd apps/web-portal
npm install
npm run dev                            # http://localhost:3000

# 5. Start Mobile App (Flutter)
cd apps/mobile-app
flutter pub get
flutter run
```

---

## 6. Production Deployment: Docker on Linux VPS (Complete 5-Step Guide)

This step-by-step guide walks a Systems Administrator or DevOps Engineer through deploying the entire Elevator Ecosystem monorepo on a production Ubuntu 22.04 / 24.04 LTS VPS with high availability, isolated networking, Nginx reverse proxy, and automated SSL certificates.

### Step 1: Server Preparation & Docker Installation

Log in to your clean Ubuntu server via SSH and prepare the operating system:

```bash
# Update and upgrade system packages
sudo apt update && sudo apt upgrade -y

# Install essential system utilities and security tools
sudo apt install -y curl wget git ufw htop ca-certificates gnupg lsb-release

# Install Docker Engine & Docker Compose via official Docker repository
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Enable Docker to run on boot and grant permissions to current user
sudo systemctl enable docker
sudo systemctl start docker
sudo usermod -aG docker $USER

# Configure UFW (Uncomplicated Firewall) for Enterprise Security
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp comment 'SSH'
sudo ufw allow 80/tcp comment 'HTTP'
sudo ufw allow 443/tcp comment 'HTTPS'
# Explicitly block external access to raw database ports (Docker bridges handle internal communication)
sudo ufw deny 5432/tcp comment 'Block Postgres WAN'
sudo ufw deny 6379/tcp comment 'Block Redis WAN'
sudo ufw --force enable
sudo ufw status verbose
```

> **Note:** Log out and log back in to activate the non-root Docker user group: `exit` followed by `ssh user@server-ip`.

---

### Step 2: Repository Acquisition & Workdir Initialization

Clone the monorepo into the standard `/opt` enterprise software directory:

```bash
# Create and claim ownership of the application directory
sudo mkdir -p /opt/elevator-ecosystem
sudo chown -R $USER:$USER /opt/elevator-ecosystem

# Clone the repository
git clone <repository_url> /opt/elevator-ecosystem
cd /opt/elevator-ecosystem

# Verify workspace files
ls -la
```

---

### Step 3: Environment Configuration (.env)

Instantiate the production environment configuration from the pre-configured `.env.docker` template:

```bash
# Copy production Docker environment template
cp .env.docker .env

# Generate secure random secret keys
CORE_KEY=$(openssl rand -hex 32)
BOT_KEY=$(openssl rand -hex 32)
DB_PASS=$(openssl rand -base64 24 | tr -dc 'a-zA-Z0-9' | head -c 20)

# Apply secure credentials to the .env file
sed -i "s/POSTGRES_PASSWORD=.*/POSTGRES_PASSWORD=${DB_PASS}/" .env
sed -i "s/secure_postgres_password_2026\!/${DB_PASS}/g" .env
sed -i "s/elev_core_prod_jwt_secret_key_.*/CORE_SECRET_KEY=${CORE_KEY}/" .env
sed -i "s/shopbot_prod_jwt_secret_key_.*/BOT_SECRET_KEY=${BOT_KEY}/" .env

# Open and customize public domains and bot tokens
nano .env
```

Ensure the following variables are configured with your real domain:
```env
ENVIRONMENT=production
DEBUG=False
POSTGRES_USER=postgres
POSTGRES_PASSWORD=<strong_generated_password>
CORE_DATABASE_URL=postgresql://postgres:<strong_password>@postgres:5432/elevator_db
BOT_DATABASE_URL=postgresql+asyncpg://postgres:<strong_password>@postgres:5432/shopbot_db
BOT_CORE_DATABASE_URL=postgresql+asyncpg://postgres:<strong_password>@postgres:5432/elevator_db
INTERNAL_API_URL=http://bot-service:8000
NEXT_PUBLIC_API_URL=https://api.your-domain.com/api/v1
```

---

### Step 4: Bootstrapping & Orchestrating the Ecosystem

Launch the multi-container stack with automated building, healthchecking, and multi-tenant database initialization:

```bash
# Build and launch all 5 services in detached mode
docker compose up --build -d

# Check health and container statuses
docker compose ps

# Inspect logs to verify both databases (elevator_db & shopbot_db) were created
docker compose logs postgres | grep "All databases initialized successfully"

# Stream logs to ensure API services and Web Portal booted cleanly
docker compose logs -f --tail=50

# Verify Alembic migrations and run initial seeds if required
docker compose exec core-api alembic upgrade head
docker compose exec bot-service alembic upgrade head
docker compose exec core-api python seed_data.py
docker compose exec bot-service python seed_db.py
```

---

### Step 5: Nginx Reverse Proxy Setup & Let's Encrypt SSL

Install Nginx to act as the high-performance SSL terminator and reverse proxy, routing incoming internet traffic on ports 80/443 to the respective Docker host ports (`3000`, `8000`, and `8001`):

```bash
# Install Nginx and Certbot
sudo apt install -y nginx certbot python3-certbot-nginx

# Create the Nginx site configuration
sudo nano /etc/nginx/sites-available/elevator-ecosystem.conf
```

Paste the following production Nginx configuration:

```nginx
# Upstream definitions for load balancing and clarity
upstream web_portal_upstream {
    server 127.0.0.1:3000;
    keepalive 32;
}

upstream bot_service_upstream {
    server 127.0.0.1:8000;
    keepalive 32;
}

upstream core_api_upstream {
    server 127.0.0.1:8001;
    keepalive 32;
}

# 1. Main Web Portal Frontend (asanro.com & www.asanro.com)
server {
    listen 80;
    server_name asanro.com www.asanro.com;

    client_max_body_size 50M;

    # Security Headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    location / {
        proxy_pass http://web_portal_upstream;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}

# 2. Unified Backend APIs (api.asanro.com)
server {
    listen 80;
    server_name api.asanro.com;

    client_max_body_size 100M;

    # Customer Web & Bot Storefront API (/api/v1/)
    location /api/ {
        proxy_pass http://bot_service_upstream;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Technician & Core Operational ERP API (/core/)
    location /core/ {
        proxy_pass http://core_api_upstream/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Health Probes
    location /health {
        proxy_pass http://bot_service_upstream/health;
    }
}
```

Enable the configuration and issue SSL certificates:

```bash
# Enable site configuration
sudo ln -sf /etc/nginx/sites-available/elevator-ecosystem.conf /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Test Nginx syntax
sudo nginx -t

# Reload Nginx service
sudo systemctl reload nginx

# Obtain and install SSL certificates automatically
sudo certbot --nginx -d asanro.com -d www.asanro.com -d api.asanro.com --non-interactive --agree-tos -m admin@asanro.com

# Verify automated SSL certificate renewal timer
sudo systemctl status certbot.timer
```

---

## 7. Alternative Hybrid Architecture: Frontend on Vercel

If you prefer hosting the Next.js Web Portal on Vercel's global Edge CDN while running backend services on your Linux VPS:

```mermaid
flowchart LR
    USERS["End Users (Web Browser)"] -->|HTTPS| VERCEL["Vercel Global Edge Network<br/>(apps/web-portal)"]
    TECH["Technicians (Mobile App)"] -->|HTTPS| VPS["Linux VPS (Ubuntu 24.04)<br/>Nginx + Docker Engine"]
    VERCEL -->|REST API /api/v1| VPS
    VPS --> BOT_API["bot-service (:8000)"]
    VPS --> CORE_API["core-api (:8001)"]
```

1. **Vercel Settings:**
   * Import repository into Vercel.
   * Root Directory: `apps/web-portal`
   * Framework Preset: `Next.js`
   * Environment Variables:
     ```env
     NEXT_PUBLIC_API_URL=https://api.your-domain.com/api/v1
     INTERNAL_API_URL=https://api.your-domain.com
     NODE_ENV=production
     ```
2. **VPS Backend Command:**
   Run only backend infrastructure without running `web-portal` inside Docker:
   ```bash
   docker compose up -d postgres redis core-api bot-service
   ```

---

## 8. Database Migrations, Seeding & Automated Backups

### Manual Migrations
```bash
# Migrate elevator_db schema
docker compose exec core-api alembic upgrade head

# Migrate shopbot_db schema
docker compose exec bot-service alembic upgrade head
```

### Automated Nightly Backup Script (Cron Job)
Create a hardened database backup script on the host VPS:

```bash
sudo mkdir -p /opt/scripts /opt/backups
sudo nano /opt/scripts/backup-databases.sh
```

Paste the backup script:
```bash
#!/bin/bash
set -e

BACKUP_DIR="/opt/backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
CONTAINER="elevator_postgres"
DB_USER="postgres"

mkdir -p "$BACKUP_DIR"

# Backup elevator_db
docker exec "$CONTAINER" pg_dump -U "$DB_USER" elevator_db | gzip > "$BACKUP_DIR/elevator_db_$TIMESTAMP.sql.gz"

# Backup shopbot_db
docker exec "$CONTAINER" pg_dump -U "$DB_USER" shopbot_db | gzip > "$BACKUP_DIR/shopbot_db_$TIMESTAMP.sql.gz"

# Keep only the last 14 days of backups
find "$BACKUP_DIR" -type f -name "*.sql.gz" -mtime +14 -delete

echo "[$TIMESTAMP] Databases backed up successfully to $BACKUP_DIR."
```

Schedule daily execution at 03:00 AM:
```bash
sudo chmod +x /opt/scripts/backup-databases.sh
(crontab -l 2>/dev/null; echo "0 3 * * * /opt/scripts/backup-databases.sh >> /var/log/db_backup.log 2>&1") | crontab -
```

---

## 9. Security & Enterprise Hardening Standards

* **Unprivileged Execution:** All Docker containers run with non-root security contexts (`nonroot:appgroup` UID 10001 in Python, `nextjs:nodejs` UID 1001 in Node.js).
* **Network Isolation:** Internal service communication occurs over a private Docker bridge network (`elevator_network`). Database and cache ports are firewalled from the public internet.
* **Token Security:** Short-lived JWT access tokens (HMAC SHA-256) paired with secure HttpOnly cookies.
* **Input Validation & Sanitization:** Strict Pydantic v2 schemas on backends and Zod validation on frontend forms.
* **CORS Whitelisting:** Explicit origin whitelisting in FastAPI configuration preventing unauthorized cross-origin requests.

---

## 10. Authors & Technical Governance

* **Enterprise:** شرکت آسانرو اطمینان امیر کرمان (Asanro Etminan Amir Kerman)
* **Management & Engineering Director:** مهندس محبی (Mohebbi) — `09133982695`
* **Official Registry:** مجری رسمی استاندارد و بیمه آسانسور و پله‌برقی در استان کرمان
* **Architecture:** Enterprise Monorepo Architecture Specification (Asanro Elevator Enterprise Engineering Standards)

---
*Maintained under standard commercial enterprise licensing. All rights reserved.*

<br/>

<br/>

<div align="center">
  <a href="#top">⬆️ Back to Top</a> &nbsp; | &nbsp; <a href="#persian-documentation">🇮🇷 Switch to Persian Documentation (مطالعه مستندات فارسی)</a>
</div>

---

<a id="persian-documentation"></a>

# 🇮🇷 مستندات جامع معماری و فنی اکوسیستم آسانرو (فارسی)

<div align="left">
  <i>زبان: <b>فارسی</b> | <a href="#english-documentation">🇬🇧 Switch to English Documentation</a></i>
</div>

---

## ۱. خلاصه اجرایی و نمای کلی اکوسیستم (Executive Summary & Ecosystem Overview)

> ### 📌 خلاصه اجرایی
> **شرکت آسانرو اطمینان امیر کرمان**، مجری رسمی و دارای پروانه مهندسی و ساخت انواع آسانسورهای کششی سرعتی، گیرلس، روملس (MRL) و هیدرولیک، اخذ تاییدیه استاندارد ملی ایران و قراردادهای سرویس و نگهداری دوره‌ای ۲۴ ساعته در استان کرمان می‌باشد.
>
> این مونو‌ریپو تمامی زیرساخت‌های نرم‌افزاری و عملیات مهندسی شرکت را در یک ساختار یکپارچه، رویدادمحور و با بازدهی بالا تجمیع کرده است:
>
> * **وب‌پورتال مشتریان (`apps/web-portal`)**: اپلیکیشن تحت وب مدرن بر پایه Next.js 14 App Router و معماری Progressive Web App (PWA) با اسلایدر هیرو بدون پرش ساختاری (Zero-CLS)، فروشگاه آنلاین قطعات آسانسور، سیستم مشاوره آنلاین و داشبورد مدیریتی مشتریان و کارشناسان.
> * **اپلیکیشن تکنسین‌ها و مدیران ساختمان (`apps/mobile-app`)**: اپلیکیشن کراس‌پلتفرم بر پایه فریمورک Flutter که توسط تکنسین‌های فنی در محل پروژه جهت چک‌لیست‌های دوره‌ای، تست بار پاراشوت، ثبت گزارش‌های خرابی و تایید حضور توسط مدیر ساختمان استفاده می‌شود.
> * **هسته اصلی عملیات و ERP سازمانی (`services/core-api`)**: بک‌اند پرسرعت مبتنی بر FastAPI جهت مدیریت داده‌های کلیدی مهندسی اعم از مشخصات ساختمان‌ها، ویژگی‌های فنی آسانسورها، بازرسی‌های ادواری، قراردادهای رسمی، محاسبات مالی و اعزام سریع تکنسین.
> * **سرویس فروشگاهی و ربات‌های پیام‌رسان (`services/bot-service`)**: سرویس FastAPI با کارایی بالا جهت تعاملات بلادرنگ کاربران از طریق ربات تلگرام و بله، سبد خرید قطعات، وب‌هوک‌های درگاه پرداخت بانکی و موتور همگام‌سازی رویدادها (Outbox Pattern).
> * **پروتکل‌های مشترک و همگام‌سازی دیتابیس (`shared/` و `core_sync_service.py`)**: سینک بلادرنگ تراکنشی میان دو دیتابیس که تضمین می‌کند قراردادها و اطلاعات ثبت‌شده در وب‌پورتال، بدون تداخل و به صورت ۱:۱ با پایگاه داده اپلیکیشن تکنسین‌ها همگام شوند.

<br/>

```mermaid
flowchart LR
    subgraph Clients["لایه رابط کاربری و کلاینت‌ها (Presentation Layer)"]
        WP["وب‌پورتال Next.js 14<br/>(پورت ۳۰۰۰ / Vercel Edge)"]
        MA["اپلیکیشن موبایل Flutter<br/>(تکنسین‌ها و مدیران)"]
        TB["ربات‌های تلگرام و بله<br/>(اتوماسیون خدمات مشتریان)"]
    end

    subgraph Gateway["دروازه شبکه داخلی داکر"]
        DOCKER["شبکه Bridge ایزوله داکر<br/>(elevator_network)"]
    end

    subgraph Backends["لایه سرویس‌های بک‌اند (Application Tier)"]
        BOT["سرویس ربات و فروشگاه<br/>FastAPI (:8000)"]
        CORE["سرویس اصلی ERP آسانسور<br/>FastAPI (:8001)"]
        SYNC["ورکر همگام‌سازی دیتابیس<br/>(Transactional Outbox)"]
    end

    subgraph Persistence["لایه ذخیره‌سازی و کش (Storage & Cache)"]
        PG[("موتور PostgreSQL 16<br/>دیتابیس دوگانه (elevator_db و shopbot_db)")]
        RD[("کش حافظه‌ای Redis 7<br/>قفل‌های توزیع‌شده Redlock")]
    end

    WP -->|HTTP / REST| DOCKER
    TB -->|Webhooks| DOCKER
    MA -->|HTTP / REST| DOCKER

    DOCKER --> BOT
    DOCKER --> CORE
    BOT -->|محدودسازی نرخ و Redlock| RD
    BOT -->|درایور AsyncPG| PG
    CORE -->|SQLAlchemy و psycopg2| PG
    BOT -.->|همگام‌سازی رویدادها| SYNC
    SYNC -->|تطبیق ۱ به ۱ داده‌ها| CORE
```

---

## ۲. ماتریس پشته فناوری (Technology Stack Matrix)

| لایه معماری | فناوری | جزئیات پیاده‌سازی و هدف معماری |
| :--- | :--- | :--- |
| **وب‌پورتال مشتریان** | Next.js 14 (App Router) | رندر ترکیبی SSR/SSG، تایپ‌اسکریپت Strict، تیل‌ویند CSS با طراحی مدرن مشکی/طلایی، کامپوننت‌های Framer Motion، استایل‌های ایزوله اسلایدر Zero-CLS. |
| **اپلیکیشن موبایل** | Flutter 3.x (Dart) | معماری Clean Architecture، مدیریت وضعیت Riverpod/BLoC، ماژول‌های امضای دیجیتال بازرسی و آفلاین-فرست کشینگ برای محیط موتورخانه بدون اینترنت. |
| **سرویس اصلی ERP** | FastAPI (Python 3.12) | معماری لایه‌ای Service-Repository، اعتبارسنجی با Pydantic v2، مدیریت مایگریشن‌های Alembic، موتور ORM با SQLAlchemy 2.0. |
| **سرویس ربات و فروشگاه** | FastAPI + Python-Telegram-Bot + Bale | وب‌هوک‌های با تاخیر کم، موتور سینک Outbox مبتنی بر پایگاه‌داده، پردازش صف خرید و اتصال امن به درگاه پرداخت شاپرک/زرین‌پال. |
| **پایگاه داده رابطه‌ای** | PostgreSQL 16 Alpine | دو کانتینر لاجیکال مجزا: `elevator_db` (عملیات مهندسی و بازرسی‌ها) و `shopbot_db` (مشتریان، ربات‌ها و کاتالوگ فروشگاه). |
| **کش و صف پیام** | Redis 7 Alpine | کش کردن کوئری‌های تکراری، سیستم قفل‌های توزیع‌شده Redlock برای جلوگیری از رزرو همزمان قطعات، و Rate Limiting توزیع‌شده. |
| **کانتینرسازی و شبکه** | Docker & Docker Compose v3.8 | بیلد‌های Multi-Stage بهینه، اجرای Unprivileged بدون دسترسی root، و شبکه داخلی Bridge ایزوله (`elevator_network`). |
| **وب‌سرور و Reverse Proxy** | Nginx + Certbot | هدایت خودکار ترافیک HTTPS با الگوریتم HTTP/2، مسیریابی تمیز اندپوینت‌ها (`/` برای وب‌پورتال، `/api/v1/` برای ربات و `/core/` برای ERP)، صدور SSL خودکار Let's Encrypt. |

---

## ۳. معماری ساختار دایرکتوری‌های مونو‌ریپو (Monorepo Directory Architecture)

```text
Elevator_Ecosystem/
├── apps/
│   ├── mobile-app/              # اپلیکیشن موبایل فلاتر (تکنسین‌ها و مدیران ساختمان)
│   │   ├── lib/                 # سورس‌کد دارت (معماری لایه‌ای BLoC/Clean)
│   │   └── pubspec.yaml         # نیازمندی‌های فلاتر و وابستگی‌های پکیج‌ها
│   └── web-portal/              # وب‌پورتال و فروشگاه مدرن Next.js 14
│       ├── src/
│       │   ├── app/             # مسیرهای App Router و صفحات استاتیک/داینامیک
│       │   ├── components/      # کامپوننت‌های ماژولار UI (HeroSlider، کاتالوگ قطعات، فرم‌ها)
│       │   └── lib/             # هلپرها، تایپ‌ها و کلاینت‌های API
│       ├── public/images/       # است‌های گرافیکی، تصاویر آسانسور لوکس و کات‌اوت‌ها
│       ├── Dockerfile           # داکرفایل Multi-Stage تولید خروجی Standalone نود ۲۰
│       └── next.config.mjs      # پیکربندی پروکسی داخلی و Standalone Output
├── services/
│   ├── core-api/                # بک‌اند اصلی عملیات مهندسی و استاندارد (ERP)
│   │   ├── app/                 # مسیرهای FastAPI، سرویس‌ها و مدل‌های SQLAlchemy
│   │   ├── migrations/          # اسکریپت‌های مایگریشن دیتابیس Alembic
│   │   ├── Dockerfile           # کانتینر چندمرحله‌ای پایتون ۳.۱۲ با کاربر امن Non-root
│   │   └── requirements.txt     # کتابخانه‌های پایتونی (FastAPI, SQLAlchemy, psycopg2)
│   └── bot-service/             # سرویس فروشگاه آنلاین، ربات‌های تلگرام/بله و سینک
│       ├── api/                 # اندپوینت‌های RESTful و هوک‌های وب
│       ├── bot/                 # هندلرهای ربات‌های بله و تلگرام
│       ├── services/            # موتور Outbox Sync و سرویس‌های درگاه پرداخت
│       ├── Dockerfile           # کانتینر امن و سبک پایتون ۳.۱۲
│       └── requirements.txt     # کتابخانه‌های پردازش تلگرام و وب
├── shared/                      # کدهای مشترک (اسکیماهای DTO مشترک و پروتکل‌های دیتابیس)
├── infra/
│   └── docker/
│       └── init-multi-postgres.sh # اسکریپت اتوماتیک ساخت هر دو دیتابیس در اولین بوت
├── docker-compose.yml           # فایل ارکستراسیون مستر داکر برای اجرای همزمان ۵ سرویس
├── .env.docker                  # تمپلیت متغیرهای محیطی پروداکشن کانتینرها
├── .env.example                 # نمونه متغیرهای محیطی توسعه لوکال
└── README.md                    # مستندات مرجع جامع سازمانی (دو زبانه)
```

---

## ۴. نگاشت پورت‌ها و اندپوینت‌های سرویس‌ها (Port Mappings & Service Endpoints)

| نام سرویس داکر | پورت کانتینر | پورت هاست | پروتکل / مسیر | هدف و دسترسی در شبکه |
| :--- | :--- | :--- | :--- | :--- |
| **`web-portal`** | `3000` | `3000` | HTTP / Next.js | وب‌پورتال عمومی و فروشگاه آنلاین (`http://localhost:3000`) |
| **`bot-service`** | `8000` | `8000` | HTTP / FastAPI | API فروشگاه، وب‌هوک ربات‌ها و مستندات OpenAPI (`http://localhost:8000/docs`) |
| **`core-api`** | `8000` | `8001` | HTTP / FastAPI | API هسته مرکزی ERP مهندسی و مستندات Swagger (`http://localhost:8001/docs`) |
| **`postgres`** | `5432` | `5432` | TCP / PostgreSQL | پایگاه داده رابطه‌ای (دیتابیس‌های `elevator_db` و `shopbot_db`) |
| **`redis`** | `6379` | `6379` | TCP / Redis | کش حافظه‌ای پرسرعت و سرور قفل‌های توزیع‌شده Redlock |

---

## ۵. راهنمای راه‌اندازی سریع در محیط توسعه محلی (Local Development Quick Start)

### راه‌اندازی سریع با Docker Compose (پیشنهادی)

```bash
# ۱. دریافت آخرین نسخه کد مخزن
git clone https://github.com/mahdi8280/Elevator_Ecosystem.git
cd Elevator_Ecosystem

# ۲. ایجاد فایل متغیرهای محیطی از روی تمپلیت
copy .env.docker .env    # در محیط ویندوز PowerShell
# یا در لینوکس / مک: cp .env.docker .env

# ۳. بیلد و اجرای تمام کانتینرها در پس‌زمینه
docker compose up --build -d

# ۴. بررسی وضعیت سلامت و آماده‌به‌کار بودن سرویس‌ها
docker compose ps
```

### اجرای مستقیم بدون داکر (Native Development Commands)

```bash
# ۱. اجرای پایگاه داده و کش در پس‌زمینه با داکر
docker compose up -d postgres redis

# ۲. راه‌اندازی هسته مرکزی مهندسی (Core API)
cd services/core-api
python -m venv venv
# فعال‌سازی در ویندوز: .\venv\Scripts\activate | در لینوکس: source venv/bin/activate
pip install -r requirements.txt
alembic upgrade head
uvicorn main:app --host 0.0.0.0 --port 8001 --reload

# ۳. راه‌اندازی سرویس فروشگاه و ربات‌ها (Bot Service)
cd ../bot-service
python -m venv venv
# فعال‌سازی در ویندوز: .\venv\Scripts\activate | در لینوکس: source venv/bin/activate
pip install -r requirements.txt
alembic upgrade head
uvicorn main:app --host 0.0.0.0 --port 8000 --reload

# ۴. راه‌اندازی وب‌پورتال کاربری (Web Portal)
cd ../../apps/web-portal
npm install
npm run dev

# ۵. راه‌اندازی اپلیکیشن موبایل تکنسین‌ها (Mobile App)
cd ../mobile-app
flutter pub get
flutter run
```

---

## ۶. راهنمای استقرار پروداکشن در سرور لینوکس VPS (راهنمای جامع ۵ مرحله‌ای)

این بخش یک راهنمای عملیاتی و دقیق برای دیپلوی کل پشته روی سرور مجازی (Ubuntu 24.04 LTS) با Nginx و گواهی رایگان SSL است.

### مرحله ۱: آماده‌سازی سرور و نصب داکر

وارد سرور ابری خود شده و پکیج‌های پایه و داکر رسمی را نصب نمایید:

```bash
# به‌روزرسانی مخازن لینوکس
sudo apt-get update && sudo apt-get upgrade -y

# نصب ابزارهای ضروری و امنیتی
sudo apt-get install -y curl git ufw ca-certificates gnupg lsb-release htop

# نصب Docker Engine و پلاگین داکر کامپوز از مخزن رسمی داکر
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

echo \
  "deb [arch="$(dpkg --print-architecture)" signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  "$(. /etc/os-release && echo "$VERSION_CODENAME")" stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# فعال‌سازی اجرای داکر در هنگام بوت سرور و تنظیم دسترسی کاربر جاری
sudo systemctl enable --now docker
sudo usermod -aG docker $USER

# پیکربندی فایروال لینوکس (UFW) برای امنیت حداکثری
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp    # پورت SSH
sudo ufw allow 80/tcp    # ترافیک HTTP
sudo ufw allow 443/tcp   # ترافیک HTTPS
sudo ufw --force enable

# مسدودسازی صریح پورت‌های پایگاه داده از دسترسی مستقیم خارجی
sudo ufw deny 5432/tcp
sudo ufw deny 6379/tcp
```

### مرحله ۲: کلون کردن سورس‌کد و آماده‌سازی دایرکتوری کاری

```bash
# ساخت پوشه استقرار پروژه و تنظیم مالکیت کاربر جاری
sudo mkdir -p /opt/elevator-ecosystem
sudo chown -R $USER:$USER /opt/elevator-ecosystem
cd /opt/elevator-ecosystem

# کلون کردن مخزن گیت
git clone https://github.com/mahdi8280/Elevator_Ecosystem.git .

# بررسی ساختار فایل‌ها
ls -la
```

### مرحله ۳: پیکربندی متغیرهای محیطی پروداکشن (`.env`)

```bash
# ایجاد فایل اصلی تنظیمات از روی تمپلیت پروداکشن
cp .env.docker .env

# تولید کلیدهای مخفی و امن تصادفی ۶۴ کاراکتری
POSTGRES_PASS=$(openssl rand -hex 24)
REDIS_PASS=$(openssl rand -hex 24)
JWT_SECRET=$(openssl rand -hex 32)

# جایگزینی مقادیر امن در فایل .env
sed -i "s/POSTGRES_PASSWORD=secure_postgres_pass_here/POSTGRES_PASSWORD=$POSTGRES_PASS/g" .env
sed -i "s/REDIS_PASSWORD=secure_redis_pass_here/REDIS_PASSWORD=$REDIS_PASS/g" .env
sed -i "s/SECRET_KEY=change_this_to_a_super_secret_jwt_key_at_least_32_chars/SECRET_KEY=$JWT_SECRET/g" .env

# ویرایش فایل با nano جهت تنظیم دامنه اختصاصی و توکن‌های ربات‌ها
nano .env
```

### مرحله ۴: بیلد و راه‌اندازی کانتینرها با Docker Compose

```bash
# بیلد تصاویر و اجرای تمام ۵ کانتینر در حالت پیش‌زمینه
docker compose up --build -d

# مشاهده وضعیت سلامت (Health Status) و پورت‌ها
docker compose ps

# بررسی لاگ‌های اولیه دیتابیس و اطمینان از ایجاد خودکار دو دیتابیس elevator_db و shopbot_db
docker compose logs postgres

# بررسی اجرای بدون خطای وب‌پورتال و سرویس‌های API
docker compose logs web-portal
docker compose logs core-api
docker compose logs bot-service

# اجرای مایگریشن‌های اولیه در صورت نیاز
docker compose exec core-api alembic upgrade head
docker compose exec bot-service alembic upgrade head
```

### مرحله ۵: پیکربندی وب‌سرور Nginx و صدور گواهی SSL رایگان Let's Encrypt

برای اتصال دامنه رسمی، Nginx را به عنوان Reverse Proxy پیکربندی می‌کنیم:

```bash
# نصب وب‌سرور انجین‌ایکس و ربات صدور گواهی SSL
sudo apt-get install -y nginx certbot python3-certbot-nginx

# ساخت فایل تنظیمات اختصاصی دامنه در انجین‌ایکس
sudo nano /etc/nginx/sites-available/elevator-ecosystem.conf
```

محتوای کانفیگ را مطابق زیر قرار دهید (دامنه `asanro.com` را با دامنه واقعی خود جایگزین کنید):

```nginx
# تعریف بالادستی‌ها (Upstreams)
upstream web_portal_upstream {
    server 127.0.0.1:3000;
    keepalive 32;
}

upstream bot_service_upstream {
    server 127.0.0.1:8000;
    keepalive 32;
}

upstream core_api_upstream {
    server 127.0.0.1:8001;
    keepalive 32;
}

# ۱. وب‌پورتال اصلی مشتریان (asanro.com و www.asanro.com)
server {
    server_name asanro.com www.asanro.com;

    client_max_body_size 64M;

    location / {
        proxy_pass http://web_portal_upstream;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# ۲. وب‌سرویس‌ها و APIهای یکپارچه (api.asanro.com)
server {
    server_name api.asanro.com;

    client_max_body_size 128M;

    # سرویس ربات‌ها و فروشگاه قطعات (/api/v1/)
    location /api/v1/ {
        proxy_pass http://bot_service_upstream;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # وب‌هوک ربات تلگرام و بله (/bot/)
    location /bot/ {
        proxy_pass http://bot_service_upstream;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # هسته عملیات فنی و ERP مهندسی آسانسور (/core/)
    location /core/ {
        proxy_pass http://core_api_upstream/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # پروب‌های بررسی سلامت کانتینرها
    location /health {
        proxy_pass http://bot_service_upstream/health;
    }
}
```

فعال‌سازی کانفیگ و صدور خودکار SSL:

```bash
# ایجاد لینک به پوشه سایت‌های فعال
sudo ln -sf /etc/nginx/sites-available/elevator-ecosystem.conf /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# تست صحت سینتکس انجین‌ایکس
sudo nginx -t

# بارگذاری مجدد سرویس انجین‌ایکس
sudo systemctl reload nginx

# صدور خودکار و نصب گواهینامه‌های SSL توسط Certbot
sudo certbot --nginx -d asanro.com -d www.asanro.com -d api.asanro.com --non-interactive --agree-tos -m admin@asanro.com

# بررسی فعال بودن تایمر تمدید خودکار گواهینامه‌ها
sudo systemctl status certbot.timer
```

---

## ۷. معماری هیبریدی جایگزین: فرانت‌اند روی Vercel و بک‌اند روی سرور VPS

در صورتی که ترجیح می‌دهید پورتال Next.js روی شبکه ابری پرسرعت Vercel Edge مستقر باشد و سرویس‌های بک‌اند روی سرور اختصاصی لینوکس اجرا شوند:

```mermaid
flowchart LR
    USERS["کاربران و مشتریان (مرورگر وب)"] -->|HTTPS| VERCEL["شبکه لبه جهانی Vercel<br/>(apps/web-portal)"]
    TECH["تکنسین‌های فنی (اپلیکیشن موبایل)"] -->|HTTPS| VPS["سرور لینوکس VPS (Ubuntu 24.04)<br/>Nginx + موتور داکر"]
    VERCEL -->|REST API /api/v1| VPS
    VPS --> BOT_API["سرویس ربات و فروشگاه (:8000)"]
    VPS --> CORE_API["هسته عملیات مهندسی (:8001)"]
```

۱. **تنظیمات در داشبورد Vercel:**
   * ریپازیتوری را در Vercel ایمپورت کنید.
   * مسیر ریشه (Root Directory): `apps/web-portal`
   * فریم‌ورک انتخابی: `Next.js`
   * متغیرهای محیطی:
     ```env
     NEXT_PUBLIC_API_URL=https://api.your-domain.com/api/v1
     INTERNAL_API_URL=https://api.your-domain.com
     NODE_ENV=production
     ```

۲. **دستور اجرای سرویس‌های بک‌اند در VPS:**
   اجرای تمام سرویس‌ها به استثنای پورتال وب در کانتینر سرور لینوکس:
   ```bash
   docker compose up -d postgres redis core-api bot-service
   ```

---

## ۸. مایگریشن‌های دیتابیس، Seeding و بکاپ‌گیری خودکار شبانه (Cron Job)

### اجرای دستی مایگریشن‌ها
```bash
# اعمال آخرین مایگریشن‌های اسکیما برای elevator_db
docker compose exec core-api alembic upgrade head

# اعمال آخرین مایگریشن‌های اسکیما برای shopbot_db
docker compose exec bot-service alembic upgrade head
```

### اسکریپت بکاپ‌گیری امن خودکار در هاست سرور
یک اسکریپت امن و زمان‌بندی‌شده روی هاست VPS ایجاد نمایید:

```bash
sudo mkdir -p /opt/scripts /opt/backups
sudo nano /opt/scripts/backup-databases.sh
```

محتوای اسکریپت:
```bash
#!/bin/bash
set -e

BACKUP_DIR="/opt/backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
CONTAINER="elevator_postgres"
DB_USER="postgres"

mkdir -p "$BACKUP_DIR"

# تهیه نسخه پشتیبان فشرده از elevator_db
docker exec "$CONTAINER" pg_dump -U "$DB_USER" elevator_db | gzip > "$BACKUP_DIR/elevator_db_$TIMESTAMP.sql.gz"

# تهیه نسخه پشتیبان فشرده از shopbot_db
docker exec "$CONTAINER" pg_dump -U "$DB_USER" shopbot_db | gzip > "$BACKUP_DIR/shopbot_db_$TIMESTAMP.sql.gz"

# نگهداری بکاپ‌های ۱۴ روز اخیر و حذف خودکار فایل‌های قدیمی‌تر
find "$BACKUP_DIR" -type f -name "*.sql.gz" -mtime +14 -delete

echo "[$TIMESTAMP] Databases backed up successfully to $BACKUP_DIR."
```

اعطای دسترسی اجرایی و تنظیم زمان‌بندی ساعت ۳:۰۰ بامداد در Crontab:
```bash
sudo chmod +x /opt/scripts/backup-databases.sh
(crontab -l 2>/dev/null; echo "0 3 * * * /opt/scripts/backup-databases.sh >> /var/log/db_backup.log 2>&1") | crontab -
```

---

## ۹. استانداردهای امنیتی و ایمن‌سازی سازمانی (Enterprise Security & Hardening)

* **اجرای کانتینرها بدون روت (Unprivileged Execution):** کلیه کانتینرهای سرویس‌ها در بستری با دسترسی غیر از روت اجرا می‌شوند (`nonroot:appgroup` با شناسه کاربری 10001 در پایتون و `nextjs:nodejs` با شناسه 1001 در نود).
* **ایزولاسیون شبکه داخلی (Network Isolation):** ارتباط میان سرویس‌ها، دیتابیس و ردیس از طریق شبکه محلی Bridge داکر (`elevator_network`) صورت می‌گیرد و پورت‌های دیتابیس بر روی شبکه عمومی مسدود می‌باشند.
* **امنیت توکن‌ها و نشست‌ها:** توکن‌های دسترسی کوتاه‌مدت JWT مبتنی بر HMAC SHA-256 همراه با کوکی‌های امن HttpOnly و ضدانتقال CSRF.
* **اعتبارسنجی دوطرفه و بهداشت ورودی‌ها:** بررسی دقیق کلیه ورودی‌ها با Pydantic v2 در لایه بک‌اند و Zod در لایه فرانت‌اند جهت مقابله با SQL Injection و XSS.
* **وایت‌لیستینگ دقیق CORS:** محدودسازی صریح دامنه‌های مجاز در تنظیمات FastAPI و جلوگیری از درخواست‌های بین‌سایتی غیرمجاز.

---

## ۱۰. راهبری فنی و اطلاعات شرکت (Authors & Technical Governance)

* **شرکت متبوع:** شرکت آسانرو اطمینان امیر کرمان (Asanro Etminan Amir Kerman)
* **مدیریت و ریاست مهندسی:** مهندس محبی (Mohebbi) — `09133982695`
* **مرجع رسمی ثبت و نظارت:** مجری رسمی استاندارد و بیمه آسانسور و پله‌برقی در استان کرمان
* **معماری سیستم:** استانداردهای مهندسی مونو‌ریپو سازمانی (استانداردهای مهندسی آسانرو - Asanro Elevator Enterprise Standards)

---

<div align="center">
  <a href="#top">⬆️ بازگشت به ابتدای صفحه</a> &nbsp; | &nbsp; <a href="#english-documentation">🇬🇧 Switch to English Documentation (مطالعه مستندات انگلیسی)</a>
</div>

---
*توسعه‌یافته تحت استانداردهای مهندسی تجاری شرکت آسانرو اطمینان امیر کرمان. تمامی حقوق محفوظ است.*
