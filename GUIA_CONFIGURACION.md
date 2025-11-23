# Guía de Configuración y Despliegue

Esta guía explica cómo configurar el launcher y gestionar las actualizaciones para tus jugadores de la forma más sencilla posible.

## 1. Configuración Inicial

### Enlazar con tu Repositorio
Para que el auto-updater del launcher funcione, asegúrate de que el `package.json` apunte a tu repositorio de GitHub correcto.

### Configurar la URL de Actualización (Juego)
El launcher descarga los mods desde una URL que tú defines.
1.  Abre `utils/updater.js`.
2.  Edita la constante `UPDATE_URL` con la dirección donde alojarás tu `manifest.json` (puede ser un servidor web, S3, o incluso GitHub Pages/Raw).

## 2. Gestión de Archivos del Juego (Mods/Configs)

En lugar de editar el `manifest.json` a mano, el launcher lo genera por ti.

1.  Coloca **todos** los archivos que quieres que tengan los jugadores (mods, configs, resourcepacks) en la carpeta:
    `update_files` (está en la raíz del proyecto).
2.  Mantén esa carpeta limpia. **Lo que haya ahí es lo que tendrán los jugadores.**
    - Si añades un mod ahí, se descargará.
    - Si borras un mod de ahí, se les borrará a ellos.

## 3. Publicar una Actualización

Cuando quieras lanzar una nueva versión (ya sea del launcher o nuevos mods):

1.  Abre una terminal en la carpeta del proyecto.
2.  Ejecuta:
    ```bash
    node release.js
    ```

**¿Qué hace este comando mágico?**
1.  **Versión**: Sube la versión del proyecto automáticamente (ej. 1.0.14 -> 1.0.15).
2.  **Manifiesto**: Escanea tu carpeta `update_files`, calcula los hashes y actualiza `manifest.json`.
3.  **Compilación**: Crea el nuevo instalador `.exe`.
4.  **GitHub**: Sube todo el código y crea una nueva **Release** en GitHub con el instalador listo para descargar.

## 4. Para los Jugadores

- **Primera vez**: Pásales el instalador `.exe` de la última Release de GitHub.
- **Actualizaciones**:
    - **Mods**: Si cambiaste archivos en `update_files` y lanzaste release, el launcher los descargará al abrirse.
    - **Launcher**: Si hay una nueva versión del programa, les saldrá un aviso para actualizarse automáticamente.
