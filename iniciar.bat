@echo off
title Servidor de Imagenes
cd /d "%~dp0"
echo.
echo ========================================
echo   SISTEMA DE GESTION DE STOCK
echo ========================================
echo.
echo Abriendo la aplicacion...
start "" "index.html"
node image-server.js
pause
