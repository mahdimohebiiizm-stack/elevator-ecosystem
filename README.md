# Asanro Elevator Enterprise Ecosystem (Monorepo)

Commercial-grade, highly scalable enterprise platform for "Asanro Etminan Amir Kerman" (Elevator Engineering Firm).

## Architecture Layout

```
Elevator_Ecosystem/
├── apps/
│   ├── web-portal/         # Next.js 14 App Router (Customer Web Portal & Admin ERP)
│   └── mobile-app/         # Flutter Cross-platform App (Technicians & Building Managers)
├── services/
│   ├── core-api/           # FastAPI Operational ERP, Building, Elevator & Telemetry Engine
│   └── bot-service/        # FastAPI Customer Bot (Telegram/Bale), FSM & Notifications
├── shared/
│   ├── protos/             # Protocol Buffers / gRPC Service Contracts
│   └── docs/               # System Architecture and Operational Documentation
├── storage/
│   └── uploads/            # Centralized Persistent Media Storage
└── infra/
    ├── docker/             # Docker Compose & Container Configurations
    └── scripts/            # Management & Maintenance Scripts
```

## Quick Start

### 1. Core API (Operational ERP)
```bash
cd services/core-api
pip install -r requirements.txt
python main.py
```

### 2. Bot & Customer Service
```bash
cd services/bot-service
pip install -r requirements.txt
python main.py
```

### 3. Web Portal & Admin Dashboard
```bash
cd apps/web-portal
npm install
npm run dev
```

### 4. Mobile App (Flutter)
```bash
cd apps/mobile-app
flutter pub get
flutter run
```
