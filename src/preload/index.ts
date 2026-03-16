// Preload script — Bridge between renderer (Vue) and main process (Node.js).
// Owns: contextBridge API surface exposed to the renderer.
// Does NOT own: business logic (src/main), UI (src/renderer).

import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
    isElectron: () => true,

    // File operations
    showSaveDialog: (defaultPath?: string) => ipcRenderer.invoke('dialog:save', defaultPath),
    showOpenDialog: () => ipcRenderer.invoke('dialog:open'),
    writeFile: (filePath: string, content: string) => ipcRenderer.invoke('file:write', filePath, content),
    readFile: (filePath: string) => ipcRenderer.invoke('file:read', filePath),

    // Listen for files opened via OS file association
    onOpenFile: (callback: (filePath: string) => void) => {
        const handler = (_event: Electron.IpcRendererEvent, filePath: string): void => callback(filePath);
        ipcRenderer.on('file:open-external', handler);
        return () => ipcRenderer.removeListener('file:open-external', handler);
    },

    // Open a URL in the OS default browser
    openExternal: (url: string) => ipcRenderer.invoke('shell:open-external', url),
});
