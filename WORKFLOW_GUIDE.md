# Guía de Flujo de Trabajo y Gestión del Launcher

Este documento detalla cómo gestionar el proyecto del launcher, incluyendo el desarrollo en la rama `dev`, el lanzamiento de betas y versiones estables, y la actualización de contenido (mods/configs).

## 1. Estructura de Ramas

El proyecto utiliza dos ramas principales:

*   **`master` (Estable)**: Contiene el código probado y listo para producción. Los usuarios en el canal "Estable" reciben actualizaciones de aquí.
*   **`dev` (Beta)**: Rama de desarrollo. Aquí se prueban nuevas funciones y actualizaciones de mods antes de pasarlas a estable. Los usuarios en el canal "Beta" reciben actualizaciones de aquí.

## 2. Herramientas de Gestión

Tienes dos scripts principales para gestionar el launcher:

### A. `update_server.js` (Actualización de Contenido)
Úsalo para actualizar **mods, configuraciones o versiones de Minecraft** sin cambiar el código del launcher ni forzar una nueva descarga del `.exe`.

*   **En rama `master`**: `node update_server.js`
    *   Sube los cambios a `master`.
    *   Los usuarios estables recibirán los nuevos archivos al abrir el launcher.
*   **En rama `dev`**: `node update_server.js --beta`
    *   Sube los cambios a `dev`.
    *   Solo los usuarios en el canal "Beta" recibirán los nuevos archivos.

### B. `release.js` (Actualización del Launcher)
Úsalo cuando hayas modificado **código del launcher** (`index.js`, `ui/`, `utils/`) y necesites que los usuarios descarguen un nuevo `.exe`.

*   **Release Beta**: `node release.js --beta`
    *   **Requiere estar en rama `dev`**.
    *   Incrementa la versión (ej. `1.0.21-beta.0` -> `1.0.21-beta.1`).
    *   Genera un instalador y lo publica como "Pre-release" en GitHub.
    *   El launcher se auto-actualizará solo para usuarios en canal "Beta".
*   **Release Estable**: `node release.js`
    *   **Requiere estar en rama `master`**.
    *   Incrementa la versión (ej. `1.0.20` -> `1.0.21`).
    *   Genera un instalador y lo publica como "Latest Release" en GitHub.
    *   Todos los usuarios estables se actualizarán.

## 3. Flujo de Trabajo Recomendado

### Escenario 1: Desarrollo de Nueva Funcionalidad
1.  Cámbiate a la rama de desarrollo: `git checkout dev`.
2.  Haz tus cambios en el código.
3.  Prueba localmente con `npm start`.
4.  Lanza una beta para probar con usuarios selectos:
    ```powershell
    node release.js --beta
    ```
5.  Si todo va bien, fusiona con master y lanza estable (ver Escenario 3).

### Escenario 2: Actualizar Mods/Configs (Sin tocar código)
1.  **Para probar primero (Recomendado):**
    *   Ve a `dev`: `git checkout dev`.
    *   Actualiza los mods en la carpeta `update_files/mods`.
    *   Sube los cambios: `node update_server.js --beta`.
    *   Abre tu launcher, ponlo en modo Beta y verifica que funciona.
2.  **Para publicar a todos:**
    *   Ve a `master`: `git checkout master`.
    *   Trae los cambios de dev (o copia los archivos de mods): `git merge dev`.
    *   Sube los cambios: `node update_server.js`.

### Escenario 3: Promocionar Beta a Estable
Cuando una versión beta está lista para ser pública:
1.  Ve a la rama `master`: `git checkout master`.
2.  Fusiona los cambios de `dev`: `git merge dev`.
3.  Lanza la versión estable:
    ```powershell
    node release.js
    ```
4.  Vuelve a `dev` y actualízala para que esté sincronizada:
    ```powershell
    git checkout dev
    git merge master
    git push origin dev
    ```

## 4. Resumen de Comandos

| Acción | Rama Requerida | Comando | Efecto |
| :--- | :--- | :--- | :--- |
| **Lanzar Beta** | `dev` | `node release.js --beta` | Crea nueva versión beta (vX.X.X-beta.Y) en GitHub. |
| **Lanzar Estable** | `master` | `node release.js` | Crea nueva versión estable (vX.X.X) en GitHub. |
| **Subir Mods (Beta)** | `dev` | `node update_server.js --beta` | Actualiza archivos para usuarios Beta. |
| **Subir Mods (Estable)**| `master` | `node update_server.js` | Actualiza archivos para usuarios Estables. |

## 5. Notas Importantes
*   **Canales en el Launcher**: Los usuarios pueden cambiar entre "Estable" y "Beta" en la configuración del launcher. Este cambio requiere reiniciar el launcher.
*   **Autenticación**: Si `release.js` falla al crear la release en GitHub, ejecuta `gh auth login` para renovar tus credenciales.
*   **Dry Run**: Añade `--dry-run` a cualquier comando para simular lo que pasaría sin hacer cambios reales (ej. `node release.js --beta --dry-run`).

## 6. Comandos Útiles de Git

Aquí tienes una lista rápida de comandos comunes que necesitarás:

### Cambiar de Rama
*   Ir a la rama de desarrollo (Beta):
    ```powershell
    git checkout dev
    ```
*   Ir a la rama estable (Master):
    ```powershell
    git checkout master
    ```

### Actualizar Proyecto
*   Traer los últimos cambios de la nube (GitHub) a tu ordenador:
    ```powershell
    git pull
    ```

### Deshacer Cambios
*   **Deshacer el último `git push`** (Cuidado: esto borra el último commit de la historia remota):
    ```powershell
    git reset --hard HEAD~1
    git push origin <rama> --force
    ```
    *(Reemplaza `<rama>` por `dev` o `master`)*

*   **Descartar cambios locales** (volver al estado del último commit):
    ```powershell
    git reset --hard
    ```

### Ver Estado
*   Ver en qué rama estás y si hay archivos modificados:
    ```powershell
    git status
    ```
