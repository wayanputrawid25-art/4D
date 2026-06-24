# ForexOS - Personal Forex Trading Operating System

> A comprehensive, free, and open-source trading operating system for retail forex traders.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue)](https://www.typescriptlang.org/)
[![Python](https://img.shields.io/badge/Python-3.11+-green)](https://www.python.org/)
[![Next.js](https://img.shields.io/badge/Next.js-14-black)](https://nextjs.org/)

## 🎯 Overview

ForexOS is a modular, production-ready trading platform built with:

- **Frontend**: Next.js 14 with TypeScript
- **Backend**: Node.js with TypeScript
- **Database**: Neon PostgreSQL (Serverless)
- **Robot**: Python for MT5 integration
- **Deployment**: Vercel

## ✨ Key Features

### Trading
- Market, Limit, and Stop orders
- Real-time position tracking
- One-click trading
- Order templates

### Analytics
- Performance metrics (Win Rate, Profit Factor, Sharpe Ratio)
- Equity curve visualization
- Drawdown analysis
- Trade distribution charts

### Pattern Detection
- Candlestick patterns (50+ patterns)
- Chart patterns (Head & Shoulders, Triangles, etc.)
- Signal generation with confidence scoring

### Backtesting
- Historical data testing
- Strategy optimization
- Walk-forward analysis
- Monte Carlo simulation

### Risk Management
- Position sizing calculator
- Daily loss limits
- Drawdown protection
- Margin monitoring

## 📁 Project Structure

```
forexos/
├── apps/
│   ├── web/         # Next.js frontend
│   └── api/         # Node.js backend
├── packages/
│   ├── ui/          # Shared UI components
│   ├── database/    # Database schema
│   └── types/       # Shared types
├── robot/           # Python MT5 robot
└── docs/            # Documentation
```

## 🚀 Quick Start

### Prerequisites

- Node.js 20+
- npm 10+
- Python 3.11+
- Docker & Docker Compose (optional)
- PostgreSQL (Neon) account
- MT5 Trading Account

### Installation

```bash
# Clone the repository
git clone https://github.com/your-username/forexos.git
cd forexos

# Install all dependencies (monorepo)
npm install

# Copy environment files
cp apps/web/.env.example apps/web/.env.local
cp apps/api/.env.example apps/api/.env.local

# Edit .env.local files with your credentials

# Start development with Docker (recommended)
docker-compose up -d

# Or start manually:
# Terminal 1: Start web app
npm run dev --filter=@forexos/web

# Terminal 2: Start API
npm run dev --filter=@forexos/api
```

### Robot Setup

```bash
cd robot

# Install dependencies (Poetry)
poetry install

# Configure MT5 credentials
cp .env.example .env

# Run robot
poetry run python -m src.main
```

### Using Docker

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

## 📚 Documentation

All documentation is in the `/docs` directory:

| Document | Description |
|----------|-------------|
| [Architecture.md](./docs/Architecture.md) | System architecture and design decisions |
| [ProductRequirements.md](./docs/ProductRequirements.md) | Feature specifications |
| [Roadmap.md](./docs/Roadmap.md) | Development roadmap |
| [DatabaseDesign.md](./docs/DatabaseDesign.md) | Database schema and design |
| [ApiDesign.md](./docs/ApiDesign.md) | API endpoints and formats |
| [TradingEngine.md](./docs/TradingEngine.md) | Order execution and position management |
| [BacktestEngine.md](./docs/BacktestEngine.md) | Historical strategy testing |
| [PatternDetection.md](./docs/PatternDetection.md) | Pattern recognition system |
| [RiskManagement.md](./docs/RiskManagement.md) | Risk controls and limits |
| [MoneyManagement.md](./docs/MoneyManagement.md) | Position sizing and growth |
| [Security.md](./docs/Security.md) | Security measures |
| [Deployment.md](./docs/Deployment.md) | Deployment procedures |
| [CodingStandards.md](./docs/CodingStandards.md) | Code style guidelines |
| [TestingStrategy.md](./docs/TestingStrategy.md) | Testing approach |
| [FolderStructure.md](./docs/FolderStructure.md) | Directory organization |
| [RepositoryGuidelines.md](./docs/RepositoryGuidelines.md) | Contribution guidelines |

## 🛠️ Tech Stack

### Frontend
- Next.js 14 (App Router)
- React 18
- TypeScript 5
- Tailwind CSS
- shadcn/ui
- Zustand (State Management)
- TanStack Query (Data Fetching)
- Recharts (Charts)

### Backend
- Node.js
- Express
- TypeScript
- Prisma/Drizzle ORM
- JWT (Authentication)
- Zod (Validation)

### Database
- Neon PostgreSQL
- Connection Pooling
- Point-in-time Recovery

### Robot
- Python 3.11+
- MetaTrader5 Python API
- NumPy/Pandas
- scikit-learn (ML patterns)

## 🔒 Security

- AES-256 encryption for sensitive data
- Argon2 password hashing
- JWT with refresh token rotation
- Rate limiting on all endpoints
- Input validation with Zod
- Security headers (CSP, HSTS, etc.)
- Audit logging

## 📊 Monitoring

- Sentry for error tracking
- Vercel Analytics
- Database query monitoring
- Custom logging

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat(scope): add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

Please read [RepositoryGuidelines.md](./docs/RepositoryGuidelines.md) before contributing.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## ⚠️ Disclaimer

**Trading forex carries a high level of risk and may not be suitable for all investors.** The high degree of leverage can work against you as well as for you.

- This software is for educational purposes only
- Past performance is not indicative of future results
- Only trade with money you can afford to lose
- Always use proper risk management

The developers of this software assume no responsibility for trading losses incurred through the use of this software.

## 🙏 Acknowledgments

- MetaTrader 5 by MetaQuotes
- Neon PostgreSQL
- Vercel
- All open-source contributors

---

**Built with ❤️ for the trading community**
