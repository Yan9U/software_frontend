# Heliostat Detection System - Deployment Guide

## Project Structure

```
deploy/
├── backend/                 # Flask API Server
│   ├── backend.py          # Main Flask application
│   ├── database.py         # SQLite database helper
│   ├── mysql_database.py   # MySQL database connector
│   ├── best.pt             # YOLO model weights
│   ├── mirror_data.json    # Mirror field data (14,500 records)
│   ├── requirements.txt    # Python dependencies
│   ├── .env.example        # Environment variables template
│   └── heliotat/           # Training images folder
│       └── images/
│           └── train/      # Sample images
│
└── frontend/               # Built React Application
    ├── index.html          # Entry point
    └── assets/             # JS/CSS bundles
```

## Server Requirements

- Python 3.8+
- MySQL 8.0+ (optional, for full data)
- Node.js 18+ (only if rebuilding frontend)
- Nginx (for serving frontend)
- 4GB+ RAM (for YOLO model)

## Deployment Steps

### 1. Upload Files to Server

```bash
# Using scp (replace with your server details)
scp -r deploy/* user@your-server:/path/to/project/
```

### 2. Setup MySQL Database (Optional but Recommended)

```bash
# Login to MySQL
mysql -u root -p

# Create database
CREATE DATABASE solar_heliostat CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;

# Import the dump file
mysql -u root -p solar_heliostat < /path/to/Dump20251227.sql

# Verify import
mysql -u root -p -e "USE solar_heliostat; SHOW TABLES;"
```

Expected tables:
- `flight_records` - 20 drone flight records
- `heliostat_info` - 14,500+ mirror positions
- `inspection_records` - 400+ inspection records
- `logs` - System logs
- `personnel` - User accounts

### 3. Setup Backend

```bash
# SSH into your server
ssh user@your-server

# Navigate to backend folder
cd /path/to/project/backend

# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Configure MySQL connection (copy and edit .env)
cp .env.example .env
nano .env  # Edit with your MySQL credentials

# Test run (Ctrl+C to stop)
python backend.py
```

If MySQL is configured correctly, you'll see:
```
✓ MySQL connected: 8.0.x
```

### 4. Run Backend with Gunicorn (Production)

```bash
# Run with gunicorn
gunicorn -w 2 -b 0.0.0.0:5000 backend:app --timeout 120

# Or run in background with nohup
nohup gunicorn -w 2 -b 0.0.0.0:5000 backend:app --timeout 120 > backend.log 2>&1 &
```

### 5. Setup Nginx for Frontend

Create nginx config `/etc/nginx/sites-available/heliostat`:

```nginx
server {
    listen 80;
    server_name your-domain.com;  # or your IP

    # Frontend
    location / {
        root /path/to/project/frontend;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    # Backend API proxy
    location /api {
        proxy_pass http://127.0.0.1:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_read_timeout 300s;
    }
}
```

Enable the site:

```bash
sudo ln -s /etc/nginx/sites-available/heliostat /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 6. Create Systemd Service (Optional)

Create `/etc/systemd/system/heliostat-backend.service`:

```ini
[Unit]
Description=Heliostat Backend API
After=network.target

[Service]
User=www-data
WorkingDirectory=/path/to/project/backend
Environment="PATH=/path/to/project/backend/venv/bin"
ExecStart=/path/to/project/backend/venv/bin/gunicorn -w 2 -b 127.0.0.1:5000 backend:app --timeout 120
Restart=always

[Install]
WantedBy=multi-user.target
```

Enable and start:

```bash
sudo systemctl daemon-reload
sudo systemctl enable heliostat-backend
sudo systemctl start heliostat-backend
sudo systemctl status heliostat-backend
```

## API Endpoints

### Core APIs
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/health` | GET | Health check |
| `/api/db/status` | GET | Check MySQL connection status |
| `/api/classify` | POST | Upload image for YOLO detection |
| `/api/history` | GET | Get detection history |

### MySQL-based APIs (require database)
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/heliostats` | GET | Get all heliostat data |
| `/api/heliostats/zone/<zone>` | GET | Get heliostats by zone (B/C) |
| `/api/flights` | GET | Get flight records |
| `/api/flights/<id>` | GET | Get flight detail with inspections |
| `/api/inspections` | GET | Get inspection records |
| `/api/inspections/heliostat/<id>` | GET | Get inspection history for a mirror |
| `/api/logs` | GET | Get system logs |
| `/api/auth/login` | POST | User authentication |
| `/api/users` | GET | Get all users |

### Dashboard APIs (MySQL with fallback)
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/dashboard/stats` | GET | Dashboard statistics |
| `/api/zones/stats` | GET | Zone statistics with cleanliness |
| `/api/mirror-field/data` | GET | Get all 14,500 mirror records |
| `/api/mirror-field/zones` | GET | Get zone statistics |

## Troubleshooting

### Backend not starting
```bash
# Check logs
tail -f backend.log
# Or if using systemd
sudo journalctl -u heliostat-backend -f
```

### MySQL connection issues
```bash
# Check if MySQL is running
sudo systemctl status mysql

# Test connection
mysql -u root -p -e "SELECT 1"

# Check backend MySQL status
curl http://localhost:5000/api/db/status
```

If you see `MySQL connector not installed`, run:
```bash
pip install mysql-connector-python
```

### CORS errors
Make sure the frontend is served from the same domain or update CORS settings in `backend.py`.

### Model loading issues
Ensure `best.pt` is in the same directory as `backend.py` and has correct permissions.

### Mirror data not loading
Ensure `mirror_data.json` is in the backend directory and is valid JSON.

## Database Schema

The MySQL database `solar_heliostat` contains:

| Table | Description | Records |
|-------|-------------|---------|
| `heliostat_info` | Mirror positions (定日镜序号, 坐标, 区号) | 14,500+ |
| `flight_records` | Drone flight logs | 20 |
| `inspection_records` | Cleanliness inspection data | 400+ |
| `logs` | System operation logs | 10 |
| `personnel` | User accounts with roles | 10 |
