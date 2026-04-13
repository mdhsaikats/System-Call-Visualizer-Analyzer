# System Call Visualizer Analyzer

A desktop application to visualize and analyze system calls, built with Electron.

## Features

- Visualizes system call traces in an interactive UI
- Analyzes system call patterns for insights
- User-friendly interface for exploring trace data
- Cross-platform support (Windows, Linux, macOS)

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or later recommended)
- [npm](https://www.npmjs.com/)

### Installation

1. Clone the repository:
   ```sh
   git clone https://github.com/mdhsaikats/System-Call-Visualizer-Analyzer.git
   cd System-Call-Visualizer-Analyzer
   ```
2. Install dependencies:
   ```sh
   npm install
   ```

### Running the App

Start the Electron app:

```sh
npm start
```

## Project Structure

- `main.js` — Main Electron process
- `renderer/` — UI code (HTML, CSS, JS)
- `package.json` — Project metadata and scripts

## Contributing

Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

## License

ISC

## Author

saikat

## Work Distribution

The following is the suggested work distribution for a 5-person team:

| Member | Responsibility                                                        |
| ------ | --------------------------------------------------------------------- |
| 1      | Electron main process setup, app initialization, and IPC integration  |
| 2      | UI/UX design and implementation (HTML/CSS/JS in renderer)             |
| 3      | System call trace parsing and analysis logic                          |
| 4      | Visualization components (charts, graphs, interactive elements)       |
| 5      | Testing, documentation, and packaging for cross-platform distribution |

> Team members should collaborate on integration and code review.
