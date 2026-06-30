@echo off
title Mercadito - Detener Servidor

echo.
echo  ╔══════════════════════════════════════╗
echo  ║     DETENER SERVIDOR              ║
echo  ╚══════════════════════════════════════╝
echo.

taskkill /F /IM node.exe >nul 2>&1

echo El servidor se ha detenido.
echo.
pause
