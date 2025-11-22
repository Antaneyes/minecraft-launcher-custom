@echo off
setlocal enabledelayedexpansion

echo Generando manifesto de actualizacion...
for /f "delims=" %%i in ('node generate_manifest.js') do (
    echo %%i
    set "line=%%i"
    if "!line:~0,17!"=="LAUNCHER_VERSION=" (
        set "LAUNCHER_VERSION=!line:~17!"
    )
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
