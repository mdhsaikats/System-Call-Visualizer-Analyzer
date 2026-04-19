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

## Chapter 1: Introduction

This chapter introduces the System Call Visualizer Analyzer project and defines the core problem, motivation, goals, and expected outcomes. It also summarizes related solutions and identifies the gap addressed by this work.

### Introduction

Modern systems generate a large volume of low-level system call activity that is difficult to interpret directly from raw terminal traces. This project addresses that problem by providing an Electron-based desktop application that captures, organizes, and visualizes system-call and performance data so learners and developers can analyze runtime behavior more easily.

### Motivation

System-level debugging and performance analysis are often inaccessible to students and early-stage developers because traditional tools are text-heavy and difficult to navigate in real time. The computational motivation of this project is to transform continuous syscall streams into structured, interactive visual views (dashboard metrics, trace tables, and process-focused insights) that improve understanding and reduce analysis time.

### Objectives

1. Build a desktop application to monitor and visualize system-call activity in near real time.
2. Present key runtime metrics (e.g., syscall rate, latency, memory/CPU trends, and anomalies) in a readable dashboard.
3. Provide an interactive trace inspection workflow for exploring call arguments, return states, and process context.
4. Offer a practical learning and analysis platform that works across common desktop operating systems.

### Feasibility Study

Existing tools confirm the feasibility of system-call monitoring and analysis. Utilities such as `strace` and `perf` provide reliable low-level capture on Linux, while process analysis tools (for example Sysdig/Falco-style event streams and Process Monitor-style workflows) demonstrate the value of structured event interpretation [1]. However, many existing options prioritize expert workflows, command-line output, or enterprise security use cases over beginner-friendly, unified desktop visualization. This project is methodologically feasible because it reuses proven tracing foundations and focuses innovation on integration, usability, and educational clarity.

### Gap Analysis

Current solutions often have one of three limitations: (1) strong dependence on command-line expertise, (2) fragmented views across multiple tools, or (3) limited pedagogical focus for students learning OS internals. The intended contribution of this project is a single, approachable interface that connects raw syscall events with higher-level visual analytics and contextual interpretation in one place.

### Project Outcome

The expected outcome is a functional desktop analyzer that helps users observe and interpret system behavior through live dashboards and trace exploration. Potential broader outcomes include improved learning of operating-system concepts, faster debugging during development, and a baseline platform that can later be extended with richer anomaly detection, export features, or advanced analytics modules.

### Reference

[1] Existing system-call tracing and monitoring ecosystems (e.g., strace/perf documentation and related process/event analysis tools) used as the comparative baseline for feasibility.
