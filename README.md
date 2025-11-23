# OmbiCraft Launcher

Un launcher personalizado para servidores de Minecraft con actualizaciones automáticas, soporte para cuentas autenticas y gestión de mods.

## Características
- 🔄 **Auto-actualización de Mods/Configs**: Sincroniza automáticamente los archivos del cliente con tu servidor.
- 🚀 **Auto-actualización del Launcher**: Se actualiza a sí mismo usando GitHub Releases.
- 🔑 **Login de Microsoft**: Soporte nativo para cuentas autenticas.
- ⚙️ **Configuración**: Selector de RAM y opciones de lanzamiento.
- 🛠️ **Modo Desarrollador**: Logs detallados y herramientas de depuración.

## Instalación (Desarrollo)

1.  Clonar el repositorio.
2.  Instalar dependencias:
    ```bash
    npm install
    ```
3.  Iniciar en modo desarrollo:
    ```bash
    npm start
    ```

## Crear una Nueva Versión (Release)

Este proyecto incluye un script de automatización para facilitar el despliegue.

1.  Asegúrate de tener **GitHub CLI (`gh`)** instalado y autenticado.
2.  Coloca los mods/configs actualizados en la carpeta `update_files`.
3.  Ejecuta el script de release:
    ```bash
    node release.js
    ```

Este script automáticamente:
- Sube la versión en `package.json` y `package-lock.json`.
- Regenera el `manifest.json` basado en la carpeta `update_files`.
- Compila el instalador (`.exe`).
- Sube los cambios a GitHub.
- Crea una **Release** en GitHub con todos los archivos necesarios (`.exe`, `latest.yml`, etc.).

## Estructura del Proyecto
- `index.js`: Proceso principal de Electron.
- `ui/`: Interfaz de usuario (HTML/CSS/JS).
- `utils/`: Lógica de actualización, lanzamiento y autenticación.
- `launcher_builder_config.json`: Configuración centralizada de versiones y repositorio.
- `update_files/`: Carpeta fuente para generar el manifiesto de mods.
- `dist/`: Carpeta de salida de la compilación.
- `logs/`: Logs de la aplicación (en modo dev).
