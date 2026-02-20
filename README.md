# Slate

A free and open-source spreadsheet app inspired by Apple Numbers. Built with Vue 3, TypeScript, and Electron.

Slate brings the canvas-based, design-forward spreadsheet experience to every platform — macOS, Windows, and Linux.

## Features

- **Canvas-based workspace** — tables, charts, and text boxes on an infinite pannable, zoomable canvas
- **Multi-canvas support** — organize your work across multiple canvases (like sheets/tabs)
- **Formula engine** — 28+ built-in functions (SUM, AVERAGE, IF, CONCAT, etc.) with cell/range references
- **6 chart types** — Bar, Line, Area, Pie, Doughnut, and Scatter with auto-updating data binding
- **Rich text boxes** — free-form text with font, color, alignment, and border controls
- **Cell formatting** — bold, italic, text/fill colors, alignment, font family
- **Cell merging** — merge and unmerge arbitrary rectangular regions
- **Smart cell types** — auto-detection of numbers, currency (USD/EUR), booleans, and text
- **Dark & light themes**
- **Native file format** — `.slate` files (JSON-based, versioned)
- **Cross-platform** — macOS, Windows, and Linux builds

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or later recommended)
- npm (comes with Node.js)

### Installation

```bash
git clone https://github.com/larrydarko1/slate.git
cd slate
npm install
```

### Development

```bash
npm run dev
```

This starts Vite and Electron concurrently in development mode.

### Building

```bash
# macOS
npm run build:mac

# Windows
npm run build:win

# Linux
npm run build:linux
```

Builds are output to the `dist-electron/` directory.

## Tech Stack

- **Framework:** [Vue 3](https://vuejs.org/) (Composition API) + TypeScript
- **Desktop:** [Electron](https://www.electronjs.org/)
- **Build:** [Vite](https://vitejs.dev/) + [electron-builder](https://www.electron.build/)
- **Charts:** [Chart.js](https://www.chartjs.org/) + [vue-chartjs](https://vue-chartjs.org/)
- **Styling:** SCSS
- **Testing:** [Vitest](https://vitest.dev/)

## Project Structure

```
slate/
├── electron/           # Electron main process & preload
│   ├── main.cjs
│   └── preload.cjs
├── src/
│   ├── components/     # Vue components
│   ├── composables/    # Vue composables (useSpreadsheet)
│   ├── engine/         # Formula parser & cell type system
│   └── types/          # TypeScript type definitions
├── public/             # Static assets
└── build/              # Build resources (icons)
```

## Contributing

Contributions are welcome! Please read [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines on how to get involved.

## Code of Conduct

This project follows the [Contributor Covenant Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code.

## License

This project is licensed under the [MIT License](LICENSE).
