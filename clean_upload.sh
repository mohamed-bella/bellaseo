#!/bin/bash

# Configuration
SERVER_IP="77.42.43.52"
DEST_DIR="/root/bellaseo"

echo "🚀 Starting Clean Upload to Hetzner ($SERVER_IP)..."

# 1. Clean Local (Optional but recommended for speed)
echo "🧹 Cleaning local build artifacts..."
rm -rf frontend/.next
rm -rf backend/.baileys_session
rm -rf **/node_modules

# 2. Upload using RSYNC (Recommended for speed and exclusion)
# If you have rsync installed on Windows, this is 100x better.
# If not, we use scp with manual folder selection.

echo "📤 Uploading core application files..."
scp -r ./backend ./frontend ./nginx ./ecosystem.config.js ./package.json root@$SERVER_IP:$DEST_DIR/

echo "✅ Upload Complete!"
echo "Next steps on server:"
echo "1. cd $DEST_DIR"
echo "2. npm install (in root, backend, frontend)"
echo "3. npm run build --prefix frontend"
echo "4. pm2 start ecosystem.config.js"
