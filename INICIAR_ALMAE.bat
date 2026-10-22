@echo off
rem Lanzador oficial del miniportal ALMAE (Windows). Usa 3000 o 3001.
title ALMAE Digital - Iniciando
setlocal EnableDelayedExpansion
cd /d "%~dp0"

echo ==================================================
echo   ALMAE DIGITAL - Iniciando servidor local
echo ==================================================

where node >nul 2>&1
if errorlevel 1 (
  echo [ERROR] Node.js no esta instalado o no esta en el PATH.
  echo Instalalo desde https://nodejs.org - version LTS.
  pause
  exit /b 1
)

if not exist "%~dp0node_modules" (
  echo Instalando dependencias...
  call npm install
  if errorlevel 1 (
    echo [ERROR] npm install fallo.
    pause
    exit /b 1
  )
)

set PUERTO=
call :es_almae 3000
if !ERRORLEVEL! EQU 0 set PUERTO=3000
if not defined PUERTO (
  call :es_almae 3001
  if !ERRORLEVEL! EQU 0 set PUERTO=3001
)
if defined PUERTO (
  echo ALMAE ya esta activo en http://localhost:!PUERTO!
  start "" http://localhost:!PUERTO!
  pause
  exit /b 0
)

set PUERTO=
call :puerto_ocupado 3000
if !ERRORLEVEL! EQU 0 (
  set PUERTO=3000
) else (
  call :puerto_ocupado 3001
  if !ERRORLEVEL! EQU 0 set PUERTO=3001
)
if not defined PUERTO (
  echo [ERROR] Los puertos 3000 y 3001 estan ocupados por otros programas.
  echo Cierra uno de ellos y vuelve a intentar.
  pause
  exit /b 1
)

echo Puerto elegido: !PUERTO!
echo Iniciando servidor (puede tardar 30-60 s)...
start "ALMAE Digital - Servidor" cmd /k "npx next dev -p !PUERTO!"

set /a intentos=0
:esperar
timeout /t 3 /nobreak >nul
set /a intentos+=1
call :es_almae !PUERTO!
if !ERRORLEVEL! EQU 0 goto listo
if !intentos! GEQ 40 (
  echo [ERROR] El servidor no respondio en 120 segundos.
  echo Revisa la ventana "ALMAE Digital - Servidor" para ver el error.
  pause
  exit /b 1
)
goto esperar

:listo
echo.
echo ==================================================
echo   LISTO. ALMAE DIGITAL en: http://localhost:!PUERTO!
echo   Administrador:           http://localhost:!PUERTO!/admin/login
echo   Para detener: DETENER_ALMAE.bat
echo ==================================================
start "" http://localhost:!PUERTO!
pause
exit /b 0

rem Sale con 0 si el puerto responde con la web de ALMAE
:es_almae
powershell -NoProfile -Command "try { $r = Invoke-WebRequest -Uri 'http://localhost:%~1' -UseBasicParsing -TimeoutSec 3; if ($r.Content -match 'ALMAE') { exit 0 } else { exit 1 } } catch { exit 1 }"
exit /b !ERRORLEVEL!

rem Sale con 0 si el puerto ya tiene un proceso escuchando
:puerto_ocupado
netstat -ano | findstr /R /C:":%~1 .*LISTENING" >nul
if !ERRORLEVEL! EQU 0 (exit /b 1) else (exit /b 0)
