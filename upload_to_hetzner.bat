@echo off
SET SERVER_IP=77.42.43.52
SET DEST_DIR=/root/bellaseo

echo [1/3] Cleaning directory on server...
ssh root@%SERVER_IP% "rm -rf %DEST_DIR%/* && mkdir -p %DEST_DIR%"

echo [2/3] Cleaning local environment for upload...
echo Removing large session files...
if exist "backend\.baileys_session" rd /s /q "backend\.baileys_session"
if exist "backend\node_modules" rd /s /q "backend\node_modules"
if exist "frontend\node_modules" rd /s /q "frontend\node_modules"
if exist "frontend\.next" rd /s /q "frontend\.next"

echo [3/3] Uploading clean code...
scp -r ./backend ./frontend ./nginx ./ecosystem.config.js ./package.json root@%SERVER_IP%:%DEST_DIR%/

echo DONE! Code uploaded to %DEST_DIR%
echo Please run 'npm install' on the server.
pause
