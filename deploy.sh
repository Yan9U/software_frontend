#!/bin/bash
# One-command deployment script for Heliostat project
# Usage: ./deploy.sh

set -e

# Configuration - CHANGE THESE
SERVER_USER="root"
SERVER_IP="8.163.8.214"
SERVER_PATH="/var/www/heliostat"

# Local paths
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$PROJECT_DIR/Heliotat-Segmentation-Project"

echo "=========================================="
echo "  Heliostat Deployment Script"
echo "=========================================="

# Step 1: Build frontend
echo ""
echo "[1/4] Building frontend..."
cd "$PROJECT_DIR"
npm run build

# Step 2: Upload frontend
echo ""
echo "[2/4] Uploading frontend..."
rsync -avz --delete "$PROJECT_DIR/dist/" "$SERVER_USER@$SERVER_IP:$SERVER_PATH/frontend/"

# Step 3: Upload backend (only necessary files)
echo ""
echo "[3/4] Uploading backend..."
rsync -avz \
    --exclude='__pycache__' \
    --exclude='*.pyc' \
    --exclude='classification_results.db' \
    --exclude='venv' \
    --exclude='.env' \
    "$BACKEND_DIR/backend.py" \
    "$BACKEND_DIR/database.py" \
    "$BACKEND_DIR/mysql_database.py" \
    "$BACKEND_DIR/mirror_data.json" \
    "$BACKEND_DIR/requirements.txt" \
    "$BACKEND_DIR/.env.example" \
    "$SERVER_USER@$SERVER_IP:$SERVER_PATH/backend/"

# Upload best.pt only if it doesn't exist on server (it's large)
echo "Checking if best.pt needs upload..."
ssh "$SERVER_USER@$SERVER_IP" "test -f $SERVER_PATH/backend/best.pt" || \
    rsync -avz "$BACKEND_DIR/best.pt" "$SERVER_USER@$SERVER_IP:$SERVER_PATH/backend/"

# Step 4: Restart backend service
echo ""
echo "[4/4] Restarting backend service..."
ssh "$SERVER_USER@$SERVER_IP" "systemctl restart heliostat"

# Check status
echo ""
echo "=========================================="
echo "  Deployment Complete!"
echo "=========================================="
echo ""
echo "Checking service status..."
ssh "$SERVER_USER@$SERVER_IP" "systemctl status heliostat --no-pager -l | head -15"

echo ""
echo "Testing API..."
sleep 2
ssh "$SERVER_USER@$SERVER_IP" "curl -s http://localhost:5000/api/health | head -1"

echo ""
echo "Your site is live at: http://$SERVER_IP"
