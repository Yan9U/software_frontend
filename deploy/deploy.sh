#!/bin/bash
# Heliostat Detection System - Quick Deploy Script
# Run this script on your server after uploading the files

set -e

echo "=== Heliostat Detection System Deployment ==="

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$SCRIPT_DIR/backend"
FRONTEND_DIR="$SCRIPT_DIR/frontend"

echo ""
echo "1. Setting up Python virtual environment..."
cd "$BACKEND_DIR"
python3 -m venv venv
source venv/bin/activate

echo ""
echo "2. Installing Python dependencies..."
pip install --upgrade pip
pip install -r requirements.txt

echo ""
echo "3. Testing backend..."
python -c "from backend import app; print('Backend loaded successfully!')"

echo ""
echo "4. Starting backend server..."
echo "   Backend will run on http://0.0.0.0:5000"
echo ""
echo "   To run in background:"
echo "   nohup gunicorn -w 2 -b 0.0.0.0:5000 backend:app --timeout 120 > backend.log 2>&1 &"
echo ""
echo "   For development/testing:"
echo "   python backend.py"
echo ""
echo "5. Frontend files are in: $FRONTEND_DIR"
echo "   Configure your web server (nginx/apache) to serve from this directory"
echo ""
echo "=== Deployment preparation complete! ==="
