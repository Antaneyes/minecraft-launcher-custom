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

## Publicar Actualizaciones

### Actualizar Contenido (Mods/Configs)
Para actualizar los archivos del juego sin cambiar la versión del launcher:
```bash
node update_server.js
```

### Actualizar el Launcher (Nueva Versión)
Para lanzar una nueva versión del ejecutable (`.exe`):
```bash
node release.js
```
Este script automatiza el versionado, compilación y creación de la Release en GitHub.

## Estructura del Proyecto
- `index.js`: Proceso principal de Electron.
- `ui/`: Interfaz de usuario (HTML/CSS/JS).
- `utils/`: Lógica de actualización, lanzamiento y autenticación.
- `launcher_builder_config.json`: Configuración centralizada de versiones y repositorio.
- `update_files/`: Carpeta fuente para generar el manifiesto de mods.
- `dist/`: Carpeta de salida de la compilación.
- `logs/`: Logs de la aplicación (en modo dev).
