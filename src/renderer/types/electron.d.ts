// ElectronAPI — type definitions for the preload bridge (contextBridge).
// Owns: shape of the window.electronAPI object available in renderer.
// Does NOT own: implementation (src/preload/index.ts), UI consumers (src/renderer).

export interface ElectronAPI {
    isElectron: () => boolean;
    showSaveDialog: (defaultPath?: string) => Promise<{ canceled: boolean; filePath?: string }>;
    showOpenDialog: () => Promise<{ canceled: boolean; filePaths: string[] }>;
    writeFile: (filePath: string, content: string) => Promise<{ success: boolean; error?: string }>;
    readFile: (filePath: string) => Promise<{ success: boolean; content?: string; error?: string }>;
    onOpenFile: (callback: (filePath: string) => void) => () => void;
    openExternal: (url: string) => Promise<{ success: boolean; error?: string }>;
}

declare global {
    interface Window {
        electronAPI: ElectronAPI;
    }
}
