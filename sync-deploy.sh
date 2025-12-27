#!/bin/bash
# Sync project files to deploy folder
# Run this before uploading to server

set -e
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEPLOY_DIR="$PROJECT_DIR/deploy"

echo "=== Syncing to deploy folder ==="

# Build frontend
echo "1. Building frontend..."
cd "$PROJECT_DIR"
npm run build

# Sync frontend
echo "2. Syncing frontend..."
rm -rf "$DEPLOY_DIR/frontend"/*
cp -r "$PROJECT_DIR/dist/"* "$DEPLOY_DIR/frontend/"

# Sync backend
echo "3. Syncing backend..."
cp "$PROJECT_DIR/Heliotat-Segmentation-Project/backend.py" "$DEPLOY_DIR/backend/"
cp "$PROJECT_DIR/Heliotat-Segmentation-Project/database.py" "$DEPLOY_DIR/backend/"
cp "$PROJECT_DIR/Heliotat-Segmentation-Project/mirror_data.json" "$DEPLOY_DIR/backend/"
cp "$PROJECT_DIR/Heliotat-Segmentation-Project/best.pt" "$DEPLOY_DIR/backend/" 2>/dev/null || true

echo ""
echo "=== Done! Deploy folder is ready ==="
echo "Upload with: scp -r $DEPLOY_DIR/* user@server:/path/to/project/"
