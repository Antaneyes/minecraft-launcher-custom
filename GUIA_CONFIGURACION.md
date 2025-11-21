# Guía Maestra de Configuración

Para tener tu launcher 100% funcional con actualizaciones automáticas, limpieza de mods viejos y configuración de servidores, sigue estos pasos:

## 1. El "Servidor" (Tu Hosting)
Necesitas un lugar donde alojar los archivos. Supongamos que tienes un hosting web en `http://miservidor.com/minecraft`.

Debes subir ahí:
1.  Todos tus mods (`.jar`).
2.  Tus configs (`.cfg`, `.toml`, etc.).
3.  Archivos extra como `servers.dat` o `options.txt`.
4.  El archivo `manifest.json`.

## 2. El Archivo Mágico (`manifest.json`)
Este es el cerebro. Súbelo a `http://miservidor.com/minecraft/manifest.json`.

Ejemplo completo para un modpack con limpieza y configs:

```json
{
  "version": "1.0.5", 
  "files": [
    {
      "path": "mods/jei-1.20.1.jar",
      "url": "http://miservidor.com/minecraft/mods/jei-1.20.1.jar"
    },
    {
      "path": "mods/pixelmon-9.1.10.jar",
      "url": "http://miservidor.com/minecraft/mods/pixelmon-9.1.10.jar"
    },
    {
      "path": "config/pixelmon.hocon",
      "url": "http://miservidor.com/minecraft/config/pixelmon.hocon"
    },
    {
      "path": "servers.dat",
      "url": "http://miservidor.com/minecraft/servers.dat"
    },
    {
      "path": "options.txt",
      "url": "http://miservidor.com/minecraft/options.txt"
    }
  ]
}
```

### ¿Qué hace esto?
*   **Mods**: Descarga `jei` y `pixelmon`. Si tu amigo tiene `pixelmon-9.1.9.jar` (viejo) en su carpeta, **el launcher lo borrará** porque no está en esta lista, y bajará el nuevo.
*   **Configs**: Sobrescribe su configuración de Pixelmon con la tuya.
*   **Servers**: Le pone tu `servers.dat`, así que cuando abra el juego, **tu servidor ya saldrá en la lista**.
*   **Options**: Le pone tus opciones gráficas/controles.

## 3. Configurar el Código del Launcher
Antes de pasárselo a tus amigos, tienes que hacer un único cambio en el código que tienes en tu PC:

1.  Abre el archivo `utils/updater.js`.
2.  Busca la línea 7:
    ```javascript
    const UPDATE_URL = 'http://localhost:8080/manifest.json';
    ```
3.  Cámbiala por tu URL real:
    ```javascript
    const UPDATE_URL = 'http://miservidor.com/minecraft/manifest.json';
    ```
4.  (Opcional) Si quieres cambiar la versión de Minecraft (ej. 1.16.5), edita `utils/launcher.js`.

## 4. Crear el Ejecutable (.exe)
Una vez configurada la URL:

1.  Abre una terminal en la carpeta del proyecto.
2.  Ejecuta:
    ```bash
    npm run dist
    ```
3.  Espera unos minutos.
4.  Ve a la carpeta `dist` y coge el archivo `.exe`.
5.  **¡Pásaselo a tus amigos!**

---

## Ciclo de Actualización (Tu día a día)
Cuando salga una actualización de un mod o quieras cambiar algo:

1.  Sube el nuevo mod a tu hosting.
2.  Borra el mod viejo de tu hosting (opcional, pero recomendado para no liarte).
3.  Edita el `manifest.json` en tu hosting:
    *   Cambia `"version": "1.0.5"` a `"1.0.6"`.
    *   Quita la línea del mod viejo.
    *   Pon la línea del mod nuevo.
4.  ¡Listo! La próxima vez que tus amigos abran el launcher, se les actualizará solo.
