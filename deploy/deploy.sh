#!/bin/bash
# ==============================================================
# 1-Click Deployment Script for Event Platform VPS
# Usage: ./deploy/deploy.sh
# ==============================================================

set -e

echo "🚀 [1/5] Pulling latest changes from Git..."
git pull origin main || git pull origin dev

echo "📦 [2/5] Building and updating production containers..."
docker compose -f docker-compose.prod.yml build

echo "🔄 [3/5] Starting containers in background..."
docker compose -f docker-compose.prod.yml up -d

echo "🗄️ [4/5] Running database migrations..."
docker compose -f docker-compose.prod.yml exec backend python manage.py migrate --noinput

echo "🧹 [5/5] Collecting static assets..."
docker compose -f docker-compose.prod.yml exec backend python manage.py collectstatic --noinput || true

echo "✅ Deployment completed successfully!"
docker compose -f docker-compose.prod.yml ps

