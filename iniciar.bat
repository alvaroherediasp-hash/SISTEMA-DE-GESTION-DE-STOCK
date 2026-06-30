@echo off
title Servidor de Imagenes
cd /d "%~dp0"
echo.
echo ========================================
echo   SISTEMA DE GESTION DE STOCK
echo   Iniciando servidor de imagenes...
echo ========================================
echo.
echo Abriendo la aplicacion...
start "" "http://localhost:3001"
start "" "public/index.html"
node image-server.js
pause
