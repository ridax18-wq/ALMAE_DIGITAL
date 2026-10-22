@echo off
rem Detiene SOLO el servidor de ALMAE (3000 o 3001), tras confirmar.
title Detener ALMAE Digital
setlocal EnableDelayedExpansion

set PID_ALMAE=
set PUERTO_ALMAE=
for %%P in (3000 3001) do (
  if not defined PID_ALMAE call :buscar_almae %%P
)

if not defined PID_ALMAE (
  echo No hay ningun servidor de ALMAE activo en 3000 ni 3001.
  echo Si la ventana del servidor sigue abierta, cierrala con Ctrl+C.
  pause
  exit /b 0
)

echo Servidor de ALMAE encontrado en el puerto !PUERTO_ALMAE! (PID !PID_ALMAE!).
set /p CONFIRMAR="Detenerlo? (S/N): "
if /i not "!CONFIRMAR!"=="S" (
  echo Operacion cancelada.
  pause
  exit /b 0
)

taskkill /PID !PID_ALMAE! /T /F >nul 2>&1
if errorlevel 1 (
  echo [ERROR] No se pudo detener el proceso !PID_ALMAE!.
) else (
  echo Servidor de ALMAE detenido.
)
pause
exit /b 0

rem Solo toma el PID si el puerto responde con la web de ALMAE y el proceso es node.exe
:buscar_almae
set PID_TMP=
for /f "tokens=5" %%p in ('netstat -ano ^| findstr /R /C:":%1 .*LISTENING"') do set PID_TMP=%%p
if not defined PID_TMP exit /b 0
powershell -NoProfile -Command "try { $r = Invoke-WebRequest -Uri 'http://localhost:%1' -UseBasicParsing -TimeoutSec 3; if ($r.Content -match 'ALMAE') { exit 0 } else { exit 1 } } catch { exit 1 }"
if errorlevel 1 exit /b 0
for /f %%n in ('powershell -NoProfile -Command "(Get-Process -Id %PID_TMP% -ErrorAction SilentlyContinue).ProcessName"') do set NOMBRE_PROC=%%n
if /i not "!NOMBRE_PROC!"=="node" exit /b 0
set PID_ALMAE=%PID_TMP%
set PUERTO_ALMAE=%1
exit /b 0
