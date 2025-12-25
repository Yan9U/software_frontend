#!/bin/bash
# Deployment script for Heliostat project to Aliyun server
# Usage: ./deploy.sh

SERVER="root@8.163.8.214"
REMOTE_DIR="/var/www/heliostat"

echo "=========================================="
echo "  Heliostat Project Deployment Script"
echo "=========================================="

# Step 1: Upload backend files
echo ""
echo "[1/4] Uploading backend files..."
rsync -avz --progress \
    --exclude '__pycache__' \
    --exclude '*.pyc' \
    --exclude 'venv' \
    ../Heliotat-Segmentation-Project/ \
    $SERVER:$REMOTE_DIR/backend/

# Step 2: Upload frontend build
echo ""
echo "[2/4] Uploading frontend files..."
rsync -avz --progress \
    ../dist/ \
    $SERVER:$REMOTE_DIR/frontend/

# Step 3: Upload config files
echo ""
echo "[3/4] Uploading configuration files..."
scp heliostat.nginx.conf $SERVER:/etc/nginx/sites-available/heliostat
scp heliostat.service $SERVER:/etc/systemd/system/heliostat.service

# Step 4: Remote setup
echo ""
echo "[4/4] Running remote setup..."
ssh $SERVER << 'ENDSSH'
    set -e

    echo "Installing system dependencies..."
    apt-get update
    apt-get install -y python3 python3-pip python3-venv nginx

    echo "Setting up Python virtual environment..."
    cd /var/www/heliostat/backend
    python3 -m venv venv
    source venv/bin/activate
    pip install --upgrade pip
    pip install -r requirements.txt

    echo "Configuring Nginx..."
    ln -sf /etc/nginx/sites-available/heliostat /etc/nginx/sites-enabled/
    rm -f /etc/nginx/sites-enabled/default
    nginx -t

    echo "Starting services..."
    systemctl daemon-reload
    systemctl enable heliostat
    systemctl restart heliostat
    systemctl restart nginx

    echo "Checking service status..."
    systemctl status heliostat --no-pager
ENDSSH

echo ""
echo "=========================================="
echo "  Deployment Complete!"
echo "  Access your app at: http://8.163.8.214"
echo "=========================================="
