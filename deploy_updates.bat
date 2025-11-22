@echo off
setlocal enabledelayedexpansion

echo Generando manifesto de actualizacion...
node generate_manifest.js > temp_manifest_output.txt
type temp_manifest_output.txt

REM Extract LAUNCHER_VERSION using findstr
set "LAUNCHER_VERSION="
for /f "tokens=2 delims==" %%a in ('findstr "LAUNCHER_VERSION=" temp_manifest_output.txt') do set LAUNCHER_VERSION=%%a

del temp_manifest_output.txt

if "%LAUNCHER_VERSION%"=="" (
    echo ERROR: No se pudo detectar la version del launcher.
    echo Asegurate de que generate_manifest.js imprime 'LAUNCHER_VERSION=x.y.z'
    pause
    exit /b 1
)

echo.
echo Version del Launcher detectada: !LAUNCHER_VERSION!
echo.

echo Subiendo archivos a GitHub...
git add .
git commit -m "Update game files and launcher v!LAUNCHER_VERSION%"
git push

echo.
echo Creando Release en GitHub v!LAUNCHER_VERSION!...
"C:\Program Files\GitHub CLI\gh.exe" release create "v!LAUNCHER_VERSION!" "OmbiCraft-Launcher-Setup.exe" --title "OmbiCraft Launcher v!LAUNCHER_VERSION!" --notes "Actualizacion automatica del launcher."

echo.
echo Hecho! La release v!LAUNCHER_VERSION! ha sido publicada.
pause
