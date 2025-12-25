# Manual Deployment Guide for 8.163.8.214

## Step 1: Upload Files to Server

Run these commands from your local machine (in the project root directory):

```bash
# Create directory on server
ssh root@8.163.8.214 "mkdir -p /var/www/heliostat/{backend,frontend}"

# Upload backend
scp -r Heliotat-Segmentation-Project/* root@8.163.8.214:/var/www/heliostat/backend/

# Upload frontend (already built)
scp -r dist/* root@8.163.8.214:/var/www/heliostat/frontend/

# Upload config files
scp deploy/heliostat.nginx.conf root@8.163.8.214:/etc/nginx/sites-available/heliostat
scp deploy/heliostat.service root@8.163.8.214:/etc/systemd/system/heliostat.service
```

## Step 2: SSH into Server and Setup

```bash
ssh root@8.163.8.214
```

## Step 3: Install Dependencies (on server)

```bash
apt-get update
apt-get install -y python3 python3-pip python3-venv nginx
```

## Step 4: Setup Python Environment (on server)

```bash
cd /var/www/heliostat/backend
python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
```

## Step 5: Configure Nginx (on server)

```bash
ln -sf /etc/nginx/sites-available/heliostat /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t
```

## Step 6: Start Services (on server)

```bash
systemctl daemon-reload
systemctl enable heliostat
systemctl start heliostat
systemctl restart nginx
```

## Step 7: Check Status (on server)

```bash
# Check backend service
systemctl status heliostat

# Check nginx
systemctl status nginx

# Check if ports are listening
ss -tlnp | grep -E '(80|5000)'
```

## Troubleshooting

### View backend logs
```bash
journalctl -u heliostat -f
```

### View nginx logs
```bash
tail -f /var/log/nginx/error.log
```

### Restart services
```bash
systemctl restart heliostat
systemctl restart nginx
```

### Test backend directly
```bash
curl http://127.0.0.1:5000/
```

## Access Your App

Open browser: http://8.163.8.214
