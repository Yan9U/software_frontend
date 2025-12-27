#!/bin/bash
# ONE-TIME server setup script
# Run this ONCE on a fresh server to set up the environment
# Usage: ssh root@your-server 'bash -s' < server-setup.sh

set -e

echo "=========================================="
echo "  Heliostat Server Setup (One-Time)"
echo "=========================================="

# Create directories
echo "[1/6] Creating directories..."
mkdir -p /var/www/heliostat/backend
mkdir -p /var/www/heliostat/frontend

# Install system dependencies
echo "[2/6] Installing system dependencies..."
apt-get update
apt-get install -y python3 python3-venv python3-pip nginx mysql-server

# Create Python virtual environment
echo "[3/6] Setting up Python environment..."
cd /var/www/heliostat/backend
python3 -m venv venv
source venv/bin/activate

# Install Python packages (CPU-only torch for low-memory servers)
pip install --upgrade pip
pip install flask flask-cors gunicorn pillow numpy werkzeug mysql-connector-python
pip install torch torchvision --index-url https://download.pytorch.org/whl/cpu
pip install ultralytics

# Setup MySQL database
echo "[4/6] Setting up MySQL..."
echo "Please set MySQL root password when prompted..."
mysql_secure_installation || true

# Create database
mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS solar_heliostat CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;"

echo ""
echo "If you have a SQL dump file, import it with:"
echo "  mysql -u root -p solar_heliostat < /path/to/Dump20251227.sql"

# Setup systemd service
echo "[5/6] Setting up systemd service..."
cat > /etc/systemd/system/heliostat.service << 'EOF'
[Unit]
Description=Heliostat Flask Backend
After=network.target mysql.service

[Service]
User=root
WorkingDirectory=/var/www/heliostat/backend
Environment="PATH=/var/www/heliostat/backend/venv/bin"
ExecStart=/var/www/heliostat/backend/venv/bin/gunicorn -w 2 -b 127.0.0.1:5000 --timeout 300 backend:app
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable heliostat

# Setup nginx
echo "[6/6] Setting up nginx..."
cat > /etc/nginx/sites-available/heliostat << 'EOF'
server {
    listen 80;
    server_name _;

    location / {
        root /var/www/heliostat/frontend;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:5000/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_connect_timeout 60s;
        proxy_read_timeout 300s;
        client_max_body_size 100M;
    }
}
EOF

ln -sf /etc/nginx/sites-available/heliostat /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl reload nginx

echo ""
echo "=========================================="
echo "  Server Setup Complete!"
echo "=========================================="
echo ""
echo "Next steps:"
echo "1. Create .env file: nano /var/www/heliostat/backend/.env"
echo "   Add: MYSQL_PASSWORD=your_password"
echo ""
echo "2. Import SQL dump (if you have one):"
echo "   mysql -u root -p solar_heliostat < Dump20251227.sql"
echo ""
echo "3. Run deploy.sh from your local machine to upload code"
echo ""
