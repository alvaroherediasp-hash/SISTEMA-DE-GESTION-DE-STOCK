@echo off
title Mercadito - Cambiar Nombre de Base de Datos
chcp 65001 >nul

echo.
echo  =========================================
echo       CAMBIAR NOMBRE DE BASE DE DATOS
echo  =========================================
echo.
echo  Base de datos actual: mercadito
echo  Base de datos nueva: mercadito2
echo.

set /p CONTINUAR="¿Desea cambiar? (S/N): "
if /i not "%CONTINUAR%"=="S" exit

REM Copiar archivos
echo.
echo  Copiando archivos...
copy /Y ".env" ".env-respaldo" >nul 2>&1
copy /Y ".env-mercadito2" ".env" >nul

echo.
echo  ✓ Archivos actualizados
echo.
echo  Ahora debe:
echo  1. Crear la nueva base de datos en phpMyAdmin
echo     - Importe el archivo: database-mercadito2.sql
echo  2. Reiniciar el servidor
echo.
pause
