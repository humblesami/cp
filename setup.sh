#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────
# Court Piece — Local Development Setup
# Run this once: bash setup.sh
# ─────────────────────────────────────────────────────────────
set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}=== Court Piece Setup ===${NC}"

# 1. Check prerequisites
echo -e "\n${YELLOW}Checking prerequisites…${NC}"
command -v docker >/dev/null 2>&1 || { echo "Docker not found. Install from https://www.docker.com/get-started"; exit 1; }
command -v docker compose >/dev/null 2>&1 || command -v docker-compose >/dev/null 2>&1 || { echo "Docker Compose not found."; exit 1; }
command -v node >/dev/null 2>&1 || { echo "Node.js not found. Install from https://nodejs.org (v20+)"; exit 1; }
command -v python3 >/dev/null 2>&1 || { echo "Python 3 not found."; exit 1; }
echo "✓ All prerequisites found"

# 2. Create .env if not exists
if [ ! -f .env ]; then
  cp .env.example .env
  echo -e "\n${YELLOW}⚠️  Created .env from .env.example${NC}"
  echo "   Add your Google & Facebook OAuth credentials to .env before running."
  echo "   You can still run without them — social login just won't work."
fi

# 3. Install Node deps (for local dev without Docker)
echo -e "\n${YELLOW}Installing Node.js dependencies…${NC}"
cd backend-node && npm install && cd ..
cd frontend && npm install && cd ..
echo "✓ Node deps installed"

# 4. Python venv for Django (optional local run)
echo -e "\n${YELLOW}Setting up Python virtual environment…${NC}"
cd backend-django
python3 -m venv .venv
source .venv/bin/activate
pip install --quiet -r requirements.txt
deactivate
cd ..
echo "✓ Python deps installed"

# 5. Start infrastructure (Postgres + Redis only) via Docker
echo -e "\n${YELLOW}Starting Postgres and Redis…${NC}"
docker compose up -d postgres redis
sleep 3

# 6. Run Django migrations
echo -e "\n${YELLOW}Running Django migrations…${NC}"
cd backend-django
source .venv/bin/activate
export DATABASE_URL=postgres://courtpiece:courtpiece_dev@localhost:5432/courtpiece
export SECRET_KEY=dev-secret-key
python manage.py migrate
python manage.py createsuperuser --no-input --username admin --email admin@local.dev 2>/dev/null || true
deactivate
cd ..
echo "✓ Migrations done (admin user: admin / changeme)"

echo -e "\n${GREEN}=== Setup Complete! ===${NC}"
echo ""
echo "To start the full stack:"
echo "  docker compose up          (all services via Docker)"
echo ""
echo "Or run each service manually:"
echo "  Terminal 1: cd backend-django && source .venv/bin/activate && python manage.py runserver"
echo "  Terminal 2: cd backend-node  && npm run dev"
echo "  Terminal 3: cd frontend      && npm run dev"
echo ""
echo "URLs:"
echo "  Frontend:     http://localhost:3000"
echo "  Node API:     http://localhost:3001"
echo "  Django API:   http://localhost:8000"
echo "  Django Admin: http://localhost:8000/admin  (admin / changeme)"
echo ""
