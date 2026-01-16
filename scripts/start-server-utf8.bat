@echo off
chcp 65001 >nul
title Backend API Server
echo ========================================
echo 启动后端服务器 (UTF-8)
echo ========================================
echo.
node backend/api/server.js
pause

