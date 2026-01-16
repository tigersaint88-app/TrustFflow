@echo off
chcp 65001 >nul
title Frontend Server
echo ========================================
echo 启动前端服务器 (UTF-8)
echo ========================================
echo.
node scripts/serveFrontend.js
pause

