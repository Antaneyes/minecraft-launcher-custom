# Custom Minecraft Server Launcher

This is a custom launcher built for your private Minecraft server. It automatically checks for updates (mods, configs) from a web server you control before launching the game.

## Setup for the Admin (You)

### 1. Hosting the Updates
You need a place to host your mod files and a `manifest.json` file. This can be:
- A simple web server (Apache/Nginx/IIS).
- A public GitHub repository (using raw.githubusercontent.com links).
- A static file host.

### 2. Creating the Manifest
Create a file named `manifest.json` on your server. It should look like this:

```json
{
  "version": "1.0.0",
  "files": [
    {
      "path": "mods/jei.jar",
      "url": "http://your-server.com/files/mods/jei.jar"
    },
    {
      "path": "config/some-mod.cfg",
      "url": "http://your-server.com/files/config/some-mod.cfg"
    }
  ]
}
```

- `path`: Where the file should go inside the Minecraft folder (relative to the game root).
- `url`: Direct download link to the file.

### 3. Configuring the Launcher
Open `src/utils/updater.js` and change the `UPDATE_URL` constant to point to your `manifest.json`:

```javascript
const UPDATE_URL = 'http://your-server.com/manifest.json';
```

### 4. Building for Friends
To create the `.exe` for your friends:

1.  Run `npm install` (if you haven't already).
2.  Run `npm install electron-builder --save-dev`.
3.  Add a build script to `package.json`:
    ```json
    "scripts": {
      "start": "electron .",
      "dist": "electron-builder"
    }
    ```
4.  Run `npm run dist`.
5.  Send the generated `.exe` (in the `dist` folder) to your friends.

## How it Works
1.  Friend opens launcher.
2.  Launcher checks your `manifest.json`.
3.  It downloads any files listed there to their `%APPDATA%/.my-custom-server` folder.
4.  It launches Minecraft with those files.

## Customization
- **UI**: Edit `src/ui/index.html` and `src/ui/styles.css`.
- **Minecraft Version**: Edit `src/utils/launcher.js` to change the version (e.g., "1.20.1").
