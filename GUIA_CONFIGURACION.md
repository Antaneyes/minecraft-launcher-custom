# Guía de Configuración y Despliegue

Esta guía explica cómo configurar el launcher y gestionar las actualizaciones para tus jugadores de la forma más sencilla posible.

## 1. Configuración del Servidor y Versiones

Ahora todo se controla desde un único archivo en la raíz del proyecto: **`launcher_builder_config.json`**.

```json
{
    "gameVersion": "1.21.10",
    "fabricLoaderVersion": "0.18.1",
    "repoUser": "Antaneyes",
    "repoName": "minecraft-launcher-custom",
    "branch": "master"
}
```

- **Cambiar versión de Minecraft**: Edita `gameVersion`.
- **Cambiar versión de Fabric**: Edita `fabricLoaderVersion`.
- **Repositorio**: Configura tu usuario y nombre de repo de GitHub.

El launcher se encargará automáticamente de descargar las librerías y versiones correctas (Vanilla + Fabric) sin que tú tengas que subir nada.

## 2. Gestión de Archivos del Juego (Mods/Configs)

1.  Coloca los archivos **personalizados** que quieres que tengan los jugadores en la carpeta `update_files` (en la raíz del proyecto).
    - `mods/` -> Tus mods.
    - `config/` -> Tus configuraciones.
    - `servers.dat` -> Lista de servidores.
    - `options.txt` -> Opciones gráficas forzadas (opcional).

2.  **IMPORTANTE**: Ya **NO** necesitas subir las carpetas `libraries` ni `versions`. El launcher las gestiona solo. Mantén `update_files` limpia, solo con lo tuyo.

## 3. Modo Desarrollo (Pruebas Locales)

Para probar cambios sin subirlos a Internet:

1.  Ejecuta `npm start`.
2.  El launcher detectará que estás en modo desarrollo y usará tu `manifest.json` **local**.
3.  Copiará los archivos de tu carpeta `update_files` **al instante**, sin descargarlos.

Esto te permite probar nuevos mods o versiones en segundos.

## 4. Publicar una Actualización

Cuando todo funcione bien y quieras enviárselo a los jugadores:

1.  Abre una terminal.
2.  Ejecuta:
    ```bash
    node release.js
    ```

**¿Qué hace este comando?**
1.  **Lee tu config**: Usa la versión que pusiste en `launcher_builder_config.json`.
2.  **Manifiesto**: Genera el `manifest.json` escaneando tu carpeta `update_files`.
3.  **Versión**: Sube la versión del launcher (ej. 1.0.15 -> 1.0.16).
4.  **GitHub**: Sube el código, el manifiesto y crea una **Release** con el instalador `.exe`.

Los jugadores recibirán la actualización automáticamente al abrir el launcher.
