# Server Setup Guide

Your GitHub repo `software_frontend` contains both frontend and backend. Here's how to set it up on your server.

## Server Directory Structure (after git pull)

```
/var/www/heliostat/                 # or your preferred path
├── src/                            # Frontend source (React)
├── dist/                           # Built frontend (after npm run build)
├── package.json
├── Heliotat-Segmentation-Project/  # Backend
│   ├── backend.py
│   ├── database.py
│   ├── best.pt
│   ├── mirror_data.json
│   ├── heliotat/
│   └── venv/                       # Python virtual env (created on server)
└── node_modules/                   # (created after npm install)
```

## Initial Server Setup (First Time)

```bash
# 1. Clone the repo
cd /var/www
git clone git@github.com:Yan9U/software_frontend.git heliostat
cd heliostat

# 2. Setup Backend
cd Heliotat-Segmentation-Project
python3 -m venv venv
source venv/bin/activate
pip install flask flask-cors gunicorn pillow numpy ultralytics torch torchvision

# 3. Setup Frontend
cd ..
npm install
npm run build

# 4. Start Backend
cd Heliotat-Segmentation-Project
source venv/bin/activate
nohup gunicorn -w 2 -b 0.0.0.0:5000 backend:app --timeout 120 > backend.log 2>&1 &
```

## Update Server (After Each Change)

After you push changes to GitHub:

```bash
# SSH to your server
ssh user@your-server

# Go to project directory
cd /var/www/heliostat

# Pull latest changes
git pull origin main

# If frontend changed: rebuild
npm run build

# If backend changed: restart
cd Heliotat-Segmentation-Project
source venv/bin/activate
pkill -f "gunicorn.*backend:app"
nohup gunicorn -w 2 -b 0.0.0.0:5000 backend:app --timeout 120 > backend.log 2>&1 &
```

## Nginx Configuration

```nginx
server {
    listen 80;
    server_name your-domain.com;

    # Serve frontend from dist folder
    location / {
        root /var/www/heliostat/dist;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    # Proxy API requests to Flask backend
    location /api {
        proxy_pass http://127.0.0.1:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_read_timeout 300s;
    }
}
```

## Quick Update Script

Create this on your server at `/var/www/heliostat/update.sh`:

```bash
#!/bin/bash
cd /var/www/heliostat

echo "Pulling latest changes..."
git pull origin main

echo "Rebuilding frontend..."
npm run build

echo "Restarting backend..."
cd Heliotat-Segmentation-Project
source venv/bin/activate
pkill -f "gunicorn.*backend:app" || true
nohup gunicorn -w 2 -b 0.0.0.0:5000 backend:app --timeout 120 > backend.log 2>&1 &

echo "Done! Server updated."
```

Then just run `./update.sh` after each `git push`.
