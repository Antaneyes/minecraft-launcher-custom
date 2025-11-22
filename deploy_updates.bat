@echo off
echo Generando manifesto de actualizacion...
node generate_manifest.js

echo.
echo Subiendo archivos a GitHub...
git add .
git commit -m "Update game files %date% %time%"
git push

echo.
echo Hecho! Los usuarios recibiran la actualizacion al abrir el launcher.
pause
