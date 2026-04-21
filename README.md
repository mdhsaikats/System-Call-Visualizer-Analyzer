# System Call Visualizer Analyzer

> An Electron-based desktop application for visualizing and analyzing system call traces with an interactive, user-friendly interface.

---

## 🚀 Overview

System Call Visualizer Analyzer (SCVA) helps users explore, analyze, and visualize system call traces from operating systems. It is designed for students, researchers, and developers who want to understand process behaviors and system interactions in a visual way.

## ✨ Features

- **Interactive Visualization:** Explore system call traces with dynamic charts, graphs, and process trees.
- **Trace Analysis:** Identify patterns, anomalies, and statistics in system call data.
- **User-Friendly UI:** Clean, intuitive interface for easy navigation and exploration.
- **Cross-Platform:** Runs on Windows, Linux, and macOS.
- **Modular Design:** Easily extendable for new trace formats or analysis features.

## 🛠️ Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or later)
- [npm](https://www.npmjs.com/)

### Installation

1. **Clone the repository:**
   ```sh
   git clone https://github.com/mdhsaikats/System-Call-Visualizer-Analyzer.git
   cd System-Call-Visualizer-Analyzer
   ```
2. **Install dependencies:**
   ```sh
   npm install
   ```

### Running the Application

Start the Electron app:

```sh
npm start
```

## 📁 Project Structure

- `main.js` — Electron main process (app entry point)
- `preload.js` — Preload scripts for secure context bridging
- `renderer/` — Frontend UI (HTML, CSS, JS)
  - `dashboard.html`, `performance.html`, `processtree.html`, `systemcalls.html`, etc.
  - `js/` — Renderer JavaScript (UI logic, visualization, auth, etc.)
  - `css/` — Stylesheets
- `assets/` — Images and static assets
- `package.json` — Project metadata and scripts

## 👥 Contributing

Contributions are welcome! Please open an issue to discuss your ideas or submit a pull request. For major changes, start a discussion first.

## 📄 License

This project is licensed under the ISC License.

## 👤 Author

saikat

## 🧑‍💻 Suggested Team Work Distribution

| Member | Responsibility                                                        |
| ------ | --------------------------------------------------------------------- |
| 1      | Electron main process setup, app initialization, and IPC integration  |
| 2      | UI/UX design and implementation (HTML/CSS/JS in renderer)             |
| 3      | System call trace parsing and analysis logic                          |
| 4      | Visualization components (charts, graphs, interactive elements)       |
| 5      | Testing, documentation, and packaging for cross-platform distribution |

> Team members should collaborate on integration and code review.
