// Electron Main Process - Leaf note-taking app
const { app, BrowserWindow, ipcMain, dialog, shell, Menu } = require('electron');
const path = require('path');
const fs = require('fs').promises;
const fsSync = require('fs');
const { pathToFileURL } = require('url');

let mainWindow = null;
let fileToOpen = null; // File path passed via CLI args or open-file event

// ── macOS: Handle open-file event (double-click .slate in Finder) ──
// This fires BEFORE app is ready when launching via file association,
// and AFTER ready when the app is already running.
app.on('open-file', (event, filePath) => {
    event.preventDefault();
    if (mainWindow) {
        // App is already running — send file to renderer
        mainWindow.webContents.send('file:open-external', filePath);
        if (mainWindow.isMinimized()) mainWindow.restore();
        mainWindow.focus();
    } else {
        // App not yet ready — store for later
        fileToOpen = filePath;
    }
});

// ── Windows/Linux: Check CLI args for .slate file ──
const cliFile = process.argv.find(arg => arg.endsWith('.slate') && fsSync.existsSync(arg));
if (cliFile) fileToOpen = cliFile;

function createWindow() {
    // Set app icon based on platform
    const iconPath = process.platform === 'darwin'
        ? path.join(__dirname, '../build/icon.icns')
        : path.join(__dirname, '../build/icon.icns');

    mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        minWidth: 1000,
        minHeight: 700,
        icon: iconPath,
        webPreferences: {
            preload: path.join(__dirname, 'preload.cjs'),
            nodeIntegration: false, // Security: don't expose Node to renderer
            contextIsolation: true,  // Security: isolate contexts
            sandbox: false,
            webSecurity: false, // Allow loading local files (required for video/media)
            // Disable all browser-like storage mechanisms
            partition: 'persist:leaf', // Use persistent session
            cache: false, // Disable HTTP cache
            spellcheck: true // Enable spellcheck
        },
        backgroundColor: '#1a1a1a',
        titleBarStyle: 'hiddenInset', // macOS style
        show: false // Don't show until ready
    });

    // Enable context menu with spellcheck suggestions
    mainWindow.webContents.on('context-menu', (event, params) => {
        const menu = Menu.buildFromTemplate([
            // Spellcheck suggestions
            ...params.dictionarySuggestions.map(suggestion => ({
                label: suggestion,
                click: () => mainWindow.webContents.replaceMisspelling(suggestion)
            })),
            // Separator if there are suggestions
            ...(params.dictionarySuggestions.length > 0 ? [{ type: 'separator' }] : []),
            // Add to dictionary option
            ...(params.misspelledWord ? [{
                label: 'Add to Dictionary',
                click: () => mainWindow.webContents.session.addWordToSpellCheckerDictionary(params.misspelledWord)
            }] : []),
            // Separator before standard options
            ...(params.misspelledWord ? [{ type: 'separator' }] : []),
            // Standard editing options
            { role: 'cut', visible: params.isEditable },
            { role: 'copy', visible: params.selectionText.length > 0 },
            { role: 'paste', visible: params.isEditable },
            { type: 'separator', visible: params.isEditable || params.selectionText.length > 0 },
            { role: 'selectAll' }
        ]);
        menu.popup();
    });

    // Prevent Electron from acting as a browser — all external links open in the OS default browser
    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        shell.openExternal(url);
        return { action: 'deny' };
    });

    mainWindow.webContents.on('will-navigate', (event, url) => {
        const appOrigin = process.env.NODE_ENV === 'development'
            ? 'http://localhost:3000'
            : pathToFileURL(path.join(__dirname, '../dist/index.html')).href;
        // Allow navigation within the app's own origin only
        if (!url.startsWith(appOrigin.replace(/index\.html$/, ''))) {
            event.preventDefault();
            shell.openExternal(url);
        }
    });

    // Load the app
    if (process.env.NODE_ENV === 'development') {
        mainWindow.loadURL('http://localhost:3000');
        mainWindow.webContents.openDevTools();
    } else {
        mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
    }

    // Show window when ready
    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
        // If a file was queued to open (via file association), send it now
        if (fileToOpen) {
            mainWindow.webContents.send('file:open-external', fileToOpen);
            fileToOpen = null;
        }
    });

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

// ── Single-instance lock (required for second-instance event on Win/Linux) ──
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
    app.quit();
} else {
    // Handle second-instance (Windows/Linux: user double-clicks another .slate file while app is running)
    app.on('second-instance', (_event, argv) => {
        const file = argv.find(arg => arg.endsWith('.slate') && fsSync.existsSync(arg));
        if (file && mainWindow) {
            mainWindow.webContents.send('file:open-external', file);
            if (mainWindow.isMinimized()) mainWindow.restore();
            mainWindow.focus();
        }
    });

    // Initialize app
    app.whenReady().then(() => {
        createWindow();

        app.on('activate', () => {
            if (BrowserWindow.getAllWindows().length === 0) {
                createWindow();
            }
        });
    });
}

// Quit when all windows closed (except macOS)
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

// ── IPC Handlers for File Operations ──

// Save file dialog
ipcMain.handle('dialog:save', async (event, defaultPath) => {
    const result = await dialog.showSaveDialog(mainWindow, {
        title: 'Save Spreadsheet',
        defaultPath: defaultPath || 'Untitled.slate',
        filters: [
            { name: 'Slate Spreadsheet', extensions: ['slate'] },
            { name: 'All Files', extensions: ['*'] }
        ]
    });
    return result;
});

// Open file dialog
ipcMain.handle('dialog:open', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
        title: 'Open Spreadsheet',
        filters: [
            { name: 'Slate Spreadsheet', extensions: ['slate'] },
            { name: 'All Files', extensions: ['*'] }
        ],
        properties: ['openFile']
    });
    return result;
});

// Write file
ipcMain.handle('file:write', async (event, filePath, content) => {
    try {
        await fs.writeFile(filePath, content, 'utf8');
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

// Read file
ipcMain.handle('file:read', async (event, filePath) => {
    try {
        const content = await fs.readFile(filePath, 'utf8');
        return { success: true, content };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

// Open a URL in the OS default browser (called from renderer via IPC)
ipcMain.handle('shell:open-external', async (_event, url) => {
    try {
        const parsed = new URL(url);
        if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
            await shell.openExternal(url);
            return { success: true };
        }
        return { success: false, error: 'Only http/https URLs are allowed' };
    } catch {
        return { success: false, error: 'Invalid URL' };
    }
});

// Handle errors
process.on('uncaughtException', (error) => {
    console.error('Uncaught exception:', error);
});
